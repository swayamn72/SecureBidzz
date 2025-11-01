// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import helmet from "helmet";
import enforceHttps from "express-sslify";
import authRoutes from "./routes/auth.js";
import itemsRoutes from "./routes/items.js";
import walletRoutes from "./routes/wallet.js";
import profileRoutes from "./routes/profile.js";
import verifyToken from "./middleware/verifyToken.js";
import connectDB from "./config/database.js";
import User from "./models/User.js";
import Item from "./models/Item.js";

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Security middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// HTTPS enforcement (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(enforceHttps({ trustProtoHeader: true }));
}
app.use(cors({
  origin: 'http://localhost:5173', // Allow frontend origin
  credentials: true
}));
app.use(express.json());
// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Auth-specific rate limiter (stricter for login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 auth attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
});

// Bid-specific rate limiter (prevent bid spamming)
const bidLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 bids per minute per IP
  message: "Too many bids, please slow down.",
});

// Public route
app.get("/", (req, res) => res.send("🔥 MongoDB + JWT Auth + Express running"));

// Auth routes
app.use("/api/auth", authRoutes);

// Items routes
app.use("/api/items", itemsRoutes);

// Wallet routes
app.use("/api/wallet", walletRoutes);

// Profile routes
app.use("/api/auth", profileRoutes);

// Example protected route
app.get("/api/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ id: user._id, name: user.name, email: user.email, wallet: user.wallet, inventory: user.inventory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Cron job to check for ended auctions every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const expiredItems = await Item.find({ status: "active", end_time: { $lte: now } });

    for (const item of expiredItems) {
      if (item.bids.length > 0) {
        // Find the highest bidder
        const highestBid = item.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
        const winnerId = highestBid.userId;

        // Add item to winner's inventory
        const winner = await User.findById(winnerId);
        if (winner) {
          const updatedInventory = [...(winner.inventory || []), {
            id: item._id,
            title: item.title,
            wonPrice: highestBid.amount,
            wonAt: new Date()
          }];
          winner.inventory = updatedInventory;
          await winner.save();
        }
      }

      // Mark item as sold
      item.status = "sold";
      await item.save();
    }
  } catch (err) {
    console.error("Error in auction closure cron job:", err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
