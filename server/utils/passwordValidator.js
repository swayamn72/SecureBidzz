import bcrypt from 'bcryptjs';

// Password strength requirements
export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    preventCommonPasswords: true
};

// Common weak passwords to reject
const COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    '1234567890', 'password1', 'qwerty123', 'welcome123'
];

// Validate password strength
export function validatePasswordStrength(password) {
    const errors = [];

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    }

    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
        errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (PASSWORD_REQUIREMENTS.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    if (PASSWORD_REQUIREMENTS.preventCommonPasswords && COMMON_PASSWORDS.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more unique password');
    }

    // Check for repeated characters
    if (/(.)\1{3,}/.test(password)) {
        errors.push('Password cannot contain more than 3 consecutive identical characters');
    }

    // Check for sequential characters
    if (/123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
        errors.push('Password cannot contain sequential characters');
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password)
    };
}

// Calculate password strength score (0-100)
function calculatePasswordStrength(password) {
    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

    // Complexity bonuses
    if (password.length >= 12 && /[a-zA-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score += 20;
    }

    return Math.min(100, score);
}

// Get password strength label
export function getPasswordStrengthLabel(strength) {
    if (strength < 30) return { label: 'Very Weak', color: 'text-red-600' };
    if (strength < 50) return { label: 'Weak', color: 'text-orange-600' };
    if (strength < 70) return { label: 'Fair', color: 'text-yellow-600' };
    if (strength < 90) return { label: 'Good', color: 'text-blue-600' };
    return { label: 'Strong', color: 'text-green-600' };
}

// Check if password was used recently (password history)
export async function checkPasswordHistory(user, newPassword) {
    if (!user.passwordHistory || user.passwordHistory.length === 0) {
        return true; // No history to check
    }

    // Check last 5 passwords
    const recentPasswords = user.passwordHistory.slice(-5);
    for (const historyItem of recentPasswords) {
        const isMatch = await bcrypt.compare(newPassword, historyItem.hash);
        if (isMatch) {
            return false; // Password was used recently
        }
    }

    return true; // Password not in recent history
}

// Update password history
export function updatePasswordHistory(user, newPasswordHash) {
    const historyEntry = {
        hash: newPasswordHash,
        changedAt: new Date()
    };

    if (!user.passwordHistory) {
        user.passwordHistory = [];
    }

    // Keep only last 5 passwords
    user.passwordHistory.push(historyEntry);
    if (user.passwordHistory.length > 5) {
        user.passwordHistory = user.passwordHistory.slice(-5);
    }

    user.lastPasswordChange = new Date();
}
