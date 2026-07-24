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
import chatLogModel from "../models/chatLog.model.js";

export const getSuperAdminDashboardStats = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      trialOrganizations,
      totalProducts,
      totalCategories,
      totalSuppliers,
      totalUsers,
      organizationsThisMonth,
      subscriptions,
      premiumPlan,
      allOrganizations,
      allInvoices,
      allPurchaseOrders,
    ] = await Promise.all([
      organizationModel.countDocuments(),
      organizationModel.countDocuments({ status: "active" }),
      organizationModel.countDocuments({ status: "suspended" }),
      organizationModel.countDocuments({ status: "trial" }),
      productModel.countDocuments(),
      categoryModel.countDocuments(),
      supplierModel.countDocuments(),
      userModel.countDocuments({ role: { $ne: "super_admin" } }),
      organizationModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      subscriptionModel.find({ status: "active" }).populate("subscriptionPlanId"),
      subscriptionPlanModel.findOne({ name: "premium" }),
      organizationModel.find().select("_id name status createdAt"),
      invoiceModel.find().populate("products.productId"),
      purchaseOrderModel.find(),
    ]);

    // Calculate subscription metrics
    const premiumCount = subscriptions.filter(
      (s) => s.subscriptionPlanId?.name === "premium",
    ).length;
    const freeCount = totalOrganizations - premiumCount;

    // Calculate platform revenue from subscriptions
    let platformRevenue = 0;
    if (premiumPlan) {
      platformRevenue = premiumCount * (premiumPlan.price || 0);
    }

    // Calculate platform cost (sum of all purchase orders)
    const platformCost = allPurchaseOrders.reduce(
      (sum, po) => sum + (po.totalCost || 0),
      0,
    );

    const platformProfit = platformRevenue - platformCost;

    // Calculate invoice metrics
    let totalInvoiceRevenue = 0;
    let totalInvoiceCost = 0;
    let totalInvoiceProfit = 0;

    // Get all products for cost calculation
    const allProducts = await productModel.find().select("costPrice");
    const productCostMap = {};
    allProducts.forEach((p) => {
      productCostMap[p._id.toString()] = p.costPrice || 0;
    });

    for (const invoice of allInvoices) {
      totalInvoiceRevenue += invoice.total || 0;
      for (const item of invoice.products) {
        if (item.productId) {
          const productId = item.productId._id || item.productId;
          const costPrice = productCostMap[productId.toString()] || 0;
          totalInvoiceCost += item.quantity * costPrice;
        }
      }
    }
    totalInvoiceProfit = totalInvoiceRevenue - totalInvoiceCost;

    // Monthly subscription revenue trend (last 6 months) - matching dummy format
    const monthlyRevenueTrend = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthSubscriptions = await subscriptionModel.find({
        status: "active",
        updatedAt: { $gte: monthStart, $lte: monthEnd },
      }).populate("subscriptionPlanId");

      const monthPremiumCount = monthSubscriptions.filter(
        (s) => s.subscriptionPlanId?.name === "premium",
      ).length;
      const monthRevenue = monthPremiumCount * (premiumPlan?.price || 0);

      monthlyRevenueTrend.push({
        month: monthNames[month.getMonth()],
        revenue: monthRevenue,
        premiumCount: monthPremiumCount,
      });
    }

    // Organizations by status (matching dummy format - no trial field)
    const organizationsByStatus = {
      active: activeOrganizations,
      suspended: suspendedOrganizations,
    };

    // Calculate growth percentage
    const lastMonthStart = new Date(startOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const organizationsLastMonth = await organizationModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: startOfMonth },
    });

    const growthPercentage =
      organizationsLastMonth > 0
        ? (
          ((organizationsThisMonth - organizationsLastMonth) /
            organizationsLastMonth) *
          100
        ).toFixed(1)
        : organizationsThisMonth > 0
          ? 100
          : 0;

    const switchedToPremiumThisMonth = await subscriptionModel.countDocuments({
      status: "active",
      subscriptionPlanId: premiumPlan?._id,
      updatedAt: { $gte: startOfMonth },
    });

    // Format recent organizations - matching dummy format with date string
    const recentOrganizations = allOrganizations
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((org) => ({
        _id: org._id,
        name: org.name,
        status: org.status,
        createdAt: org.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      }));

    res.status(200).json({
      success: true,
      data: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          suspended: suspendedOrganizations,
          createdThisMonth: organizationsThisMonth,
          growthPercentage: parseFloat(growthPercentage),
          byStatus: organizationsByStatus,
        },
        platformTotals: {
          totalProducts,
          totalCategories,
          totalSuppliers,
          totalUsers,
        },
        subscriptions: {
          freeCount,
          premiumCount,
          switchedToPremiumThisMonth,
          monthlySubscriptionRevenue: platformRevenue,
          monthlyRevenueTrend,
        },
        platformProfit: {
          revenue: platformRevenue,
          cost: platformCost,
          profit: platformProfit,
          profitMargin: platformRevenue > 0
            ? parseFloat(((platformProfit / platformRevenue) * 100).toFixed(2))
            : 0,
          invoiceRevenue: totalInvoiceRevenue,
          invoiceCost: totalInvoiceCost,
          invoiceProfit: totalInvoiceProfit,
          invoiceProfitMargin: totalInvoiceRevenue > 0
            ? parseFloat(((totalInvoiceProfit / totalInvoiceRevenue) * 100).toFixed(2))
            : 0,
        },
        recentOrganizations,
      },
    });
  } catch (error) {
    console.error("Error in getSuperAdminDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};


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
    if (status && status !== "all") {
      query.status = status;
    }

    const andConditions = [];

    if (subscriptionPlan && subscriptionPlan !== "all") {
      const planDoc = await subscriptionPlanModel.findOne({ name: subscriptionPlan });
      if (planDoc) {
        andConditions.push({ subscriptionPlan: planDoc._id });
      } else if (subscriptionPlan === "free") {
        const freePlanDoc = await subscriptionPlanModel.findOne({ name: "free" });
        const freeConditions = [
          { subscriptionPlan: null },
          { subscriptionPlan: { $exists: false } }
        ];
        if (freePlanDoc) {
          freeConditions.push({ subscriptionPlan: freePlanDoc._id });
        }
        andConditions.push({ $or: freeConditions });
      } else {
        andConditions.push({ subscriptionPlan: new mongoose.Types.ObjectId() });
      }
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { contactEmail: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
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
      usersByOrganization[orgId].push({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        imageUrl: user.imageUrl || "",
      });
    });

    // Format data to match dummy structure - simplified organizationData
    const formattedData = organizations.map((org) => ({
      organizationData: {
        _id: org._id,
        name: org.name,
        contactEmail: org.contactEmail,
        phone: org.phone,
        status: org.status,
        subscriptionPlan: org.subscriptionPlan ? { name: org.subscriptionPlan.name || "free" } : { name: "free" },
        createdAt: org.createdAt,
      },
      organizationUsersData: usersByOrganization[org._id.toString()] || [],
    }));

    // Calculate aggregate stats
    const allOrganizations = await organizationModel
      .find()
      .select("status subscriptionPlan")
      .lean();
    const allOrgIds = allOrganizations.map((org) => org._id);

    const allUsers = await userModel
      .find()
      .select("organizationId role")
      .lean();
    const allSubscriptions = await subscriptionModel
      .find({ organizationId: { $in: allOrgIds } })
      .populate("subscriptionPlanId", "name")
      .lean();

    const allPlans = await subscriptionPlanModel.find().lean();
    const planMap = {};
    allPlans.forEach((p) => {
      planMap[p._id.toString()] = p.name;
    });

    let totalOrganizationsCount = allOrganizations.length;
    let activeOrganizations = 0;
    let suspendedOrganizations = 0;
    let premiumOrganizations = 0;
    let freeOrganizations = 0;

    const subMap = {};
    allSubscriptions.forEach((sub) => {
      const orgId = sub.organizationId.toString();
      subMap[orgId] = sub;
    });

    allOrganizations.forEach((org) => {
      if (org.status === "active") activeOrganizations++;
      if (org.status === "suspended") suspendedOrganizations++;

      const orgId = org._id.toString();
      const sub = subMap[orgId];
      let planName = "free";

      if (sub && sub.subscriptionPlanId) {
        planName = sub.subscriptionPlanId.name;
      } else if (org.subscriptionPlan) {
        const planId = org.subscriptionPlan.toString();
        planName = planMap[planId] || "free";
      }

      if (planName === "premium") premiumOrganizations++;
      else if (planName === "free") freeOrganizations++;
    });

    const totalUsersCount = allUsers.length;

    // Calculate growth metrics (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const activeThisMonth = await organizationModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activePreviousMonth = await organizationModel.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });

    const totalGrowth =
      activePreviousMonth > 0
        ? ((activeThisMonth - activePreviousMonth) / activePreviousMonth) * 100
        : 0;

    const activeGrowth =
      activePreviousMonth > 0
        ? ((activeThisMonth - activePreviousMonth) / activePreviousMonth) * 100
        : 0;

    // Premium growth (last 30 days vs previous 30 days)
    const premiumThisMonth = await subscriptionModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      status: "active",
    });

    const premiumPreviousMonth = await subscriptionModel.countDocuments({
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      status: "active",
    });

    const premiumGrowth =
      premiumPreviousMonth > 0
        ? ((premiumThisMonth - premiumPreviousMonth) / premiumPreviousMonth) *
        100
        : 0;

    // Free growth
    const freeThisMonth = activeThisMonth - premiumThisMonth;
    const freePreviousMonth = activePreviousMonth - premiumPreviousMonth;
    const freeGrowth =
      freePreviousMonth > 0
        ? ((freeThisMonth - freePreviousMonth) / freePreviousMonth) * 100
        : 0;

    const activePercentage =
      totalOrganizationsCount > 0
        ? (activeOrganizations / totalOrganizationsCount) * 100
        : 0;

    const aggregateStats = {
      totalOrganizations: totalOrganizationsCount,
      activeOrganizations,
      suspendedOrganizations,
      premiumOrganizations,
      freeOrganizations,
      totalUsers: totalUsersCount,
      totalGrowth: Math.round(totalGrowth * 100) / 100,
      activeGrowth: Math.round(activeGrowth * 100) / 100,
      premiumGrowth: Math.round(premiumGrowth * 100) / 100,
      freeGrowth: Math.round(freeGrowth * 100) / 100,
      activeThisMonth,
      activePercentage: Math.round(activePercentage * 100) / 100,
    };

    res.status(200).json({
      success: true,
      data: formattedData,
      aggregateStats,
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
    const subscription = await subscriptionModel
      .findOne({ organizationId: id })
      .populate("subscriptionPlanId", "-__v -updatedAt")
      .lean();

    // Prepare subscription data matching dummy format
    let subscriptionData = {
      subscriptionRecord: null,
      subscriptionPlan: null,
      subscriptionDetails: {
        isActive: false,
        isPastDue: false,
        isCanceled: false,
        isIncomplete: false,
        daysUntilExpiry: null,
        isExpiringSoon: false,
      },
    };

    if (subscription) {
      subscriptionData.subscriptionRecord = {
        id: subscription._id,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      };

      if (subscription.subscriptionPlanId) {
        subscriptionData.subscriptionPlan = {
          id: subscription.subscriptionPlanId._id,
          name: subscription.subscriptionPlanId.name,
          price: subscription.subscriptionPlanId.price,
          billingCycle: subscription.subscriptionPlanId.billingCycle,
          aiFeatures: subscription.subscriptionPlanId.aiFeatures,
          stripePriceId: subscription.subscriptionPlanId.stripePriceId,
        };
      }

      const daysUntilExpiry = subscription.currentPeriodEnd
        ? Math.ceil(
          (new Date(subscription.currentPeriodEnd) - new Date()) /
          (1000 * 60 * 60 * 24),
        )
        : null;

      subscriptionData.subscriptionDetails = {
        isActive: subscription.status === "active",
        isPastDue: subscription.status === "past_due",
        isCanceled: subscription.status === "canceled",
        isIncomplete: subscription.status === "incomplete",
        daysUntilExpiry: daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 7,
      };
    } else if (organization.subscriptionPlan) {
      // If no subscription record but organization has a plan reference
      subscriptionData.subscriptionPlan = {
        id: organization.subscriptionPlan._id,
        name: organization.subscriptionPlan.name || "free",
        price: organization.subscriptionPlan.price || 0,
        billingCycle: organization.subscriptionPlan.billingCycle || "monthly",
        aiFeatures: organization.subscriptionPlan.aiFeatures || false,
        stripePriceId: organization.subscriptionPlan.stripePriceId || "",
      };
    }

    const formattedAdminUser = adminUser ? {
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      imageUrl: adminUser.imageUrl || "",
    } : null;

    const formattedAllUsers = allUsers ? allUsers.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      imageUrl: user.imageUrl || "",
    })) : [];

    res.status(200).json({
      success: true,
      data: {
        organizationData: {
          _id: organization._id,
          name: organization.name,
          contactEmail: organization.contactEmail,
          phone: organization.phone,
          status: organization.status,
          subscriptionPlan: organization.subscriptionPlan ? {
            name: organization.subscriptionPlan.name || "free",
          } : { name: "free" },
          createdAt: organization.createdAt,
        },
        adminUser: formattedAdminUser,
        allUsers: formattedAllUsers,
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
      subscriptionModel.deleteMany({ organizationId: id }),
      chatLogModel.deleteMany({ organizationId: id }),
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
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const organizations = await organizationModel
      .find(query)
      .select(
        "_id name contactEmail phone status logoUrl createdAt subscriptionPlan",
      )
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
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
    if (plan && plan !== "all") {
      results = results.filter((item) => item.planName === plan);
    }

    const totalResults = results.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(skip, skip + limitNum);

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
      data: paginatedResults,
      summary,
      total: totalResults,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalResults / limitNum) || 1,
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
      .select("name contactEmail phone status logoUrl invoiceSettings subscriptionPlan")
      .lean();

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Get current plan details if organization has one
    let currentPlan = null;
    if (organization.subscriptionPlan) {
      currentPlan = await subscriptionPlanModel
        .findById(organization.subscriptionPlan)
        .select("name price billingCycle aiFeatures stripePriceId")
        .lean();
    }

    // Get subscription record
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

    // Build subscription object
    let subscriptionData;
    if (subscriptionRecord) {
      subscriptionData = {
        subscriptionPlanId: subscriptionRecord.subscriptionPlanId,
        stripeCustomerId: subscriptionRecord.stripeCustomerId,
        stripeSubscriptionId: subscriptionRecord.stripeSubscriptionId,
        status: subscriptionRecord.status,
        currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
        createdAt: subscriptionRecord.createdAt,
        updatedAt: subscriptionRecord.updatedAt,
      };
    } else {
      // No subscription record found
      subscriptionData = {
        subscriptionPlanId: currentPlan || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        status: "inactive",
        currentPeriodEnd: null,
        createdAt: organization.createdAt || new Date(),
        updatedAt: organization.createdAt || new Date(),
      };
    }

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
      subscription: subscriptionData,
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

export const getSuperAdminProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select("name email imageUrl role");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6B46C1&color=fff&size=128`,
      },
    });
  } catch (error) {
    console.error("Error in getSuperAdminProfile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email already exists
      const existingUser = await userModel.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use",
        });
      }
      updateData.email = email;
    }

    if (req.file) {
      updateData.imageUrl = req.file.path;
    } else if (req.body.imageUrl !== undefined) {
      updateData.imageUrl = req.body.imageUrl;
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("name email imageUrl role");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        imageUrl: updatedUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedUser.name)}&background=6B46C1&color=fff&size=128`,
      },
    });
  } catch (error) {
    console.error("Error in updateSuperAdminProfile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
