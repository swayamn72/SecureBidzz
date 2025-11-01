import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import User from "../models/User.js";

const router = express.Router();

// Get user profile
router.get("/profile", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -mfaSecret -mfaBackupCodes');
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            wallet: user.wallet,
            mfaEnabled: user.mfaEnabled,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        });
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update user profile
router.put("/profile", verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update allowed fields
        if (name) user.name = name;

        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                wallet: user.wallet,
                mfaEnabled: user.mfaEnabled
            }
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
