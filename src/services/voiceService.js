import { AssemblyAI } from "assemblyai";

class VoiceService {
  constructor() {
    this.client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
  }

  async transcribeAudio(audioBuffer, fileName = "audio.mp3") {
    try {
      // Import fs/promises dynamically
      const fs = await import("fs").then((mod) => mod.promises);
      const path = await import("path");

      // Create temp folder if not exists
      const tempDir = path.join(process.cwd(), "temp");
      await fs.mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, fileName);

      // Write audio buffer to temp file
      await fs.writeFile(tempPath, audioBuffer);

      // Transcribe with AssemblyAI
      const params = {
        audio: tempPath,
        language_code: "ur", // Urdu — AssemblyAI supports it experimentally
        // speech_model: "best", // optional — better accuracy
        // You can add other params like: speaker_labels, punctuate, etc.
      };

      const transcript = await this.client.transcripts.transcribe(params);

      // Cleanup: Delete temp file
      await fs.unlink(tempPath);

      // Check if transcription failed
      if (transcript.status === "error") {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      return transcript.text.trim();
    } catch (error) {
      console.error("❌ AssemblyAI Transcription Error:", error.message);
      throw new Error("Failed to transcribe audio. Please try again.");
    }
  }

  // ✅ Future-Proof: TTS function — abhi empty — baad mein add kar lena
  async textToSpeech(text) {
    throw new Error("TTS feature is not enabled yet. Coming soon!");
  }
}

export const voiceService = new VoiceService();
