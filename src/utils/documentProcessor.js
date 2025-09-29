import { vectorService } from "../services/vectorService.js";
import { v4 as uuidv4 } from "uuid";

export const processAndStoreDocument = async (content, metadata = {}) => {
  try {
    // Split document into chunks (simple sentence-based splitting)
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const chunks = [];

    let currentChunk = "";
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 1000) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ". " : "") + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    // Store each chunk in vector database
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuidv4();
      await vectorService.upsertDocument(chunkId, chunks[i], {
        ...metadata,
        chunkIndex: i,
        totalChunks: chunks.length,
      });
    }

    return {
      success: true,
      chunksProcessed: chunks.length,
    };
  } catch (error) {
    console.error("Error processing document:", error);
    throw new Error("Failed to process document");
  }
};
