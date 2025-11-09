import express from "express";
import rateLimit from "express-rate-limit";
import Item from "../models/Item.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// Bid-specific rate limiter (prevent bid spamming)
const bidLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 bids per minute per IP
    message: "Too many bids, please slow down.",
});

// GET /items - List all items
router.get("/", async (req, res) => {
    try {
        const items = await Item.find().populate('createdBy', 'name email');
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /items/:id - Get item details
router.get("/:id", async (req, res) => {
    try {
        if (!req.params.id || req.params.id === 'undefined') {
            return res.status(400).json({ error: "Invalid item ID" });
        }
        const item = await Item.findById(req.params.id).populate('createdBy', 'name email').populate({
            path: 'bids.userId',
            select: 'name'
        });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /items - Create new item (protected)
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, description, start_price } = req.body;
        if (!title || !description || !start_price) {
            return res.status(400).json({ error: "Title, description, and start_price are required" });
        }
        const newItem = new Item({
            title,
            description,
            start_price: parseFloat(start_price),
            current_bid: parseFloat(start_price),
            bids: [],
            createdBy: req.user.id,
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            status: 'active',
        });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

import User from "../models/User.js";

// POST /items/:id/bid - Place a bid (protected)
router.post("/:id/bid", bidLimiter, verifyToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const bidAmount = parseFloat(amount);
        if (!bidAmount || bidAmount <= 0) {
            return res.status(400).json({ error: "Valid bid amount required" });
        }

        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Check if auction has ended
        if (new Date() > item.end_time) {
            return res.status(400).json({ error: "Auction has ended" });
        }

        if (bidAmount <= item.current_bid) {
            return res.status(400).json({ error: "Bid must be higher than current bid" });
        }

        // Check user's wallet balance
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (bidAmount > user.wallet) {
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        const newBid = {
            userId: req.user.id,
            amount: bidAmount,
            timestamp: new Date(),
        };

        item.current_bid = bidAmount;
        item.bids.push(newBid);
        await item.save();

        res.json({ message: "Bid placed successfully", current_bid: bidAmount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
