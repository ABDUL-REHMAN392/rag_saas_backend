// src/services/vectorService.js
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

class VectorService {
  constructor() {
    this.hfApiKey = process.env.HUGGINGFACE_API_KEY;

    // ✅ Modern Pinecone SDK: Pass API key directly in constructor
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // ✅ Directly reference the index — no .init() needed
    this.index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME);
  }

  // Optional: Keep for logging or future async setup
  async initialize() {
    console.log("Pinecone initialized:", process.env.PINECONE_INDEX_NAME);
  }

  // Hugging Face Qwen3-Embedding-8B embedding
  async createEmbedding(text) {
    // ⚠️ Fix: Remove trailing spaces in URL
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Qwen3-Embedding-8B", // 🚫 No trailing spaces
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.hfApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    const data = await response.json();
    if (!data || !data[0] || !data[0].embedding) {
      throw new Error("Embedding not returned by Hugging Face API");
    }
    return data[0].embedding;
  }

  async upsertDocument(id, text, metadata = {}) {
    const embedding = await this.createEmbedding(text);

    // ✅ Modern Pinecone: Simplified upsert syntax
    await this.index.upsert([
      {
        id,
        values: embedding,
        metadata: { content: text, ...metadata },
      },
    ]);

    console.log(`Document ${id} upserted successfully`);
  }

  async searchSimilar(query, topK = 5) {
    const queryEmbedding = await this.createEmbedding(query);

    // ✅ Modern Pinecone: Simplified query syntax
    const searchResponse = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return searchResponse.matches.map((match) => ({
      id: match.id,
      content: match.metadata?.content || "",
      similarity: match.score,
    }));
  }
}

export const vectorService = new VectorService();
