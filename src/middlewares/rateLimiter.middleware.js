import rateLimit from "express-rate-limit";
import User from "../models/user.model.js";

export const createChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const user = await User.findById(req.user._id);

    // Different limits based on plan
    const limits = {
      free: 5, // 5 requests per minute
      basic: 20, // 20 requests per minute
      pro: 50, // 50 requests per minute
    };

    return limits[user.subscription.plan] || limits.free;
  },
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
