import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    messages: [
      {
        type: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        voice: {
          type: Boolean,
          default: false,
        },
        sources: [
          {
            title: String,
            url: String,
            snippet: String,
            similarity: Number,
          },
        ],
        tokensUsed: {
          type: Number,
          default: 0,
        },
        creditsDeducted: {
          type: Number,
          default: 0,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for better query performance
chatSchema.index({ user: 1, isDeleted: 1, lastMessageAt: -1 });
chatSchema.index({ "messages.timestamp": -1 });
const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
