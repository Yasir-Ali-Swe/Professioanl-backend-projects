import userModel from "../models/user.model.js";
import organizationModel from "../models/organization.model.js";
import invoiceModel from "../models/invoice.model.js";
import { hashPassword } from "../helpers/password.helper.js";
import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import supplierModel from "../models/supplier.model.js";
import purchaseOrderModel from "../models/purchaseOrder.model.js";
import { queueAccountCreatedEmail } from "../services/email.queue.service.js";
import mongoose from "mongoose";

export const getOrganizationProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const organization = await organizationModel
      .findById(organizationId)
      .select("-__v -updatedAt")
      .populate("subscriptionPlan", "-__v -updatedAt");
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Error in getOrganizationProfile:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationProfile = async (req, res) => {
  try {
    const { name, contactEmail, address, phone } = req.body;
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const updateData = {};

    if (name) updateData.name = name;
    if (contactEmail) updateData.contactEmail = contactEmail;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;

    const updatedOrganization = await organizationModel
      .findByIdAndUpdate(organizationId, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-__v -createdAt -updatedAt -invoiceSettings")
      .populate("subscriptionPlan", "-__v -updatedAt");

    if (!updatedOrganization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Organization profile updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrganizationProfile:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const uploadOrganizationLogo = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const organization = await organizationModel
      .findByIdAndUpdate(
        organizationId,
        { logoUrl: req.file.path },
        { new: true },
      )
      .select("-__v -updatedAt")
      .populate("subscriptionPlan", "-__v -updatedAt");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Organization logo uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading organization logo:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOrganizationAdminProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const user = await userModel
      .findOne({ _id: userId, organizationId })
      .select("-password -__v -createdAt -updatedAt");
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
    console.error("Error in getOrganizationAdminProfile:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    const updatedUser = await userModel
      .findOneAndUpdate({ _id: userId, organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password -__v -createdAt -updatedAt");
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrganizationAdminProfile:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOrganizationInvoiceDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const organization = await organizationModel.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    const invoiceDetails = {
      taxRate: organization.invoiceSettings.taxRate,
      defaultDiscount: organization.invoiceSettings.defaultDiscount,
      invoicePrefix: organization.invoiceSettings.invoicePrefix,
      nextInvoiceNumber: organization.invoiceSettings.nextInvoiceNumber,
    };
    res.status(200).json({
      success: true,
      data: invoiceDetails,
    });
  } catch (error) {
    console.error("Error in getOrganizationInvoiceDetails:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationInvoiceDetails = async (req, res) => {
  try {
    const { taxRate, defaultDiscount, invoicePrefix } = req.body;
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const organization = await organizationModel.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    const updateData = {};
    if (taxRate !== undefined) updateData["invoiceSettings.taxRate"] = taxRate;
    if (defaultDiscount !== undefined)
      updateData["invoiceSettings.defaultDiscount"] = defaultDiscount;
    if (invoicePrefix !== undefined)
      updateData["invoiceSettings.invoicePrefix"] = invoicePrefix;
    await organizationModel.findByIdAndUpdate(organizationId, updateData, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      success: true,
      message: "Invoice details updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrganizationInvoiceDetails:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
export const adminInviteOrganizationUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role; // 👈 Get user role
    const { name, email, role, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (userRole === "admin" && role !== "manager" && role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins can only invite Manager or Staff.",
      });
    }

    if (userRole === "manager" && (role === "admin" || role === "super_admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Managers cannot invite Admin or Super Admin.",
      });
    }

    if (userRole === "staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Staff members cannot invite users.",
      });
    }

    const userExists = await userModel.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new userModel({
      name,
      email,
      role,
      password: hashedPassword,
      organizationId,
      invitedBy: userId,
      isVerified: true,
    });
    await newUser.save();

    queueAccountCreatedEmail(email, name, password);

    res.status(201).json({
      success: true,
      message: "User invited successfully",
    });
  } catch (error) {
    console.error("Error in adminInviteOrganizationUsers:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// controllers/user.controller.js
export const getOrganizationUsers = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    const userId = req.user._id;

    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const allowedSortFields = [
      "name",
      "email",
      "createdAt",
      "isActive",
      "role",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const query = {
      organizationId,
      _id: { $ne: userId },
    };

    if (userRole === "admin" || userRole === "manager") {
      query.role = { $nin: ["admin", "super_admin"] };
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by role
    const allowedRoles = ["admin", "manager", "staff"];
    if (role && allowedRoles.includes(role)) {
      if (userRole === "manager" && role === "admin") {
        return res.status(200).json({
          success: true,
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalUsers: 0,
            limit: Number(limit),
            hasNextPage: false,
            hasPreviousPage: false,
          },
          data: [],
        });
      }
      query.role = role;
    }

    // Filter by active status
    if (isActive === "true") {
      query.isActive = true;
    } else if (isActive === "false") {
      query.isActive = false;
    }

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const limitNumber = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const totalUsers = await userModel.countDocuments(query);

    const users = await userModel
      .find(query)
      .select("-password -tokenVersion -__v -updatedAt")
      .populate("invitedBy", "name email role")
      .sort({
        [sortField]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(limitNumber);

    // Tenant-wide stats for dashboard cards
    const adminCountQuery = { organizationId, role: "admin" };
    const managerCountQuery = { organizationId, role: "manager" };
    const staffCountQuery = { organizationId, role: "staff" };
    const activeCountQuery = { organizationId, isActive: true };

    if (userRole === "manager") {
      adminCountQuery._id = null;
      activeCountQuery.role = { $ne: "admin" };
    }

    const [adminCount, managerCount, staffCount, activeCount] = await Promise.all([
      userModel.countDocuments(adminCountQuery),
      userModel.countDocuments(managerCountQuery),
      userModel.countDocuments(staffCountQuery),
      userModel.countDocuments(activeCountQuery),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
        totalUsers,
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(totalUsers / limitNumber),
        hasPreviousPage: pageNumber > 1,
      },
      stats: {
        adminCount,
        managerCount,
        staffCount,
        activeCount,
      },
      data: users,
    });
  } catch (error) {
    console.error("Error in getOrganizationUsers:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOrganizationUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const loginUserId = req.user._id;
    const userRole = req.user.role;

    if (id === loginUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot view your own profile through this endpoint",
      });
    }

    const user = await userModel
      .findOne({ _id: id, organizationId })
      .select("-password -tokenVersion -__v -updatedAt")
      .populate("invitedBy", "name email role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (userRole === "manager" && user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Managers cannot view admin users.",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in getOrganizationUserById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const { role, isActive } = req.body;
    const loginUserId = req.user._id;
    const userRole = req.user.role;
    if (userRole !== "admin" && userRole !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins and managers can update organization users.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (id === loginUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot update your own profile through this endpoint",
      });
    }

    const targetUser = await userModel.findOne({ _id: id, organizationId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot assign super_admin role.",
      });
    }

    if (userRole === "manager" && targetUser.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Managers cannot update admin users.",
      });
    }

    if (userRole === "manager" && role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Managers cannot assign admin role.",
      });
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await userModel
      .findOneAndUpdate({ _id: id, organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password -tokenVersion -__v -updatedAt");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrganizationUserById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteOrganizationUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can delete users.",
      });
    }

    const targetUser = await userModel.findOne({ _id: id, organizationId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.role === "admin") {
      const adminCount = await userModel.countDocuments({
        organizationId,
        role: "admin",
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last admin user",
        });
      }
    }

    const deletedUser = await userModel.findOneAndDelete({
      _id: id,
      organizationId,
    });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteOrganizationUserById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);

    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalCategories,
      totalSuppliers,
      totalUsers,
      totalManagers,
      totalStaff,
      totalPurchaseOrders,
      pendingPurchaseOrders,
      approvedPurchaseOrders,
      fulfilledPurchaseOrders,
      totalStock,
      lowStockProducts,
      categoryDistribution,
    ] = await Promise.all([
      productModel.countDocuments({ organizationId }),

      productModel.countDocuments({
        organizationId,
        isActive: true,
      }),

      productModel.countDocuments({
        organizationId,
        isActive: false,
      }),

      categoryModel.countDocuments({ organizationId }),

      supplierModel.countDocuments({ organizationId }),

      userModel.countDocuments({ organizationId }),

      userModel.countDocuments({
        organizationId,
        role: "manager",
      }),

      userModel.countDocuments({
        organizationId,
        role: "staff",
      }),

      purchaseOrderModel.countDocuments({
        organizationId,
      }),

      purchaseOrderModel.countDocuments({
        organizationId,
        status: "pending",
      }),

      purchaseOrderModel.countDocuments({
        organizationId,
        status: "approved",
      }),

      purchaseOrderModel.countDocuments({
        organizationId,
        status: "fulfilled",
      }),

      productModel.aggregate([
        {
          $match: { organizationId },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$quantity",
            },
          },
        },
      ]),

      productModel.countDocuments({
        organizationId,
        $expr: {
          $lte: ["$quantity", "$reorderThreshold"],
        },
      }),

      categoryModel.aggregate([
        {
          $match: { organizationId },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "categoryId",
            as: "products",
          },
        },
        {
          $project: {
            _id: 1,
            categoryName: "$name",
            productCount: {
              $size: "$products",
            },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          activeProducts,
          inactiveProducts,
          totalCategories,
          totalSuppliers,
          totalUsers,
          totalManagers,
          totalStaff,
          totalPurchaseOrders,
          pendingPurchaseOrders,
          approvedPurchaseOrders,
          fulfilledPurchaseOrders,
        },
        inventory: {
          totalStock: totalStock[0]?.total || 0,
          lowStockProducts,
        },
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
