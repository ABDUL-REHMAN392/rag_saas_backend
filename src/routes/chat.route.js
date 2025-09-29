import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  createChat,
  addMessage,
  getChatHistory,
  getChat,
  deleteChat,
  getUsageStats,
} from "../controllers/chat.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateUser);

router.post("/", createChat);
router.post("/:chatId/messages", addMessage);
router.get("/", getChatHistory);
router.get("/stats", getUsageStats);
router.get("/:chatId", getChat);
router.delete("/:chatId", deleteChat);

export default router;
