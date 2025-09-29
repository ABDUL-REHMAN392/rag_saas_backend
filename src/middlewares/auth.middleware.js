import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
export const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login to access this resource",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "User not found or account deleted",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.subscription.plan)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.subscription.plan} is not allowed to access this resource`,
      });
    }
    next();
  };
};
