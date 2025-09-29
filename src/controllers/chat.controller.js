import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";
import UsageLog from "../models/usageLog.model.js";
import { vectorService } from "../services/vectorService.js";
import { aiService } from "../services/aiService.js";

// Create new chat
export const createChat = async (req, res) => {
  try {
    const { query, voice = false } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user can make query
    if (!user.canMakeQuery()) {
      return res.status(403).json({
        success: false,
        message:
          "Insufficient credits or subscription expired. Please upgrade your plan.",
        creditsRemaining: user.credits,
        plan: user.subscription.plan,
      });
    }

    // Initialize vector service if not already done
    if (!vectorService.index) {
      await vectorService.initialize();
    }

    const startTime = Date.now();

    // Search for relevant context from Quran/Hadith DB
    const contextResults = await vectorService.searchSimilar(query, 5);

    // ✅ Fixed Model — Only Qwen-7B-Chat for everyone
    const aiModel = "Qwen-7B-Chat";

    // ✅ Only 2 parameters: query + context (no model parameter)
    const aiResponse = await aiService.generateResponse(query, contextResults);

    // Calculate credits to deduct
    const creditsToDeduct = Math.ceil(aiResponse.tokensUsed / 1000);

    // Create chat
    const chat = new Chat({
      user: user._id,
      title: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
      messages: [
        {
          type: "user",
          content: query,
          voice,
          timestamp: new Date(),
        },
        {
          type: "assistant",
          content: aiResponse.response,
          sources: contextResults.map((result) => ({
            title: result.title || "Reference",
            url: result.url || "#",
            snippet:
              result.content?.substring(0, 200) || "No content available",
            similarity: result.similarity || 0,
          })),
          tokensUsed: aiResponse.tokensUsed,
          creditsDeducted: creditsToDeduct,
          timestamp: new Date(),
        },
      ],
      lastMessageAt: new Date(),
    });

    await chat.save();

    // Update user credits/usage
    user.deductCredits(creditsToDeduct);
    await user.save();

    // Log usage
    const assistantMessage = chat.messages[1];
    await UsageLog.create({
      user: user._id,
      chat: chat._id,
      messageId: assistantMessage._id,
      query,
      response: aiResponse.response,
      tokensUsed: aiResponse.tokensUsed,
      creditsDeducted: creditsToDeduct,
      model: aiModel, // for analytics
      voice,
      sources: contextResults.map((r) => ({
        title: r.title || "Reference",
        url: r.url || "#",
        similarity: r.similarity || 0,
      })),
      processingTime: aiResponse.processingTime,
    });

    res.status(201).json({
      success: true,
      chat: {
        _id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
      },
      creditsRemaining: user.credits,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    console.error("Error in createChat:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Continue existing chat
export const addMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query, voice = false } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user can make query
    if (!user.canMakeQuery()) {
      return res.status(403).json({
        success: false,
        message:
          "Insufficient credits or subscription expired. Please upgrade your plan.",
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      user: user._id,
      isDeleted: false,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Search for relevant context
    const contextResults = await vectorService.searchSimilar(query, 5);

    // ✅ Fixed Model
    const aiModel = "Qwen-7B-Chat";

    // ✅ Only 2 parameters
    const aiResponse = await aiService.generateResponse(query, contextResults);

    const creditsToDeduct = Math.ceil(aiResponse.tokensUsed / 1000);

    // Add messages to chat
    const userMessage = {
      type: "user",
      content: query,
      voice,
      timestamp: new Date(),
    };

    const assistantMessage = {
      type: "assistant",
      content: aiResponse.response,
      sources: contextResults.map((result) => ({
        title: result.title || "Reference",
        url: result.url || "#",
        snippet: result.content?.substring(0, 200) || "No content available",
        similarity: result.similarity || 0,
      })),
      tokensUsed: aiResponse.tokensUsed,
      creditsDeducted: creditsToDeduct,
      timestamp: new Date(),
    };

    chat.messages.push(userMessage, assistantMessage);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Update user credits/usage
    user.deductCredits(creditsToDeduct);
    await user.save();

    // Log usage
    await UsageLog.create({
      user: user._id,
      chat: chat._id,
      messageId: assistantMessage._id,
      query,
      response: aiResponse.response,
      tokensUsed: aiResponse.tokensUsed,
      creditsDeducted: creditsToDeduct,
      model: aiModel,
      voice,
      sources: contextResults.map((r) => ({
        title: r.title || "Reference",
        url: r.url || "#",
        similarity: r.similarity || 0,
      })),
      processingTime: aiResponse.processingTime,
    });

    res.json({
      success: true,
      messages: [userMessage, assistantMessage],
      creditsRemaining: user.credits,
    });
  } catch (error) {
    console.error("Error in addMessage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Get user's chat history
export const getChatHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const chats = await Chat.find({
      user: req.user._id,
      isDeleted: false,
    })
      .select("title lastMessageAt createdAt")
      .sort({ lastMessageAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalChats = await Chat.countDocuments({
      user: req.user._id,
      isDeleted: false,
    });

    res.json({
      success: true,
      chats,
      totalPages: Math.ceil(totalChats / limit),
      currentPage: page,
      totalChats,
    });
  } catch (error) {
    console.error("Error in getChatHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Get specific chat
export const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user._id,
      isDeleted: false,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    console.error("Error in getChat:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Delete chat
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        user: req.user._id,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteChat:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Get user's usage statistics
export const getUsageStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const monthlyUsage = await UsageLog.aggregate([
      {
        $match: {
          user: user._id,
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: 1 },
          totalTokens: { $sum: "$tokensUsed" },
          totalCredits: { $sum: "$creditsDeducted" },
        },
      },
    ]);

    const stats = monthlyUsage[0] || {
      totalQueries: 0,
      totalTokens: 0,
      totalCredits: 0,
    };

    res.json({
      success: true,
      stats: {
        ...stats,
        creditsRemaining: user.credits,
        plan: user.subscription.plan,
        planLimits: user.getPlanLimits(),
        subscriptionStatus: user.subscription.status,
        subscriptionEndDate: user.subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Error in getUsageStats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
