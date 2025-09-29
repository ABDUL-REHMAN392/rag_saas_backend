import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Import routes
import authRoutes from './src/routes/auth.route.js';
import chatRoutes from './src/routes/chat.route.js';
import subscriptionRoutes from './src/routes/subscription.route.js';
import voiceRoutes from './src/routes/voice.route.js';

// Import middleware
import { createChatLimiter } from './src/middlewares/rateLimiter.middleware.js';

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
}));

// ✅ Body parsing middleware — webhook wala line remove ki
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Connect to MongoDB
import connectDB from "./src/config/db_Connection.js";
connectDB()
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(e => console.log("❌ DB connection error:", e));

// Initialize vector service
import { vectorService } from "./src/services/vectorService.js";
vectorService.initialize().catch(console.error);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", createChatLimiter, chatRoutes);
app.use("/api/subscription", subscriptionRoutes); // ✅ Simulated — no Stripe
app.use("/api/voice", voiceRoutes); // ✅ AssemblyAI STT — no TTS

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors).map(e => e.message),
    });
  }
  
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }
  
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Health check: http://localhost:${PORT}/health`);
});