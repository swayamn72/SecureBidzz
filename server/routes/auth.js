import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { generateToken } from "../utils/jwt.js";
import { validatePasswordStrength, checkPasswordHistory, updatePasswordHistory } from "../utils/passwordValidator.js";
import { sendMFACode, sendAccountLockoutNotification, sendPasswordChangeNotification } from "../utils/emailService.js";
import speakeasy from "speakeasy";
import verifyTokenMiddleware from "../middleware/verifyToken.js";

const router = express.Router();

// Auth-specific rate limiter (stricter for login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 5, // Only 5 auth attempts per 15 seconds
  message: "Too many authentication attempts, please try again later.",
});

// Apply rate limiter to auth routes
router.use(authLimiter);

// ✅ SIGNUP with enhanced security
router.post("/signup", [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await AuditLog.logEvent({
        userId: null,
        action: 'SIGNUP',
        details: { email, reason: 'User already exists' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskScore: 10
      });
      return res.status(400).json({ error: "User already exists" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      lastPasswordChange: new Date()
    });

    await user.save();

    // Log successful signup
    await AuditLog.logEvent({
      userId: user._id,
      action: 'SIGNUP',
      details: { email, name },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    // Generate JWT token
    const token = generateToken({ id: user._id, email: user.email });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ LOGIN with enhanced security
router.post("/login", [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent');

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      await AuditLog.logEvent({
        userId: null,
        action: 'LOGIN_FAILED',
        details: { email, reason: 'User not found' },
        ipAddress: clientIP,
        userAgent,
        riskScore: 20
      });
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      await AuditLog.logEvent({
        userId: user._id,
        action: 'LOGIN_FAILED',
        details: { email, reason: 'Account locked' },
        ipAddress: clientIP,
        userAgent,
        riskScore: 80
      });

      // Send lockout notification if not sent recently
      const lockoutTime = new Date(user.lockUntil);
      await sendAccountLockoutNotification(user.email, lockoutTime);

      return res.status(423).json({
        error: "Account temporarily locked due to multiple failed login attempts. Try again later."
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incLoginAttempts();

      await AuditLog.logEvent({
        userId: user._id,
        action: 'LOGIN_FAILED',
        details: { email, reason: 'Invalid password', attempts: user.loginAttempts },
        ipAddress: clientIP,
        userAgent,
        riskScore: 30
      });

      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check for suspicious activity
    const suspiciousCheck = await AuditLog.detectSuspiciousActivity(user._id, clientIP, 'LOGIN');
    if (suspiciousCheck.isSuspicious) {
      await AuditLog.logEvent({
        userId: user._id,
        action: 'SUSPICIOUS_ACTIVITY',
        details: {
          type: 'Unusual login pattern',
          reasons: suspiciousCheck.reasons,
          riskScore: suspiciousCheck.riskScore
        },
        ipAddress: clientIP,
        userAgent,
        riskScore: suspiciousCheck.riskScore
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Log successful login
    await AuditLog.logEvent({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      details: { email },
      ipAddress: clientIP,
      userAgent,
      riskScore: suspiciousCheck.riskScore
    });

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      return res.json({
        message: "MFA required",
        requiresMFA: true,
        userId: user._id,
        availableMfaTypes: ['totp', 'email'], // Allow both types during login
        mfaType: user.mfaType // Include the user's configured MFA type
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id, email: user.email });

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ MFA Verification
router.post("/verify-mfa", [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit code required'),
  body('type').optional().isIn(['totp', 'email']).withMessage('Invalid MFA type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { userId, code, type } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: "Invalid MFA request" });
    }

    // Use the type from request body if provided, otherwise use user's configured type
    const mfaType = type || user.mfaType;

    let isValidCode = false;

    if (mfaType === 'totp') {
      // Verify TOTP code
      if (!user.mfaSecret) {
        return res.status(400).json({ error: "Invalid MFA request" });
      }

      console.log('Verifying TOTP code:', code, 'for user:', userId);
      const expectedCode = speakeasy.totp({
        secret: user.mfaSecret,
        encoding: 'base32'
      });
      console.log('Expected code:', expectedCode);

      isValidCode = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps (30 seconds) tolerance
      });

      console.log('TOTP verification result:', isValidCode);
    } else if (mfaType === 'email') {
      // Verify email code
      if (!user.emailMFACode || !user.emailMFACodeExpires) {
        return res.status(400).json({ error: "No email code sent or expired" });
      }

      if (new Date() > user.emailMFACodeExpires) {
        return res.status(400).json({ error: "Email code has expired" });
      }

      console.log('Verifying email code:', code, 'for user:', userId);
      isValidCode = user.emailMFACode === code;
      console.log('Email verification result:', isValidCode);

      // Clear the code after verification
      user.emailMFACode = undefined;
      user.emailMFACodeExpires = undefined;
    } else {
      return res.status(400).json({ error: "Invalid MFA type" });
    }

    if (!isValidCode) {
      await AuditLog.logEvent({
        userId: user._id,
        action: 'LOGIN_FAILED',
        details: { reason: 'Invalid MFA code', type: user.mfaType },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskScore: 40
      });
      return res.status(400).json({ error: "Invalid MFA code" });
    }

    await user.save();

    await AuditLog.logEvent({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      details: { method: user.mfaType.toUpperCase() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    const token = generateToken({ id: user._id, email: user.email });

    res.json({
      message: "MFA verification successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    console.error("MFA verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Change Password
router.post("/change-password", [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await AuditLog.logEvent({
        userId: user._id,
        action: 'PASSWORD_CHANGE',
        details: { success: false, reason: 'Invalid current password' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskScore: 25
      });
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    // Check password history
    const isPasswordInHistory = await checkPasswordHistory(user, newPassword);
    if (!isPasswordInHistory) {
      return res.status(400).json({ error: "Password was used recently. Please choose a different password." });
    }

    // Update password and history
    user.password = newPassword;
    updatePasswordHistory(user, await bcrypt.hash(newPassword, 12));
    await user.save();

    // Send notification email
    await sendPasswordChangeNotification(user.email, new Date());

    await AuditLog.logEvent({
      userId: user._id,
      action: 'PASSWORD_CHANGE',
      details: { success: true },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Enable MFA
router.post("/enable-mfa", verifyTokenMiddleware, [
  body('type').optional().isIn(['totp', 'email']).withMessage('Invalid MFA type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const userId = req.user.id;
    const { type = 'totp' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ error: "MFA is already enabled" });
    }

    user.mfaType = type;
    user.mfaEnabled = true;

    let secret;
    if (type === 'totp') {
      // Generate TOTP secret
      secret = speakeasy.generateSecret({
        name: `SecureBidz (${user.email})`,
        issuer: 'SecureBidz'
      });
      user.mfaSecret = secret.base32;
    } else if (type === 'email') {
      // For email MFA, no secret needed initially
      user.mfaSecret = null;
    }

    user.mfaBackupCodes = []; // Will be generated when setup is complete
    await user.save();

    await AuditLog.logEvent({
      userId: user._id,
      action: 'MFA_ENABLED',
      details: { method: type.toUpperCase() },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    if (type === 'totp') {
      res.json({
        message: "TOTP MFA enabled successfully",
        type: 'totp',
        secret: secret.otpauth_url // Frontend can generate QR code from this
      });
    } else {
      res.json({
        message: "Email MFA enabled successfully",
        type: 'email'
      });
    }
  } catch (err) {
    console.error("Enable MFA error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Disable MFA
router.post("/disable-mfa", verifyTokenMiddleware, [
  body('password').notEmpty().withMessage('Password confirmation required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    await user.save();

    await AuditLog.logEvent({
      userId: user._id,
      action: 'MFA_DISABLED',
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 10
    });

    res.json({ message: "MFA disabled successfully" });
  } catch (err) {
    console.error("Disable MFA error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Send Email MFA Code (for authenticated users)
router.post("/send-email-mfa", verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.mfaEnabled || user.mfaType !== 'email') {
      return res.status(400).json({ error: "Email MFA not enabled for this account" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailMFACode = code;
    user.emailMFACodeExpires = expiresAt;
    await user.save();

    // Send email
    const emailResult = await sendMFACode(user.email, code);
    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send MFA code" });
    }

    await AuditLog.logEvent({
      userId: user._id,
      action: 'MFA_CODE_SENT',
      details: { method: 'EMAIL' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    res.json({ message: "MFA code sent to your email" });
  } catch (err) {
    console.error("Send email MFA error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Send Login MFA Code (for login flow, no auth required)
router.post("/send-login-mfa-code", [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('type').isIn(['email']).withMessage('Only email type supported for login MFA')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { userId, type } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: "Invalid MFA request" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailMFACode = code;
    user.emailMFACodeExpires = expiresAt;
    await user.save();

    // Send email
    const emailResult = await sendMFACode(user.email, code);
    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send MFA code" });
    }

    res.json({ message: "MFA code sent to your email" });
  } catch (err) {
    console.error("Send login MFA error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Logout
router.post("/logout", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      await AuditLog.logEvent({
        userId,
        action: 'LOGOUT',
        details: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskScore: 0
      });
    }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
