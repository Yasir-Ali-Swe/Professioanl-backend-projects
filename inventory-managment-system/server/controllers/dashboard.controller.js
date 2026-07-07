import productModel from "../models/product.model.js";
import invoiceModel from "../models/invoice.model.js";
import purchaseOrderModel from "../models/purchaseOrder.model.js";
import stockLogModel from "../models/stockLog.model.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const role = req.user.role;
    const userId = req.user._id;

    const totalProducts = await productModel.countDocuments({
      organizationId,
      isActive: true,
    });

    const lowStockCount = await productModel.countDocuments({
      organizationId,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    });

    let response = {
      totalProducts,
      lowStockCount,
    };

    if (role === "staff") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const myInvoicesToday = await invoiceModel.countDocuments({
        organizationId,
        createdBy: userId,
        createdAt: { $gte: today },
      });

      response = { ...response, myInvoicesToday };
    } else {
      const pendingPOs = await purchaseOrderModel.countDocuments({
        organizationId,
        status: "pending",
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const revenueToday = await invoiceModel.aggregate([
        {
          $match: {
            organizationId,
            status: "paid",
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]);

      response = {
        ...response,
        pendingPOs,
        revenueToday: revenueToday[0]?.total || 0,
      };
    }

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in getDashboardSummary:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSalesTrends = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { period = "daily" } = req.query;

    let dateFormat;
    if (period === "weekly") {
      dateFormat = { $isoWeek: "$createdAt" };
    } else if (period === "monthly") {
      dateFormat = { $month: "$createdAt" };
    } else {
      dateFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    }

    const trends = await invoiceModel.aggregate([
      {
        $match: {
          organizationId,
          status: "paid",
        },
      },
      {
        $group: {
          _id: dateFormat,
          totalSales: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error("Error in getSalesTrends:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getStockLevelsReport = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const products = await productModel
      .find({ organizationId })
      .select("name quantity reorderThreshold unit isActive")
      .populate("categoryId", "name")
      .populate("supplierId", "name")
      .sort({ quantity: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error in getStockLevelsReport:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getFinancialReport = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const invoices = await invoiceModel.find({
      organizationId,
      status: "paid",
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

    const purchaseOrders = await purchaseOrderModel.find({
      organizationId,
      status: "fulfilled",
    });

    const totalCost = purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0);

    const grossProfit = totalRevenue - totalCost;

    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalCost,
        grossProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalInvoices: invoices.length,
        totalPurchaseOrders: purchaseOrders.length,
      },
    });
  } catch (error) {
    console.error("Error in getFinancialReport:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
