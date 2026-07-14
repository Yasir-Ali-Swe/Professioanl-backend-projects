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

    // Get subscription data
    const subscription = await mongoose
      .model("Subscription")
      .findOne({ organizationId: id })
      .populate("subscriptionPlanId", "-__v -updatedAt")
      .lean();

    // Prepare subscription data
    let subscriptionData = null;
    if (subscription) {
      subscriptionData = {
        subscriptionRecord: {
          id: subscription._id,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        },
        subscriptionPlan: subscription.subscriptionPlanId
          ? {
              id: subscription.subscriptionPlanId._id,
              name: subscription.subscriptionPlanId.name,
              price: subscription.subscriptionPlanId.price,
              billingCycle: subscription.subscriptionPlanId.billingCycle,
              aiFeatures: subscription.subscriptionPlanId.aiFeatures,
              stripePriceId: subscription.subscriptionPlanId.stripePriceId,
            }
          : null,
        // Additional subscription metadata
        subscriptionDetails: {
          isActive: subscription.status === "active",
          isPastDue: subscription.status === "past_due",
          isCanceled: subscription.status === "canceled",
          isIncomplete: subscription.status === "incomplete",
          daysUntilExpiry: subscription.currentPeriodEnd
            ? Math.ceil(
                (new Date(subscription.currentPeriodEnd) - new Date()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
          isExpiringSoon: subscription.currentPeriodEnd
            ? Math.ceil(
                (new Date(subscription.currentPeriodEnd) - new Date()) /
                  (1000 * 60 * 60 * 24),
              ) <= 7
            : false,
        },
      };
    } else {
      // If no subscription record exists, check if organization has a subscriptionPlan
      subscriptionData = {
        subscriptionRecord: null,
        subscriptionPlan: organization.subscriptionPlan || null,
        subscriptionDetails: {
          isActive: false,
          isPastDue: false,
          isCanceled: false,
          isIncomplete: false,
          daysUntilExpiry: null,
          isExpiringSoon: false,
          hasNoSubscription: true,
        },
      };
    }

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
        subscription: subscriptionData,
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
    const thisMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    // Run all queries in parallel for better performance
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      trialOrganizations,
      totalProducts,
      totalUsers,
      userByRole,
      newSignupsThisMonth,
      organizationGrowthTrend,
      subscriptionDistribution,
      premiumSwitchesThisMonth,
      revenueTrend,
      canceledThisMonth,
      suspendedThisMonth,
      totalCategories,
      totalSuppliers,
      topOrganizations,
    ] = await Promise.all([
      // Existing queries
      organizationModel.countDocuments(),
      organizationModel.countDocuments({ status: "active" }),
      organizationModel.countDocuments({ status: "suspended" }),
      organizationModel.countDocuments({ status: "trial" }),
      productModel.countDocuments(),
      userModel.countDocuments(),
      userModel.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      organizationModel.countDocuments({
        createdAt: { $gte: thisMonthStart },
      }),

      // 1. Organization Growth Trend - Last 12 months
      organizationModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: "$_id.year" },
                "-",
                {
                  $cond: {
                    if: { $lt: ["$_id.month", 10] },
                    then: { $concat: ["0", { $toString: "$_id.month" }] },
                    else: { $toString: "$_id.month" },
                  },
                },
              ],
            },
            count: 1,
            _id: 0,
          },
        },
      ]),

      // 2. Subscription Plan Distribution
      subscriptionModel.aggregate([
        { $match: { status: "active" } },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "subscriptionPlanId",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: "$plan.name",
            count: { $sum: 1 },
          },
        },
      ]),

      // Premium switches this month (organizations that switched to premium in current month)
      subscriptionModel.aggregate([
        {
          $match: {
            status: "active",
            updatedAt: { $gte: thisMonthStart },
          },
        },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "subscriptionPlanId",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        { $match: { "plan.name": "premium" } },
        { $count: "count" },
      ]),

      // 3. Platform Revenue Trend - Last 12 months
      // Note: This approximates revenue based on active subscriptions at month end
      // For accurate historical revenue, you would need to store monthly snapshots
      subscriptionModel.aggregate([
        {
          $match: {
            status: "active",
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 11)),
            },
          },
        },
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "subscriptionPlanId",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            activeSubscriptions: { $sum: 1 },
            planPrice: { $first: "$plan.price" },
          },
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 },
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: "$_id.year" },
                "-",
                {
                  $cond: {
                    if: { $lt: ["$_id.month", 10] },
                    then: { $concat: ["0", { $toString: "$_id.month" }] },
                    else: { $toString: "$_id.month" },
                  },
                },
              ],
            },
            revenue: { $multiply: ["$activeSubscriptions", "$planPrice"] },
            _id: 0,
          },
        },
      ]),

      // 4. Churn / Downgrade Data - This month
      // Canceled this month
      subscriptionModel.countDocuments({
        status: "canceled",
        updatedAt: { $gte: thisMonthStart },
      }),

      // Suspended this month (using updatedAt as there's no dedicated suspendedAt field)
      organizationModel.countDocuments({
        status: "suspended",
        updatedAt: { $gte: thisMonthStart },
      }),

      // 5. Platform Totals
      categoryModel.countDocuments(),
      supplierModel.countDocuments(),

      // 7. Top Organizations by Activity - Top 5 by product count
      productModel.aggregate([
        {
          $group: {
            _id: "$organizationId",
            productCount: { $sum: 1 },
          },
        },
        { $sort: { productCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "organizations",
            localField: "_id",
            foreignField: "_id",
            as: "organization",
          },
        },
        { $unwind: "$organization" },
        {
          $project: {
            organizationId: "$_id",
            organizationName: "$organization.name",
            productCount: 1,
            _id: 0,
          },
        },
      ]),
    ]);

    // 6. Average Organization Size
    const avgProductsPerOrg =
      totalOrganizations > 0
        ? Math.round((totalProducts / totalOrganizations) * 100) / 100
        : 0;

    const avgUsersPerOrg =
      totalOrganizations > 0
        ? Math.round((totalUsers / totalOrganizations) * 100) / 100
        : 0;

    // Format subscription distribution
    const subscriptionDistributionMap = {};
    subscriptionDistribution.forEach((item) => {
      subscriptionDistributionMap[item._id] = item.count;
    });

    const premiumSwitchesCount =
      premiumSwitchesThisMonth.length > 0
        ? premiumSwitchesThisMonth[0].count
        : 0;

    res.status(200).json({
      success: true,
      data: {
        // Existing fields
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        trialOrganizations,
        totalProducts,
        totalUsers,
        userByRole,
        newSignupsThisMonth,

        // 1. Organization Growth Trend
        organizationGrowthTrend,

        // 2. Subscription Plan Distribution
        subscriptionDistribution: {
          free: subscriptionDistributionMap.free || 0,
          premium: subscriptionDistributionMap.premium || 0,
          premiumSwitchesThisMonth: premiumSwitchesCount,
        },

        // 3. Platform Revenue Trend
        revenueTrend,

        // 4. Churn / Downgrade Data (this month)
        churnData: {
          canceledThisMonth,
          suspendedThisMonth,
        },

        // 5. Platform Totals (secondary stats)
        platformTotals: {
          totalCategories,
          totalSuppliers,
        },

        // 6. Average Organization Size
        averageOrganizationSize: {
          avgProductsPerOrg,
          avgUsersPerOrg,
        },

        // 7. Top Organizations by Activity
        topOrganizations,
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
export const getAllOrganizationSubscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      plan,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalOrganizations = await organizationModel.countDocuments(query);

    const organizations = await organizationModel
      .find(query)
      .select(
        "_id name contactEmail phone status logoUrl createdAt subscriptionPlan",
      )
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const organizationIds = organizations.map((org) => org._id);

    // Get subscription records for these organizations
    const subscriptions = await subscriptionModel
      .find({
        organizationId: { $in: organizationIds },
      })
      .populate("subscriptionPlanId", "name price billingCycle aiFeatures")
      .lean();

    // Get all subscription plans for reference
    const allPlans = await subscriptionPlanModel.find().lean();
    const planMap = {};
    allPlans.forEach((p) => {
      planMap[p._id.toString()] = p.name;
    });

    // Get ALL subscriptions for summary (not just paginated ones)
    const allSubscriptions = await subscriptionModel
      .find({
        organizationId: { $in: organizationIds },
      })
      .populate("subscriptionPlanId", "name price")
      .lean();

    // Create a map of organizationId -> subscription
    const subscriptionMap = {};
    subscriptions.forEach((sub) => {
      const orgId = sub.organizationId.toString();
      subscriptionMap[orgId] = sub;
    });

    // Build response with left join style
    let results = organizations.map((org) => {
      const orgId = org._id.toString();
      const sub = subscriptionMap[orgId];

      let planName = "free";
      let subscriptionStatus = "inactive";
      let currentPeriodEnd = null;
      let subscriptionPlanDetails = null;

      if (sub) {
        subscriptionStatus = sub.status;
        currentPeriodEnd = sub.currentPeriodEnd;
        subscriptionPlanDetails = sub.subscriptionPlanId;

        if (sub.subscriptionPlanId) {
          planName = sub.subscriptionPlanId.name;
        }
      } else {
        // If no subscription record, check if organization has a plan directly
        if (org.subscriptionPlan) {
          const planId = org.subscriptionPlan.toString();
          planName = planMap[planId] || "free";
        }
      }

      return {
        organizationId: org._id,
        organizationName: org.name,
        contactEmail: org.contactEmail,
        phone: org.phone,
        organizationStatus: org.status,
        logoUrl: org.logoUrl,
        planName,
        subscriptionStatus,
        currentPeriodEnd,
        subscriptionPlanDetails,
        createdAt: org.createdAt,
      };
    });

    // Filter by plan if provided
    if (plan) {
      results = results.filter((item) => item.planName === plan);
    }

    const totalResults = results.length;

    // Calculate summary statistics
    // Get all organizations for summary (not just paginated)
    const allOrgs = await organizationModel
      .find()
      .select("_id status subscriptionPlan")
      .lean();
    const allOrgIds = allOrgs.map((org) => org._id);

    const allSubs = await subscriptionModel
      .find({
        organizationId: { $in: allOrgIds },
      })
      .populate("subscriptionPlanId", "name price")
      .lean();

    const allPlansMap = {};
    allPlans.forEach((p) => {
      allPlansMap[p._id.toString()] = p;
    });

    let freeCount = 0;
    let premiumCount = 0;
    let activeSubscriptions = 0;
    let pastDueSubscriptions = 0;
    let platformRevenue = 0;

    // Create subscription map for all orgs
    const allSubMap = {};
    allSubs.forEach((sub) => {
      const orgId = sub.organizationId.toString();
      allSubMap[orgId] = sub;
    });

    allOrgs.forEach((org) => {
      const orgId = org._id.toString();
      const sub = allSubMap[orgId];

      let planName = "free";

      if (sub && sub.subscriptionPlanId) {
        planName = sub.subscriptionPlanId.name;

        // Count subscription statuses
        if (sub.status === "active") {
          activeSubscriptions++;
          // Calculate revenue for active premium subscriptions
          if (planName === "premium" && sub.subscriptionPlanId.price) {
            platformRevenue += sub.subscriptionPlanId.price;
          }
        } else if (sub.status === "past_due") {
          pastDueSubscriptions++;
        }
      } else if (org.subscriptionPlan) {
        const planId = org.subscriptionPlan.toString();
        planName = allPlansMap[planId]?.name || "free";
      }

      if (planName === "free") {
        freeCount++;
      } else if (planName === "premium") {
        premiumCount++;
      }
    });

    const summary = {
      totalOrganizations: allOrgs.length,
      freeCount,
      premiumCount,
      activeSubscriptions,
      pastDueSubscriptions,
      platformRevenue: Math.round(platformRevenue * 100) / 100,
    };

    res.status(200).json({
      success: true,
      data: results,
      summary,
      total: totalResults,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalResults / Number(limit)),
    });
  } catch (error) {
    console.error("Error in getAllOrganizationSubscriptions:", error.message);
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
      .select("name contactEmail phone status logoUrl invoiceSettings")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const currentPlan = await subscriptionPlanModel
      .findById(organization.subscriptionPlan)
      .select("name price billingCycle aiFeatures stripePriceId")
      .lean();

    const subscriptionRecord = await subscriptionModel
      .findOne({ organizationId: id })
      .populate(
        "subscriptionPlanId",
        "name price billingCycle aiFeatures stripePriceId",
      )
      .lean();

    // Get all available plans for the dropdown
    const availablePlans = await subscriptionPlanModel
      .find()
      .select("_id name price billingCycle aiFeatures")
      .lean();

    const response = {
      organization: {
        _id: organization._id,
        name: organization.name,
        contactEmail: organization.contactEmail,
        phone: organization.phone,
        status: organization.status,
        logoUrl: organization.logoUrl,
        invoiceSettings: organization.invoiceSettings,
      },
      currentPlan: currentPlan || null,
      subscription: subscriptionRecord
        ? {
            subscriptionPlanId: subscriptionRecord.subscriptionPlanId,
            stripeCustomerId: subscriptionRecord.stripeCustomerId,
            stripeSubscriptionId: subscriptionRecord.stripeSubscriptionId,
            status: subscriptionRecord.status,
            currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
            createdAt: subscriptionRecord.createdAt,
            updatedAt: subscriptionRecord.updatedAt,
          }
        : null,
      availablePlans,
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
    const { id } = req.params;
    const { subscriptionPlanId } = req.body;

    if (!subscriptionPlanId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionPlanId is required",
      });
    }

    // Verify the plan exists
    const plan = await subscriptionPlanModel.findById(subscriptionPlanId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Verify the organization exists
    const organization = await organizationModel.findById(id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Update Organization.subscriptionPlan
    const updatedOrganization = await organizationModel
      .findByIdAndUpdate(
        id,
        { subscriptionPlan: subscriptionPlanId },
        { new: true },
      )
      .populate("subscriptionPlan", "name price billingCycle aiFeatures")
      .lean();

    // Upsert Subscription record
    const subscriptionRecord = await subscriptionModel
      .findOneAndUpdate(
        { organizationId: id },
        {
          organizationId: id,
          subscriptionPlanId: subscriptionPlanId,
          status: "active",
          // Keep existing Stripe IDs if they exist
          $setOnInsert: {
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .populate("subscriptionPlanId", "name price billingCycle aiFeatures");

    res.status(200).json({
      success: true,
      message: "Organization subscription updated successfully",
      data: {
        organization: updatedOrganization,
        subscription: subscriptionRecord,
      },
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
