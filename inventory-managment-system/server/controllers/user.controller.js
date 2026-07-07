// controllers/user.controller.js
import userModel from "../models/user.model.js";

export const uploadUserProfileImage = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const user = await userModel
      .findByIdAndUpdate(userId, { imageUrl: req.file.path }, { new: true })
      .populate("organizationId", "name contactEmail phone address logoUrl")
      .populate("invitedBy", "name email role")
      .select("-password -tokenVersion -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error uploading profile image:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel
      .findById(userId)
      .populate(
        "organizationId",
        "name contactEmail phone address logoUrl status",
      )
      .populate("invitedBy", "name email role")
      .select("-password -tokenVersion -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await userModel
      .findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      })
      .populate(
        "organizationId",
        "name contactEmail phone address logoUrl status",
      )
      .populate("invitedBy", "name email role")
      .select("-password -tokenVersion -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
