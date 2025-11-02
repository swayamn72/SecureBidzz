import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  wallet: {
    type: Number,
    default: 0
  },
  inventory: [{
    id: String,
    title: String,
    wonPrice: Number,
    wonAt: Date
  }],
  // Security fields
  isLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLoginAttempt: {
    type: Date
  },
  // MFA fields
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaType: {
    type: String,
    enum: ['totp', 'email'],
    default: 'totp'
  },
  mfaSecret: {
    type: String
  },
  emailMFACode: {
    type: String
  },
  emailMFACodeExpires: {
    type: Date
  },
  mfaBackupCodes: [{
    type: String
  }],
  // Security tracking
  lastLogin: {
    type: Date
  },
  lastPasswordChange: {
    type: Date
  },
  passwordHistory: [{
    hash: String,
    changedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Account lockout methods
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1, lastLoginAttempt: new Date() }
    });
  }
  const updates = { $inc: { loginAttempts: 1 }, $set: { lastLoginAttempt: new Date() } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    updates.$set.isLocked = true;
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1, lastLoginAttempt: 1 },
    $set: { isLocked: false, lastLogin: new Date() }
  });
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// MFA methods
userSchema.methods.generateBackupCodes = function () {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  this.mfaBackupCodes = codes.map(code => bcrypt.hashSync(code, 10));
  return codes; // Return plain codes for user
};

userSchema.methods.validateBackupCode = function (code) {
  for (let i = 0; i < this.mfaBackupCodes.length; i++) {
    if (bcrypt.compareSync(code, this.mfaBackupCodes[i])) {
      this.mfaBackupCodes.splice(i, 1); // Remove used code
      return true;
    }
  }
  return false;
};

export default mongoose.model('User', userSchema);
