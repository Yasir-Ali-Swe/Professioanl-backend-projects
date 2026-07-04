import userModel from "../models/user.model.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";
import { sendAccountCreatedEmail } from "../services/email.services.js";

export const getAllUsers = async (req, res) => {
  try {
    const user = req.user;
    const query = {
      _id: { $ne: user._id },
    };
    const users = await userModel
      .find(query)
      .select("-userPassword -createdAt -updatedAt");
    if (users.length === 0) {
      res.status(404).json({
        success: false,
        message: "No User Exists",
      });
    }
    res.status(200).json({
      success: true,
      message: "users fetch successfully",
      users,
    });
  } catch (error) {
    console.log("error in get all users controller", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { userName, userEmail, userPassword, userRole } = req.body;
    if (!userName || !userEmail || !userPassword || !userRole) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const userExists = await userModel.findOne({ userEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    const hashedPassword = await hashPassword(userPassword);
    const newUser = new userModel({
      userName,
      userEmail,
      userPassword: hashedPassword,
      userRole,
      isVerified: true,
    });
    await sendAccountCreatedEmail(userName, userEmail, userPassword);
    await newUser.save();
    res.status(201).json({
      success: true,
      message: "User Created Successfully.",
    });
  } catch (error) {
    console.error("Error in createUser:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
