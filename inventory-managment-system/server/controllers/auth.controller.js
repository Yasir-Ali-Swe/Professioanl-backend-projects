import userModel from "../models/user.model.js";
import organizationModel from "../models/organization.model.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../services/email.services.js";
import { generateToken, getUserFromToken } from "../helpers/jwt.helper.js";
import { hashPassword } from "../helpers/password.helper.js";
import { NODE_ENV } from "../config/env.js";

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
    const existingUser = await userModel.findOne({ userEmail: ownerEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }
    const newOrganization = new organizationModel({
      name: companyName,
      contactEmail: companyEmail,
      address: companyAddress,
      phone: companyPhone,
    });
    const savedOrganization = await newOrganization.save();
    const hashedPassword = await hashPassword(ownerPassword);
    const newUser = new userModel({
      organizationId: savedOrganization._id,
      userName: ownerName,
      userEmail: ownerEmail,
      userPassword: hashedPassword,
      role: "admin",
    });
    const savedUser = await newUser.save();
    res.status(201).json({
      success: true,
      message: "Registeration successful. ",
    });
  } catch (error) {
    console.error("Error in registeration controller:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
