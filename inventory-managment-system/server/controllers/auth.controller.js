import userModel from "../models/user.model.js";
import organizationModel from "../models/organization.model.js";
import subscriptionPlanModel from "../models/organization.subscriptionPlan.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { NODE_ENV } from "../config/env.js";
import { generateToken, getUserFromToken } from "../helpers/jwt.helper.js";
import {
  queueVerificationEmail,
  queueForgetPasswordEmail,
  queueAccountCreatedEmail,
} from "../services/email.queue.service.js";

export const registerOrganization = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      companyAddress,
      companyPhone,
      ownerName,
      ownerEmail,
      ownerPassword,
    } = req.body;
    if (
      !companyName ||
      !companyEmail ||
      !companyAddress ||
      !companyPhone ||
      !ownerName ||
      !ownerEmail ||
      !ownerPassword
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const existingUser = await userModel.findOne({ email: ownerEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "User with this email already exists,Please use a different email",
      });
    }
    if (existingUser && !existingUser.isVerified) {
      const verificationToken = generateToken(
        existingUser._id,
        "15m",
        existingUser.tokenVersion,
        "emailVerification",
      );
      queueVerificationEmail(ownerName, verificationToken, ownerEmail);
      return res.status(200).json({
        success: true,
        message:
          "A verification email has been sent to your email address. Please verify your email to complete the registration.",
      });
    }
    const hashedPassword = await hashPassword(ownerPassword);
    const newOrganization = new organizationModel({
      name: companyName,
      contactEmail: companyEmail,
      address: companyAddress,
      phone: companyPhone,
    });
    const newUser = new userModel({
      organizationId: newOrganization._id,
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      role: "admin",
    });
    const savedUser = await newUser.save();
    const savedOrganization = await newOrganization.save();
    const verificationToken = generateToken(
      savedUser._id,
      "15m",
      savedUser.tokenVersion,
      "emailVerification",
    );
    queueVerificationEmail(ownerName, verificationToken, ownerEmail);
    res.status(201).json({
      success: true,
      message: "Registeration successful. ",
    });
  } catch (error) {
    console.error("Error in registeration controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    const userExists = await userModel.findOne({ email });
    if (!userExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials." });
    }
    const isPasswordValid = await comparePassword(
      password,
      userExists.password,
    );
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials." });
    }

    if (!userExists.isVerified) {
      res.status(400).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
      return;
    }
    const accessToken = generateToken(
      userExists._id,
      "15m",
      // "3s",
      userExists.tokenVersion,
      "auth",
    );
    const refreshToken = generateToken(
      userExists._id,
      "7d",
      userExists.tokenVersion,
      "refresh",
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Get the organization with populated subscription plan
    const organization = await organizationModel
      .findById(userExists.organizationId)
      .select("-__v -createdAt -updatedAt")
      .populate("subscriptionPlan", "-__v -createdAt -updatedAt")
      .lean();

    // If organization has no subscription plan, get the free plan
    let subscriptionPlan = organization?.subscriptionPlan || null;

    if (!subscriptionPlan) {
      // Fetch the free plan from the database
      const freePlan = await subscriptionPlanModel
        .findOne({ name: "free" })
        .select("-__v -createdAt -updatedAt")
        .lean();

      subscriptionPlan = freePlan || {
        name: "free",
        price: 0,
        billingCycle: "monthly",
        aiFeatures: false,
        stripePriceId: null,
      };
    }

    // Build the response object
    const responseData = {
      _id: userExists._id,
      name: userExists.name,
      email: userExists.email,
      role: userExists.role,
      isActive: userExists.isActive,
      isVerified: userExists.isVerified,
      imageUrl: userExists.imageUrl,
      createdAt: userExists.createdAt,
      updatedAt: userExists.updatedAt,
      organization: organization
        ? {
            _id: organization._id,
            name: organization.name,
            contactEmail: organization.contactEmail,
            address: organization.address,
            phone: organization.phone,
            logoUrl: organization.logoUrl,
            status: organization.status,
            invoiceSettings: organization.invoiceSettings,
            subscriptionPlan: subscriptionPlan,
          }
        : null,
    };
    console.log("loginuser", responseData, accessToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      loginUser: responseData,
    });
  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getLoginUser = async (req, res) => {
  try {
    const user = req.user;

    // Get the organization with populated subscription plan
    const organization = await organizationModel
      .findById(user.organizationId)
      .select("-__v -createdAt -updatedAt")
      .populate("subscriptionPlan", "-__v -createdAt -updatedAt")
      .lean();

    // If organization has no subscription plan, get the free plan
    let subscriptionPlan = organization?.subscriptionPlan || null;

    if (!subscriptionPlan) {
      // Fetch the free plan from the database
      const freePlan = await subscriptionPlanModel
        .findOne({ name: "free" })
        .select("-__v -createdAt -updatedAt")
        .lean();

      subscriptionPlan = freePlan || {
        name: "free",
        price: 0,
        billingCycle: "monthly",
        aiFeatures: false,
        stripePriceId: null,
      };
    }

    // Build the response object
    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: organization
        ? {
            _id: organization._id,
            name: organization.name,
            contactEmail: organization.contactEmail,
            address: organization.address,
            phone: organization.phone,
            logoUrl: organization.logoUrl,
            status: organization.status,
            invoiceSettings: organization.invoiceSettings,
            subscriptionPlan: subscriptionPlan,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      loginUser: responseData,
    });
  } catch (error) {
    console.error("Error in getLoginUser controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
export const logoutUser = async (req, res) => {
  try {
    const user = await getUserFromToken(req.cookies.refreshToken, "refresh");
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    user.tokenVersion += 1; // Increment the token version to invalidate existing tokens
    await user.save();
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Error in logout controller:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const userExists = await userModel.findOne({ email });
    if (!userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email does not exist",
      });
    }
    const forgetPasswordToken = generateToken(
      userExists._id,
      "15m",
      userExists.tokenVersion,
      "forgetPassword",
    );
    await queueForgetPasswordEmail(userExists.name, forgetPasswordToken, email);
    res.status(200).json({
      success: true,
      message: "Please check your email for the password reset link",
    });
  } catch (error) {
    console.error("Error in forgetPassword controller:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const { newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const user = await getUserFromToken(token, "forgetPassword");
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    user.tokenVersion += 1;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error in resetPassword controller:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
export const refreshAuth = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const user = await getUserFromToken(refreshToken, "refresh");

    // REMOVE THIS LINE - DO NOT increment token version on refresh
    // user.tokenVersion += 1; // <-- DELETE THIS

    const newAccessToken = generateToken(
      user._id,
      "15m",
      // "3s",
      user.tokenVersion, // Use existing tokenVersion, don't increment
      "auth",
    );
    const newRefreshToken = generateToken(
      user._id,
      "7d",
      user.tokenVersion, // Use existing tokenVersion, don't increment
      "refresh",
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // REMOVE THIS LINE - no need to save if no changes
    // await user.save();

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Error in refreshAuth controller:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await getUserFromToken(token, "emailVerification");
    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "user is already verified" });
    }
    user.isVerified = true;
    user.tokenVersion += 1;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Email verified Succesfully." });
  } catch (error) {
    console.error("Error in verify email controller:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
