import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  verifyEmail,
  resendEmailVerification,
} from "../controllers/auth.controller.js";

const router = express.Router();


// Public routes
router.post("/register", upload.single("avatar"), registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
//emailverfication routes
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendEmailVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.use(authenticateUser); // Apply auth middleware to all routes below
router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", upload.single("avatar"), updateProfile);
router.put("/change-password", changePassword);
router.delete("/delete-account", deleteAccount);

export default router;
