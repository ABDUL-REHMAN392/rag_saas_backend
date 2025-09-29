// controllers/payment.controller.js
import User from "../models/user.model.js";
import { subscriptionService } from "../services/subscriptionService.js";

// GET PLANS — Hardcoded (No Stripe API)
export const getPlans = async (req, res) => {
  try {
    const plans = {
      free: {
        name: "Free Plan",
        price: 0,
        queries: 5,
        features: ["5 queries/month", "Basic AI access"],
      },
      basic: {
        name: "Basic Plan",
        price: 9.99,
        queries: 100,
        features: ["100 queries/month", "Better AI", "Voice input"],
      },
      pro: {
        name: "Pro Plan",
        price: 19.99,
        queries: "Unlimited",
        features: ["Unlimited queries", "Best AI", "Priority support"],
      },
    };

    res.json({
      success: true,
      plans,
      currentUserPlan: req.user?.subscription?.plan || "free",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching plans",
    });
  }
};

// SIMULATE CHECKOUT — No Stripe
export const createCheckoutSession = async (req, res) => {
  try {
    const { planType } = req.body;
    const user = await User.findById(req.user._id);

    if (!["basic", "pro"].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected",
      });
    }

    const newPlan = await subscriptionService.simulatePlanUpgrade(
      user._id,
      planType
    );

    // Update user in DB
    await User.findByIdAndUpdate(user._id, {
      "subscription.plan": planType,
      "subscription.status": newPlan.status,
      "subscription.currentPeriodEnd": newPlan.currentPeriodEnd,
      credits: newPlan.credits,
    });

    res.json({
      success: true,
      message: `🎉 Successfully upgraded to ${planType} plan!`,
      redirectUrl: `${process.env.FRONTEND_URL}/dashboard?success=true`,
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upgrade plan",
    });
  }
};

// GET SUBSCRIPTION STATUS
export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const daysRemaining = user.subscription.currentPeriodEnd
      ? Math.ceil(
          (new Date(user.subscription.currentPeriodEnd) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    res.json({
      success: true,
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        daysRemaining,
      },
      credits: {
        remaining: user.credits,
        total:
          user.getPlanLimits().queries === -1
            ? "Unlimited"
            : user.getPlanLimits().queries,
      },
      canMakeQuery: user.canMakeQuery(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get subscription status",
    });
  }
};

// CANCEL SUBSCRIPTION
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    await User.findByIdAndUpdate(user._id, {
      "subscription.plan": "free",
      "subscription.status": "canceled",
      "subscription.currentPeriodEnd": new Date(),
      credits: 5,
    });

    res.json({
      success: true,
      message: "✅ Subscription canceled. Switched to Free plan.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
    });
  }
};

// ❌ Webhook, Portal, Change Plan, Analytics, Billing — sab remove kiye
// Agar baad mein chahiye — tab add karna

export const createPortalSession = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Billing portal not available in demo mode",
  });
};

export const resumeSubscription = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Resume feature not available in demo mode",
  });
};

export const changeSubscription = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Change plan feature not available in demo mode",
  });
};

export const getUsageAnalytics = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Analytics not available in demo mode",
  });
};

export const getBillingHistory = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Billing history not available in demo mode",
  });
};

export const handleWebhook = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Webhooks not used in demo mode",
  });
};

export const addCredits = async (req, res) => {
  res.status(400).json({
    success: false,
    message: "Admin credit feature not available in demo mode",
  });
};
