import { voiceService } from "../services/voiceService.js";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"), false);
    }
  },
});

export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required",
      });
    }

    const transcription = await voiceService.transcribeAudio(req.file.buffer);

    res.json({
      success: true,
      transcription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateSpeech = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const audioBuffer = await voiceService.textToSpeech(text);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const voiceUploadMiddleware = upload.single("audio");
