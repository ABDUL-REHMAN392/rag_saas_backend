// routes/subscriptionRoutes.js
import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
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
  addCredits,
} from "../controllers/payment.controller.js";

const router = express.Router();
// Public
router.get("/plans", getPlans);

// Protected
router.use(authenticateUser);

router.post("/checkout", createCheckoutSession);
router.post("/portal", createPortalSession); // returns error
router.get("/status", getSubscriptionStatus);
router.put("/cancel", cancelSubscription);
router.put("/resume", resumeSubscription); // returns error
router.put("/change", changeSubscription); // returns error

// Analytics & Billing — disable
router.get("/analytics", getUsageAnalytics);
router.get("/billing-history", getBillingHistory);

// Admin — disable
router.post("/add-credits", addCredits);

export default router;
