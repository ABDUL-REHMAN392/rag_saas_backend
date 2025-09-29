// routes/subscriptionRoutes.js
import express from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import {
  getPlans,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
  resumeSubscription,
  changeSubscription,
  getUsageAnalytics,
  getBillingHistory,
  handleWebhook,
  addCredits,
} from "../controllers/payment.controller.js";

const router = express.Router();

// Public webhook route (no auth needed)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Public plan info
router.get("/plans", getPlans);

// Protected routes
router.use(authenticateUser);

// Subscription management
router.post("/checkout", createCheckoutSession);
router.post("/portal", createPortalSession);
router.get("/status", getSubscriptionStatus);
router.put("/cancel", cancelSubscription);
router.put("/resume", resumeSubscription);
router.put("/change", changeSubscription);

// Analytics and billing
router.get("/analytics", getUsageAnalytics);
router.get("/billing-history", getBillingHistory);

// Admin routes
router.post("/add-credits", authorizeRoles("admin"), addCredits);

export default router;
