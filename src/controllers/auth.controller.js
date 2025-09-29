import User from "../models/user.model.js";
import { generateToken, setCookie } from "../utils/jwt.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../services/cloudinary.js";
import { sendResetPasswordEmail, sendVerificationEmail } from "../services/email.js"; // Fixed import

// Email Verification
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationOTP: otp,
      emailVerificationOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification OTP",
      });
    }

    const isVerified = user.verifyEmail(otp);
    if (isVerified) {
      await user.save();
      
      res.json({
        success: true,
        message: "Email verified successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to verify email",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Resend Email Verification
export const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const otp = user.generateEmailVerificationOTP();
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.json({
      success: true,
      message: "Verification OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists but is deleted
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isDeleted) {
      return res.status(400).json({
        success: false,
        message:
          "This email was previously used for a deleted account. Please contact support or use a different email.",
      });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    let avatar = {};

    // Handle avatar upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      avatar = {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
      };
    }

    const user = await User.create({
      name,
      email,
      password,
      avatar,
    });

    // Generate and send verification OTP
    const otp = user.generateEmailVerificationOTP();
    await user.save();

    await sendVerificationEmail(email, otp);

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email address before logging in",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Google OAuth Login
export const googleLogin = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    let user = await User.findOne({
      $or: [{ email }, { googleId }],
      isDeleted: false,
    });

    if (user && user.isDeleted) {
      return res.status(400).json({
        success: false,
        message:
          "This email was previously used for a deleted account. Please contact support.",
      });
    }

    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        password: Math.random().toString(36).slice(-8), // Random password for Google users
        avatar: avatar ? { url: avatar } : {},
      });
      
      // For Google users, we can mark email as verified automatically
      // Or send verification email based on your preference
      user.isEmailVerified = true; // Auto-verify for Google login
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      success: true,
      message: "Google login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Logout
export const logout = (req, res) => {
  res.cookie("token", "", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// Get User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;

    // Handle avatar update
    if (req.file) {
      // Delete old avatar from cloudinary
      if (user.avatar.public_id) {
        await deleteFromCloudinary(user.avatar.public_id);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer);
      user.avatar = {
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
      };
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    const otp = user.generateResetPasswordOTP();
    await user.save();

    await sendResetPasswordEmail(email, otp);

    res.json({
      success: true,
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpire: { $gt: Date.now() },
      isDeleted: false,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpire = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Delete avatar from cloudinary
    if (user.avatar.public_id) {
      await deleteFromCloudinary(user.avatar.public_id);
    }

    // Mark as deleted instead of actually deleting
    user.isDeleted = true;
    await user.save();

    res.cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
