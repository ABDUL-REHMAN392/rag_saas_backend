import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    avatar: {
      public_id: { type: String },
      url: { type: String },
    },
    googleId: { type: String, default: null },
    credits: { type: Number, default: 5 },
    emailVerificationOTP: { type: String, default: null },
    emailVerificationOTPExpire: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "basic", "pro"],
        default: "free",
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      stripePriceId: { type: String, default: null },
      status: {
        type: String,
        enum: ["active", "inactive", "canceled", "past_due"],
        default: "inactive",
      },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    usage: {
      monthlyQueries: { type: Number, default: 0 },
      totalQueries: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    resetPasswordOTP: { type: String, default: null },
    resetPasswordOTPExpire: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Password hash middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Methods
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.canMakeQuery = function () {
  if (this.subscription.plan === "free") {
    return this.credits > 0;
  }

  // For paid plans, check if subscription is active
  if (
    this.subscription.status === "active" &&
    this.subscription.currentPeriodEnd > new Date()
  ) {
    return true;
  }

  return false;
};

userSchema.methods.deductCredits = function (amount = 1) {
  if (this.subscription.plan === "free") {
    this.credits = Math.max(0, this.credits - amount);
  }
  this.usage.monthlyQueries += amount;
  this.usage.totalQueries += amount;
};

userSchema.methods.getPlanLimits = function () {
  const limits = {
    free: { queries: 5, maxTokens: 1000 },
    basic: { queries: 100, maxTokens: 4000 },
    pro: { queries: -1, maxTokens: 8000 }, // -1 means unlimited
  };
  return limits[this.subscription.plan] || limits.free;
};

userSchema.methods.generateResetPasswordOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.resetPasswordOTP = otp;
  this.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

userSchema.methods.generateEmailVerificationOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.emailVerificationOTP = otp;
  this.emailVerificationOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

userSchema.methods.verifyEmail = function (otp) {
  if (this.emailVerificationOTP === otp && 
      this.emailVerificationOTPExpire > Date.now()) {
    this.isEmailVerified = true;
    this.emailVerificationOTP = null;
    this.emailVerificationOTPExpire = null;
    return true;
  }
  return false;
};

const User = mongoose.model("User", userSchema);
export default User;