import userModel from "../models/user.model.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../services/email.services.js";
import { generateToken, getUserFromToken } from "../helpers/jwt.helper.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { NODE_ENV } from "../config/env.js";

export const registerUser = async (req, res) => {
  try {
    const { userName, userEmail, userPassword, userRole } = req.body;
    if (!userName || !userEmail || !userPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const existingUser = await userModel.findOne({ userEmail });
    if (existingUser && existingUser.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    if (existingUser && !existingUser.isVerified) {
      const token = generateToken(
        existingUser._id,
        "15m",
        existingUser.userTokenVersion,
        "auth",
      );
      await sendVerificationEmail(
        existingUser.userName,
        token,
        existingUser.userEmail,
      );
      return res.status(200).json({
        success: true,
        message: "Verification email resent. Please check your inbox.",
      });
    }
    const hashedPassword = await hashPassword(userPassword);
    const newUser = new userModel({
      userName,
      userEmail,
      userPassword: hashedPassword,
      role: userRole || "staff",
    });
    const token = generateToken(
      newUser._id,
      "15m",
      newUser.userTokenVersion,
      "auth",
    );
    await sendVerificationEmail(userName, token, userEmail);
    await newUser.save();
    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Error in registerUser:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await getUserFromToken(token, "auth");
    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }
    user.isVerified = true;
    user.userTokenVersion += 1;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Error in verifyEmail:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userEmail, userPassword } = req.body;
    if (!userEmail || !userPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const user = await userModel.findOne({ userEmail });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }
    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support.",
      });
    }
    const isPasswordValid = await comparePassword(
      userPassword,
      user.userPassword,
    );
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }
    const accessToken = generateToken(
      user._id,
      "1h",
      user.userTokenVersion,
      "auth",
    );
    const refreshToken = generateToken(
      user._id,
      "7d",
      user.userTokenVersion,
      "refresh",
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
    });
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getLoginUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        userName: user.userName,
        userEmail: user.userEmail,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Error in getLoginUser:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const refreshAuth = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token is required" });
    }
    const user = await getUserFromToken(refreshToken, "refresh");

    if (!user.isActive) {
      const err = new Error("Account is deactivated");
      err.status = 403;
      throw err;
    }
    user.userTokenVersion += 1;
    await user.save();
    const newRefreshToken = generateToken(
      user._id,
      "7d",
      user.userTokenVersion,
      "refresh",
    );
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const newAccessToken = generateToken(
      user._id,
      "1h",
      user.userTokenVersion,
      "auth",
    );
    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error("Error in getNewAccessToken:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const user = await userModel.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const token = generateToken(
      user._id,
      "15m",
      user.userTokenVersion,
      "resetPassword",
    );
    await sendResetPasswordEmail(user.userName, token, user.userEmail);
    res.status(200).json({
      success: true,
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    console.log("Error in forgetPassword:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const { newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }
    const user = await getUserFromToken(token, "resetPassword");
    const hashedPassword = await hashPassword(newPassword);
    user.userPassword = hashedPassword;
    user.userTokenVersion += 1;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.log("Error in resetPassword:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }
    res.clearCookie("refreshToken");
    user.userTokenVersion += 1;
    await user.save();
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
