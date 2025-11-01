import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
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
        userId: user._id
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
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit code required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: "Invalid MFA request" });
    }

    // Debug logging
    console.log('Verifying MFA code:', code, 'for user:', userId);
    const expectedCode = speakeasy.totp({
      secret: user.mfaSecret,
      encoding: 'base32'
    });
    console.log('Expected code:', expectedCode);

    // Verify TOTP code using speakeasy
    const isValidCode = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps (30 seconds) tolerance
    });

    console.log('Verification result:', isValidCode);

    if (!isValidCode) {
      await AuditLog.logEvent({
        userId: user._id,
        action: 'LOGIN_FAILED',
        details: { reason: 'Invalid MFA code' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        riskScore: 40
      });
      return res.status(400).json({ error: "Invalid MFA code" });
    }

    // Clear MFA secret and generate token
    user.mfaSecret = undefined;
    await user.save();

    await AuditLog.logEvent({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      details: { method: 'MFA' },
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
router.post("/enable-mfa", verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ error: "MFA is already enabled" });
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `SecureBidz (${user.email})`,
      issuer: 'SecureBidz'
    });

    user.mfaSecret = secret.base32;
    user.mfaEnabled = true;
    user.mfaBackupCodes = []; // Will be generated when setup is complete
    await user.save();

    await AuditLog.logEvent({
      userId: user._id,
      action: 'MFA_ENABLED',
      details: { method: 'TOTP' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      riskScore: 0
    });

    res.json({
      message: "MFA enabled successfully",
      secret: secret.otpauth_url // Frontend can generate QR code from this
    });
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
