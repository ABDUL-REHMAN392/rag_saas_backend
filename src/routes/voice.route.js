import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  transcribeAudio,
  generateSpeech,
  voiceUploadMiddleware,
} from "../controllers/voice.controller.js";

const router = express.Router();

router.use(authenticateUser);
router.post("/transcribe", voiceUploadMiddleware, transcribeAudio);
router.post("/speech", generateSpeech);

export default router;
