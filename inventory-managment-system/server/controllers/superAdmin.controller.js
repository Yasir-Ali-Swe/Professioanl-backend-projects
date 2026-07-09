import organizationModel from "../models/organization.model.js";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import supplierModel from "../models/supplier.model.js";
import stockLogModel from "../models/stockLog.model.js";
import invoiceModel from "../models/invoice.model.js";
import purchaseOrderModel from "../models/purchaseOrder.model.js";
import aiReorderModel from "../models/reorder.suggestion.model.js";
import aiProductForecastModel from "../models/product.forcast.model.js";
import aiInsightModel from "../models/insights.model.js";
import aiAnomalyModel from "../models/anomaly.model.js";
import mongoose from "mongoose";
import subscriptionPlanModel from "../models/organization.subscriptionPlan.js";
import subscriptionModel from "../models/subscription.model.js";

export const getAllOrganizations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      subscriptionPlan,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (subscriptionPlan) {
      query.subscriptionPlan = subscriptionPlan;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalOrganizations = await organizationModel.countDocuments(query);

    const organizations = await organizationModel
      .find(query)
      .select("-__v -updatedAt")
      .populate("subscriptionPlan", "-__v -updatedAt")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const organizationIds = organizations.map((org) => org._id.toString());

    const users = await userModel
      .find({
        $or: [
          {
            organizationId: {
              $in: organizationIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
          { organizationId: { $in: organizationIds } },
        ],
      })
      .select("name email role isActive imageUrl organizationId")
      .lean();

    const usersByOrganization = {};
    users.forEach((user) => {
      if (!user.organizationId) return;
      const orgId = user.organizationId.toString();
      if (!usersByOrganization[orgId]) {
        usersByOrganization[orgId] = [];
      }
      usersByOrganization[orgId].push(user);
    });

    const formattedData = organizations.map((org) => ({
      organizationData: org,
      organizationUsersData: usersByOrganization[org._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      totalNumberOfOrganizations: totalOrganizations,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalOrganizations / Number(limit)),
    });
  } catch (error) {
    console.error("Error in getAllOrganizations:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await organizationModel
      .findById(id)
      .select("-__v -updatedAt")
      .populate("subscriptionPlan", "-__v -updatedAt")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const adminUser = await userModel
      .findOne({ organizationId: id, role: "admin" })
      .select("name email role isActive imageUrl")
      .lean();

    const allUsers = await userModel
      .find({ organizationId: id })
      .select("name email role isActive imageUrl")
      .lean();

    const userCount = allUsers.length;

    const productCount = await productModel.countDocuments({
      organizationId: id,
    });

    const supplierCount = await supplierModel.countDocuments({
      organizationId: id,
    });

    const categoryCount = await categoryModel.countDocuments({
      organizationId: id,
    });

    res.status(200).json({
      success: true,
      data: {
        organizationData: organization,
        adminUser: adminUser || null,
        allUsers: allUsers || [],
        organizationUsersCount: userCount,
        organizationProductsCount: productCount,
        organizationSuppliersCount: supplierCount,
        organizationCategoriesCount: categoryCount,
      },
    });
  } catch (error) {
    console.error("Error in getOrganizationById:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const organization = await organizationModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Organization status updated successfully",
    });
  } catch (error) {
    console.error("Error in updateOrganizationStatus:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    await Promise.all([
      userModel.deleteMany({ organizationId: id }),
      productModel.deleteMany({ organizationId: id }),
      categoryModel.deleteMany({ organizationId: id }),
      supplierModel.deleteMany({ organizationId: id }),
      subscriptionPlanModel.deleteMany({ organizationId: id }),
      stockLogModel.deleteMany({ organizationId: id }),
      invoiceModel.deleteMany({ organizationId: id }),
      purchaseOrderModel.deleteMany({ organizationId: id }),
      aiReorderModel.deleteMany({ organizationId: id }),
      aiProductForecastModel.deleteMany({ organizationId: id }),
      aiInsightModel.deleteMany({ organizationId: id }),
      aiAnomalyModel.deleteMany({ organizationId: id }),
    ]);
    const organization = await organizationModel.findByIdAndDelete(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteOrganization:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const totalOrganizations = await organizationModel.countDocuments();
    const activeOrganizations = await organizationModel.countDocuments({
      status: "active",
    });
    const suspendedOrganizations = await organizationModel.countDocuments({
      status: "suspended",
    });
    const trialOrganizations = await organizationModel.countDocuments({
      status: "trial",
    });
    const totalProducts = await productModel.countDocuments();
    const totalUsers = await userModel.countDocuments();
    const userByRole = await userModel.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const thisMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const newSignupsThisMonth = await organizationModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });
    res.status(200).json({
      success: true,
      data: {
        totalOrganizations: totalOrganizations,
        activeOrganizations: activeOrganizations,
        suspendedOrganizations: suspendedOrganizations,
        trialOrganizations: trialOrganizations,
        totalProducts: totalProducts,
        totalUsers: totalUsers,
        userByRole: userByRole,
        newSignupsThisMonth: newSignupsThisMonth,
      },
    });
  } catch (error) {
    console.error("Error in getAnalytics:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getOrganizationSubscriptionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const organization = await organizationModel
      .findById(id)
      .select("name contactEmail phone status")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const currentPlan = await subscriptionPlanModel
      .findById(organization.subscriptionPlan)
      .select("name price billingCycle aiFeatures")
      .lean();

    const subscriptionRecord = await subscriptionModel
      .findOne({ organizationId: id })
      .populate("subscriptionPlanId", "name price billingCycle aiFeatures")
      .lean();

    const response = {
      organizationId: organization._id,
      organizationName: organization.name,
      organizationEmail: organization.contactEmail,
      organizationPhone: organization.phone,
      organizationStatus: organization.status,
      currentPlan: currentPlan || null,
      subscriptionStatus: subscriptionRecord?.status || "inactive",
      currentPeriodEnd: subscriptionRecord?.currentPeriodEnd || null,
      subscriptionPlanDetails: subscriptionRecord?.subscriptionPlanId || null,
      stripeCustomerId: subscriptionRecord?.stripeCustomerId || null,
      stripeSubscriptionId: subscriptionRecord?.stripeSubscriptionId || null,
      createdAt: subscriptionRecord?.createdAt || null,
      updatedAt: subscriptionRecord?.updatedAt || null,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(
      "Error in getOrganizationSubscriptionDetails:",
      error.message,
    );
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateOrganizationSubscriptionPlan = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { subscriptionPlanId } = req.body;
    const organization = await organizationModel
      .findByIdAndUpdate(
        organizationId,
        { subscriptionPlan: subscriptionPlanId },
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
      data: organization,
    });
  } catch (error) {
    console.error(
      "Error in updateOrganizationSubscriptionPlan:",
      error.message,
    );
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
