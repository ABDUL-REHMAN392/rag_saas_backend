import User from "../models/user.model.js";

// ===================================
// GET SUBSCRIPTION PLANS — Hardcoded
// ===================================
export const getPlans = async (req, res) => {
  try {
    const plansWithFeatures = {
      free: {
        name: "Free Plan",
        price: 0,
        queries: 5,
        features: ["5 queries/month", "Basic AI", "No voice"],
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
      plans: plansWithFeatures,
      currentUserPlan: req.user?.subscription?.plan || "free",
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching plans",
    });
  }
};

// ===================================
// SIMULATE CHECKOUT — No Stripe
// ===================================
export const createCheckoutSession = async (req, res) => {
  try {
    const { planType } = req.body;
    const user = await User.findById(req.user._id);

    const validPlans = ["basic", "pro"];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan selected",
      });
    }

    // ✅ Simulate plan upgrade — NO STRIPE SERVICE
    const planConfig = {
      basic: { credits: 100, status: "active" },
      pro: { credits: 99999, status: "active" }, // unlimited
    };

    const newPlan = planConfig[planType];

    // Update user in DB
    await User.findByIdAndUpdate(user._id, {
      "subscription.plan": planType,
      "subscription.status": newPlan.status,
      "subscription.currentPeriodEnd": new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ), // 30 days
      credits: newPlan.credits,
    });

    res.json({
      success: true,
      message: `🎉 Successfully upgraded to ${planType} plan!`,
      redirectUrl: `${process.env.FRONTEND_URL}/dashboard?success=true`,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process upgrade",
    });
  }
};

// ===================================
// GET SUBSCRIPTION STATUS
// ===================================
export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const planLimits = user.getPlanLimits();
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
        total: planLimits.queries === -1 ? "Unlimited" : planLimits.queries,
      },
      canMakeQuery: user.canMakeQuery(),
    });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get status",
    });
  }
};

// ===================================
// CANCEL SUBSCRIPTION
// ===================================
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
    console.error("Cancel error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
    });
  }
};
