import userModel from "../models/user.model.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.services.js";
import { generateToken, getUserFromToken } from "../helpers/jwt.helper.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { NODE_ENV } from "../config/env.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const userExists = await userModel.findOne({ email });
    if (userExists && userExists.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }
    if (userExists && !userExists.isVerified) {
      const token = generateToken(userExists._id, "1h", "emailVerification");
      await sendVerificationEmail(userExists.email, token);
      return res.status(200).json({
        success: true,
        message: "Verification email resent. Please check your inbox.",
      });
    }
    const hashedPassword = await hashPassword(password);
    const newUser = new userModel({ name, email, password: hashedPassword });
    await newUser.save();
    const token = generateToken(newUser._id, "1h", "emailVerification");
    await sendVerificationEmail(newUser.email, token);
    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    console.log(`Error in registration controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await getUserFromToken(token, "emailVerification");
    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }
    user.isVerified = true;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.log(`Error in email verification controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }
    if (!user.isVerified) {
      res.status(400).json({
        success: false,
        message: "Email not verified.Please verify your email to log in.",
      });
    }
    const accessToken = generateToken(
      user._id,
      "60m",
      "auth",
      user.tokenVersion,
    );
    const refreshToken = generateToken(
      user._id,
      "7d",
      "auth",
      user.tokenVersion,
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      accessToken,
    });
  } catch (error) {
    console.log(`Error in login controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getCurrentLoginUser = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: user.select("-password -tokenVersion -createdAt -updatedAt -__v"),
    });
  } catch (error) {
    console.log(`Error in get current login user controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getNewAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token not found" });
    }
    const user = await getUserFromToken(refreshToken, "auth");
    const newAccessToken = generateToken(
      user._id,
      "60m",
      "auth",
      user.tokenVersion,
    );

    const newRefreshToken = generateToken(
      user._id,
      "7d",
      "auth",
      user.tokenVersion,
    );
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.log(`Error in get new access token controller: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const user = req.user;
    user.tokenVersion += 1;
    await user.save();
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.log(`Error in logout controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not Exist" });
    }
    const token = generateToken(
      user._id,
      "10m",
      "passwordReset",
      user.tokenVersion,
    );
    await sendPasswordResetEmail(user, token);
    res.status(200).json({
      success: true,
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    console.log(`Error in forgot password controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }
    const user = await getUserFromToken(token, "passwordReset");
    user.password = await hashPassword(password);
    user.tokenVersion += 1; // Invalidate existing tokens
    await user.save();
    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.log(`Error in reset password controller: ${error.message}`);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
