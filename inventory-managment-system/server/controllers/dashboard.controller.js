// controllers/dashboard.controller.js
import Organization from "../models/organization.model.js";
import SubscriptionPlan from "../models/organization.subscriptionPlan.js";
import Subscription from "../models/subscription.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Supplier from "../models/supplier.model.js";
import User from "../models/user.model.js";
import StockLog from "../models/stockLog.model.js";
import Invoice from "../models/invoice.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";

// ==================== SUPER ADMIN DASHBOARD ====================
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
      Organization.countDocuments(),
      Organization.countDocuments({ status: "active" }),
      Organization.countDocuments({ status: "suspended" }),
      Organization.countDocuments({ status: "trial" }),
      Product.countDocuments(),
      Category.countDocuments(),
      Supplier.countDocuments(),
      User.countDocuments({ role: { $ne: "super_admin" } }),
      Organization.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Subscription.find({ status: "active" }).populate("subscriptionPlanId"),
      SubscriptionPlan.findOne({ name: "premium" }),
      Organization.find().select("_id name status createdAt"),
      Invoice.find().populate("products.productId"),
      PurchaseOrder.find(),
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
    const allProducts = await Product.find().select("costPrice");
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

      const monthSubscriptions = await Subscription.find({
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
    const organizationsLastMonth = await Organization.countDocuments({
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

    const switchedToPremiumThisMonth = await Subscription.countDocuments({
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

// ==================== SALES TRENDS ====================
export const getSalesTrends = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { period = "daily", startDate, endDate } = req.query;

    let dateFormat;
    let matchStage = {
      organizationId,
      status: "paid",
    };

    // Date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Group by period
    if (period === "weekly") {
      dateFormat = { $week: "$createdAt" };
    } else if (period === "monthly") {
      dateFormat = { $month: "$createdAt" };
    } else if (period === "yearly") {
      dateFormat = { $year: "$createdAt" };
    } else {
      dateFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    }

    const trends = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateFormat,
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 },
          totalTax: { $sum: "$tax" },
          totalDiscount: { $sum: "$discount" },
          averageOrderValue: { $avg: "$total" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Calculate summary
    const summary = {
      totalSales: trends.reduce((sum, t) => sum + t.totalSales, 0),
      totalOrders: trends.reduce((sum, t) => sum + t.orderCount, 0),
      averageOrderValue:
        trends.length > 0
          ? trends.reduce((sum, t) => sum + t.averageOrderValue, 0) /
          trends.length
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        trends,
        summary,
        period,
      },
    });
  } catch (error) {
    console.error("Error in getSalesTrends:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== STOCK LEVELS REPORT ====================
export const getStockLevelsReport = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { status, categoryId } = req.query;

    const matchStage = { organizationId };

    if (status === "low") {
      matchStage.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
    } else if (status === "out") {
      matchStage.quantity = 0;
    } else if (status === "active") {
      matchStage.isActive = true;
    }

    if (categoryId) {
      matchStage.categoryId = categoryId;
    }

    const products = await Product.find(matchStage)
      .select(
        "name sku quantity reorderThreshold unit costPrice sellingPrice isActive imageUrl",
      )
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name contactPerson phone email")
      .sort({ quantity: 1 })
      .lean();

    // Calculate summary statistics
    const totalValue = products.reduce(
      (sum, p) => sum + (p.quantity * p.costPrice || 0),
      0,
    );
    const totalPotentialRevenue = products.reduce(
      (sum, p) => sum + (p.quantity * p.sellingPrice || 0),
      0,
    );
    const lowStockCount = products.filter(
      (p) => p.quantity <= p.reorderThreshold,
    ).length;
    const outOfStockCount = products.filter((p) => p.quantity === 0).length;
    const activeCount = products.filter((p) => p.isActive).length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalValue,
          totalPotentialRevenue,
          lowStockCount,
          outOfStockCount,
          activeCount,
        },
        products,
      },
    });
  } catch (error) {
    console.error("Error in getStockLevelsReport:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== FINANCIAL REPORT ====================
export const getFinancialReport = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const invoiceFilter = { organizationId, status: "paid" };
    const poFilter = { organizationId, status: "fulfilled" };

    if (startDate || endDate) {
      invoiceFilter.createdAt = dateFilter;
      poFilter.createdAt = dateFilter;
    }

    const [invoices, purchaseOrders, allProducts] = await Promise.all([
      Invoice.find(invoiceFilter).populate("products.productId"),
      PurchaseOrder.find(poFilter),
      Product.find({ organizationId }).select("costPrice"),
    ]);

    // Create product cost map
    const productCostMap = {};
    allProducts.forEach((p) => {
      productCostMap[p._id.toString()] = p.costPrice || 0;
    });

    // Calculate revenue and cost
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (const invoice of invoices) {
      totalRevenue += invoice.total || 0;
      totalTax += invoice.tax || 0;
      totalDiscount += invoice.discount || 0;

      for (const item of invoice.products) {
        if (item.productId) {
          const productId = item.productId._id || item.productId;
          const costPrice = productCostMap[productId.toString()] || 0;
          totalCost += item.quantity * costPrice;
        }
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const totalPurchaseCost = purchaseOrders.reduce(
      (sum, po) => sum + (po.totalCost || 0),
      0,
    );
    const netProfit = grossProfit - totalPurchaseCost;

    // Calculate monthly breakdown
    const monthlyBreakdown = [];
    if (invoices.length > 0) {
      const months = new Set();
      invoices.forEach((inv) => {
        const month = inv.createdAt.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        months.add(month);
      });

      for (const month of months) {
        const monthInvoices = invoices.filter(
          (inv) =>
            inv.createdAt.toLocaleString("default", {
              month: "short",
              year: "numeric",
            }) === month,
        );
        const monthRevenue = monthInvoices.reduce(
          (sum, inv) => sum + inv.total,
          0,
        );
        let monthCost = 0;
        for (const inv of monthInvoices) {
          for (const item of inv.products) {
            if (item.productId) {
              const productId = item.productId._id || item.productId;
              const costPrice = productCostMap[productId.toString()] || 0;
              monthCost += item.quantity * costPrice;
            }
          }
        }
        monthlyBreakdown.push({
          month,
          revenue: monthRevenue,
          cost: monthCost,
          profit: monthRevenue - monthCost,
          invoiceCount: monthInvoices.length,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCost,
          grossProfit,
          profitMargin:
            totalRevenue > 0
              ? ((grossProfit / totalRevenue) * 100).toFixed(2)
              : 0,
          totalPurchaseCost,
          netProfit,
          netProfitMargin:
            totalRevenue > 0
              ? ((netProfit / totalRevenue) * 100).toFixed(2)
              : 0,
          totalTax,
          totalDiscount,
          totalInvoices: invoices.length,
          totalPurchaseOrders: purchaseOrders.length,
        },
        monthlyBreakdown,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    });
  } catch (error) {
    console.error("Error in getFinancialReport:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ADMIN DASHBOARD ====================
export const getAdminDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    // Get all necessary data in parallel
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalCategories,
      totalSuppliers,
      totalManagers,
      totalStaff,
      totalPOs,
      pendingPOs,
      approvedPOs,
      rejectedPOs,
      fulfilledPOs,
      totalInvoices,
      paidInvoicesCount,
      voidInvoicesCount,
      unpaidInvoicesCount,
      paidInvoices,
      fulfilledPurchaseOrders,
      allPurchaseOrders,
      allProducts,
      allUsers,
    ] = await Promise.all([
      Product.countDocuments({ organizationId }),
      Product.countDocuments({ organizationId, isActive: true }),
      Product.countDocuments({
        organizationId,
        $expr: { $lte: ["$quantity", "$reorderThreshold"] },
      }),
      Category.countDocuments({ organizationId }),
      Supplier.countDocuments({ organizationId }),
      User.countDocuments({ organizationId, role: "manager" }),
      User.countDocuments({ organizationId, role: "staff" }),
      PurchaseOrder.countDocuments({ organizationId }),
      PurchaseOrder.countDocuments({ organizationId, status: "pending" }),
      PurchaseOrder.countDocuments({ organizationId, status: "approved" }),
      PurchaseOrder.countDocuments({ organizationId, status: "rejected" }),
      PurchaseOrder.countDocuments({ organizationId, status: "fulfilled" }),
      Invoice.countDocuments({ organizationId }),
      Invoice.countDocuments({ organizationId, status: "paid" }),
      Invoice.countDocuments({ organizationId, status: "void" }),
      Invoice.countDocuments({ organizationId, status: "unpaid" }),
      Invoice.find({ organizationId, status: "paid" }).populate(
        "products.productId",
      ),
      PurchaseOrder.find({ organizationId, status: "fulfilled" }),
      PurchaseOrder.find({ organizationId }),
      Product.find({ organizationId }).select("costPrice quantity"),
      User.find({ organizationId }).select(
        "name email role isActive createdAt",
      ),
    ]);

    // Calculate product cost map
    const productCostMap = {};
    allProducts.forEach((p) => {
      productCostMap[p._id.toString()] = p.costPrice || 0;
    });

    // Calculate financial metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (const invoice of paidInvoices) {
      totalRevenue += invoice.total || 0;
      totalTax += invoice.tax || 0;
      totalDiscount += invoice.discount || 0;

      for (const item of invoice.products) {
        if (item.productId) {
          const productId = item.productId._id || item.productId;
          const costPrice = productCostMap[productId.toString()] || 0;
          totalCost += item.quantity * costPrice;
        }
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const totalPurchaseCost = fulfilledPurchaseOrders.reduce(
      (sum, po) => sum + (po.totalCost || 0),
      0,
    );
    const netProfit = grossProfit - totalPurchaseCost;

    // Calculate total inventory value
    const totalInventoryValue = allProducts.reduce(
      (sum, p) => sum + (p.quantity * p.costPrice || 0),
      0,
    );

    // Monthly revenue trend
    const monthlyRevenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthInvoices = await Invoice.find({
        organizationId,
        status: "paid",
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const monthRevenue = monthInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      );

      monthlyRevenueTrend.push({
        month: month.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        revenue: monthRevenue,
        invoiceCount: monthInvoices.length,
      });
    }

    // Monthly profit trend
    const monthlyProfitTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthInvoices = await Invoice.find({
        organizationId,
        status: "paid",
        createdAt: { $gte: monthStart, $lte: monthEnd },
      }).populate("products.productId");

      let monthRevenue = 0;
      let monthCost = 0;

      for (const invoice of monthInvoices) {
        monthRevenue += invoice.total || 0;
        for (const item of invoice.products) {
          if (item.productId) {
            const productId = item.productId._id || item.productId;
            const costPrice = productCostMap[productId.toString()] || 0;
            monthCost += item.quantity * costPrice;
          }
        }
      }

      monthlyProfitTrend.push({
        month: month.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        revenue: monthRevenue,
        cost: monthCost,
        profit: monthRevenue - monthCost,
      });
    }

    // Top 5 products by sales
    const productSalesMap = {};
    for (const invoice of paidInvoices) {
      for (const item of invoice.products) {
        const productId = item.productId?._id || item.productId;
        if (productId) {
          if (!productSalesMap[productId]) {
            productSalesMap[productId] = { quantity: 0, revenue: 0 };
          }
          productSalesMap[productId].quantity += item.quantity;
          productSalesMap[productId].revenue += item.subtotal || 0;
        }
      }
    }

    const topProducts = await Promise.all(
      Object.entries(productSalesMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(async ([productId, data]) => {
          const product = await Product.findById(productId).select(
            "name sku sellingPrice",
          );
          return {
            _id: productId,
            name: product?.name || "Unknown",
            sku: product?.sku || "N/A",
            quantitySold: data.quantity,
            revenue: data.revenue,
          };
        }),
    );

    // Team distribution
    const teamDistribution = {
      managers: totalManagers,
      staff: totalStaff,
      total: totalManagers + totalStaff,
    };

    // Recent activity
    const recentInvoices = await Invoice.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .lean();

    const recentPurchaseOrders = await PurchaseOrder.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("supplierId", "name")
      .populate("createdBy", "name")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalProducts,
          activeProducts,
          lowStockProducts,
          totalCategories,
          totalSuppliers,
          totalInventoryValue,
        },
        team: teamDistribution,
        purchaseOrders: {
          totalPOs,
          pendingPOs,
          approvedPOs,
          rejectedPOs,
          fulfilledPOs,
          completionRate:
            totalPOs > 0 ? ((fulfilledPOs / totalPOs) * 100).toFixed(2) : 0,
        },
        invoices: {
          total: totalInvoices,
          paid: paidInvoicesCount,
          unpaid: unpaidInvoicesCount,
          void: voidInvoicesCount,
        },
        financial: {
          totalRevenue,
          totalCost,
          grossProfit,
          profitMargin:
            totalRevenue > 0
              ? ((grossProfit / totalRevenue) * 100).toFixed(2)
              : 0,
          totalPurchaseCost,
          netProfit,
          netProfitMargin:
            totalRevenue > 0
              ? ((netProfit / totalRevenue) * 100).toFixed(2)
              : 0,
          totalTax,
          totalDiscount,
          monthlyTrend: monthlyRevenueTrend,
          monthlyProfitTrend,
          topProducts,
        },
        recentActivity: {
          invoices: recentInvoices,
          purchaseOrders: recentPurchaseOrders,
        },
      },
    });
  } catch (error) {
    console.error("Error in getAdminDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==================== MANAGER DASHBOARD ====================
export const getManagerDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCategories,
      totalSuppliers,
      totalPOs,
      pendingPOs,
      approvedPOs,
      rejectedPOs,
      fulfilledPOs,
      totalInvoicesThisMonth,
      totalInvoicesThisWeek,
      recentInvoices,
      recentPOs,
      topSuppliers,
    ] = await Promise.all([
      Product.countDocuments({ organizationId }),
      Product.countDocuments({
        organizationId,
        $expr: { $lte: ["$quantity", "$reorderThreshold"] },
      }),
      Product.countDocuments({ organizationId, quantity: 0 }),
      Category.countDocuments({ organizationId }),
      Supplier.countDocuments({ organizationId }),
      PurchaseOrder.countDocuments({ organizationId }),
      PurchaseOrder.countDocuments({ organizationId, status: "pending" }),
      PurchaseOrder.countDocuments({ organizationId, status: "approved" }),
      PurchaseOrder.countDocuments({ organizationId, status: "rejected" }),
      PurchaseOrder.countDocuments({ organizationId, status: "fulfilled" }),
      Invoice.countDocuments({
        organizationId,
        createdAt: { $gte: startOfMonth },
      }),
      Invoice.countDocuments({
        organizationId,
        createdAt: { $gte: startOfWeek },
      }),
      Invoice.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "name")
        .lean(),
      PurchaseOrder.find({ organizationId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("supplierId", "name")
        .populate("createdBy", "name")
        .lean(),
      PurchaseOrder.aggregate([
        { $match: { organizationId } },
        {
          $group: {
            _id: "$supplierId",
            count: { $sum: 1 },
            totalCost: { $sum: "$totalCost" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "suppliers",
            localField: "_id",
            foreignField: "_id",
            as: "supplier",
          },
        },
        { $unwind: "$supplier" },
      ]),
    ]);

    const completedPOs = fulfilledPOs + rejectedPOs;
    const completionRate =
      totalPOs > 0 ? ((completedPOs / totalPOs) * 100).toFixed(2) : 0;

    const lowStockAlertProducts = await Product.find({
      organizationId,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    })
      .select("name sku quantity reorderThreshold unit")
      .limit(10)
      .lean();

    const categoryDistribution = await Product.aggregate([
      { $match: { organizationId } },
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
    ]);

    // Calculate PO value trends
    const poValueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthPOs = await PurchaseOrder.find({
        organizationId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const totalValue = monthPOs.reduce((sum, po) => sum + po.totalCost, 0);

      poValueTrend.push({
        month: month.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        totalValue,
        count: monthPOs.length,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          totalCategories,
          totalSuppliers,
          lowStockAlert: lowStockAlertProducts,
          categoryDistribution: categoryDistribution.map((c) => ({
            category: c.category.name,
            count: c.count,
          })),
        },
        purchaseOrders: {
          totalPOs,
          pendingPOs,
          approvedPOs,
          rejectedPOs,
          fulfilledPOs,
          completionRate: parseFloat(completionRate),
          poValueTrend,
          topSuppliers: topSuppliers.map((s) => ({
            id: s.supplier._id,
            name: s.supplier.name,
            poCount: s.count,
            totalCost: s.totalCost,
          })),
          recentPOs,
        },
        salesActivity: {
          totalInvoicesThisMonth,
          totalInvoicesThisWeek,
          recentInvoices,
        },
      },
    });
  } catch (error) {
    console.error("Error in getManagerDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==================== STAFF DASHBOARD ====================
export const getStaffDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user._id;
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [
      invoicesToday,
      invoicesThisWeek,
      invoicesThisMonth,
      stockActionsToday,
      stockActionsThisWeek,
      stockActionsThisMonth,
      lowStockProducts,
      outOfStockProducts,
      totalInvoices,
      totalStockActions,
      recentInvoices,
      recentStockActions,
    ] = await Promise.all([
      Invoice.countDocuments({
        organizationId,
        createdBy: userId,
        createdAt: { $gte: startOfToday },
      }),
      Invoice.countDocuments({
        organizationId,
        createdBy: userId,
        createdAt: { $gte: startOfWeek },
      }),
      Invoice.countDocuments({
        organizationId,
        createdBy: userId,
        createdAt: { $gte: startOfMonth },
      }),
      StockLog.countDocuments({
        organizationId,
        performedBy: userId,
        createdAt: { $gte: startOfToday },
      }),
      StockLog.countDocuments({
        organizationId,
        performedBy: userId,
        createdAt: { $gte: startOfWeek },
      }),
      StockLog.countDocuments({
        organizationId,
        performedBy: userId,
        createdAt: { $gte: startOfMonth },
      }),
      Product.countDocuments({
        organizationId,
        $expr: { $lte: ["$quantity", "$reorderThreshold"] },
      }),
      Product.countDocuments({ organizationId, quantity: 0 }),
      Invoice.countDocuments({ organizationId, createdBy: userId }),
      StockLog.countDocuments({ organizationId, performedBy: userId }),
      Invoice.find({ organizationId, createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("products.productId", "name")
        .lean(),
      StockLog.find({ organizationId, performedBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("productId", "name sku")
        .lean(),
    ]);

    const allMyInvoices = await Invoice.find({
      organizationId,
      createdBy: userId,
      status: "paid",
    });
    const totalRevenue = allMyInvoices.reduce((sum, inv) => sum + inv.total, 0);

    const stockActionTypes = await StockLog.aggregate([
      { $match: { organizationId, performedBy: userId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const invoiceStatuses = await Invoice.aggregate([
      { $match: { organizationId, createdBy: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$total" },
        },
      },
    ]);

    const monthlyPerformance = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthInvoices = await Invoice.find({
        organizationId,
        createdBy: userId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const monthStockActions = await StockLog.countDocuments({
        organizationId,
        performedBy: userId,
        createdAt: { $gte: monthStart, $lte: monthEnd },
      });

      const monthRevenue = monthInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      );

      monthlyPerformance.push({
        month: month.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        invoices: monthInvoices.length,
        revenue: monthRevenue,
        stockActions: monthStockActions,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        myActivity: {
          invoices: {
            today: invoicesToday,
            thisWeek: invoicesThisWeek,
            thisMonth: invoicesThisMonth,
            total: totalInvoices,
            totalRevenue,
          },
          stockActions: {
            today: stockActionsToday,
            thisWeek: stockActionsThisWeek,
            thisMonth: stockActionsThisMonth,
            total: totalStockActions,
            breakdown: stockActionTypes.map((s) => ({
              type: s._id,
              count: s.count,
              totalQuantity: s.totalQuantity,
            })),
          },
          invoiceStatuses: invoiceStatuses.map((s) => ({
            status: s._id,
            count: s.count,
            totalValue: s.totalValue,
          })),
          recentInvoices,
          recentStockActions,
        },
        alerts: {
          lowStockProducts,
          outOfStockProducts,
        },
        performance: {
          monthlyTrend: monthlyPerformance,
        },
      },
    });
  } catch (error) {
    console.error("Error in getStaffDashboardStats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
