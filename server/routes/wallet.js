import express from "express";
import User from "../models/User.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// GET /api/wallet - Get user's wallet balance
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ wallet: user.wallet, inventory: user.inventory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/wallet/deposit - Deposit money to wallet
router.post("/deposit", verifyToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const depositAmount = parseFloat(amount);
        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({ error: "Valid deposit amount required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.wallet += depositAmount;
        await user.save();

        res.json({ message: "Deposit successful", newBalance: user.wallet });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
