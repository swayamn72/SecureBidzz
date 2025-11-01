import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'SIGNUP',
            'PASSWORD_CHANGE',
            'MFA_ENABLED',
            'MFA_DISABLED',
            'BID_PLACED',
            'ITEM_CREATED',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED',
            'SUSPICIOUS_ACTIVITY',
            'PASSWORD_RESET_REQUEST',
            'PASSWORD_RESET_SUCCESS'
        ]
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
        default: {}
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String
    },
    location: {
        country: String,
        city: String,
        region: String
    },
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ riskScore: -1, timestamp: -1 });

// Static method to log security events
auditLogSchema.statics.logEvent = async function (data) {
    try {
        const logEntry = new this(data);
        await logEntry.save();
        return logEntry;
    } catch (error) {
        console.error('Failed to log audit event:', error);
        // Don't throw error to avoid breaking main functionality
    }
};

// Method to detect suspicious patterns
auditLogSchema.statics.detectSuspiciousActivity = async function (userId, currentIP, currentAction) {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Check for rapid failed logins
        const recentFailedLogins = await this.countDocuments({
            userId,
            action: 'LOGIN_FAILED',
            timestamp: { $gte: oneHourAgo }
        });

        // Check for login from different IP
        const lastSuccessfulLogin = await this.findOne({
            userId,
            action: 'LOGIN_SUCCESS'
        }).sort({ timestamp: -1 });

        let riskScore = 0;
        let reasons = [];

        // Risk scoring
        if (recentFailedLogins >= 3) {
            riskScore += 30;
            reasons.push('Multiple failed login attempts');
        }

        if (lastSuccessfulLogin && lastSuccessfulLogin.ipAddress !== currentIP) {
            riskScore += 20;
            reasons.push('Login from different IP address');
        }

        // Check for unusual bidding patterns (if action is bid-related)
        if (currentAction.includes('BID')) {
            const recentBids = await this.countDocuments({
                userId,
                action: 'BID_PLACED',
                timestamp: { $gte: oneHourAgo }
            });

            if (recentBids >= 10) {
                riskScore += 25;
                reasons.push('Unusual bidding frequency');
            }
        }

        // Geographic anomalies (if location data available)
        if (lastSuccessfulLogin && lastSuccessfulLogin.location &&
            currentIP !== lastSuccessfulLogin.ipAddress) {
            // This would require IP geolocation service
            riskScore += 15;
            reasons.push('Login from unusual location');
        }

        return {
            riskScore: Math.min(100, riskScore),
            reasons,
            isSuspicious: riskScore >= 50
        };
    } catch (error) {
        console.error('Error detecting suspicious activity:', error);
        return { riskScore: 0, reasons: [], isSuspicious: false };
    }
};

export default mongoose.model('AuditLog', auditLogSchema);
