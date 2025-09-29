// services/subscriptionService.js
class SubscriptionService {
  async simulatePlanUpgrade(userId, planType) {
    const validPlans = ["free", "basic", "pro"];
    if (!validPlans.includes(planType)) {
      throw new Error("Invalid plan type");
    }

    const config = {
      free: { credits: 5, status: "active" },
      basic: { credits: 100, status: "active" },
      pro: { credits: 99999, status: "active" },
    };

    const plan = config[planType];
    return {
      plan: planType,
      credits: plan.credits,
      status: plan.status,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }
}

export const subscriptionService = new SubscriptionService();
