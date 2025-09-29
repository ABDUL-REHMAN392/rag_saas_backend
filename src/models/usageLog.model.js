import mongoose from "mongoose";

const usageLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    tokensUsed: {
      type: Number,
      required: true,
    },
    creditsDeducted: {
      type: Number,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    voice: {
      type: Boolean,
      default: false,
    },
    sources: [
      {
        title: String,
        url: String,
        similarity: Number,
      },
    ],
    processingTime: {
      type: Number, // in milliseconds
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for analytics
usageLogSchema.index({ user: 1, createdAt: -1 });
usageLogSchema.index({ user: 1, model: 1 });
usageLogSchema.index({ createdAt: -1 });
const UsageLog = mongoose.model("UsageLog", usageLogSchema);
export default UsageLog;
