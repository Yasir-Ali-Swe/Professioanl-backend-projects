// controllers/stock.controller.js
import stockLogModel from "../models/stockLog.model.js";
import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import { performStockIn, performStockOut } from "../services/stock.service.js";

export const stockIn = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const performedBy = req.user._id;
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: "productId, quantity, and reason are required",
      });
    }

    const normalizedReason = reason.toLowerCase().trim();

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!["purchase", "adjustment", "return"].includes(normalizedReason)) {
      return res.status(400).json({
        success: false,
        message:
          "Reason must be either 'purchase', 'adjustment', or 'return' for manual stock-in",
      });
    }

    const result = await performStockIn({
      organizationId,
      productId,
      quantity,
      reason: normalizedReason,
      performedBy,
    });

    res.status(201).json({
      success: true,
      message: `Stock added successfully. ${quantity} units added. New quantity: ${result.product.quantity}`,
      data: result,
    });
  } catch (error) {
    console.error("Error in stockIn:", error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const stockOut = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const performedBy = req.user._id;
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: "productId, quantity, and reason are required",
      });
    }

    const normalizedReason = reason.toLowerCase().trim();

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!["sale", "adjustment", "damage"].includes(normalizedReason)) {
      return res.status(400).json({
        success: false,
        message:
          "Reason must be either 'sale', 'adjustment', or 'damage' for manual stock-out",
      });
    }

    const result = await performStockOut({
      organizationId,
      productId,
      quantity,
      reason: normalizedReason,
      performedBy,
    });

    res.status(201).json({
      success: true,
      message: `Stock removed successfully. ${quantity} units removed. New quantity: ${result.product.quantity}`,
      data: result,
    });
  } catch (error) {
    console.error("Error in stockOut:", error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getStockHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.productId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await productModel.findOne({
      _id: productId,
      organizationId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const stockLogs = await stockLogModel
      .find({ organizationId, productId })
      .populate("performedBy", "name email role")
      .populate("relatedPurchaseOrderId", "poNumber")
      .populate("relatedInvoiceId", "invoiceNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Format logs for cleaner response
    const formattedLogs = stockLogs.map((log) => ({
      _id: log._id,
      type: log.type,
      reason: log.reason,
      quantity: log.quantity,
      performedBy: log.performedBy
        ? {
          _id: log.performedBy._id,
          name: log.performedBy.name,
          email: log.performedBy.email,
          role: log.performedBy.role,
        }
        : null,
      relatedPurchaseOrder: log.relatedPurchaseOrderId || null,
      relatedInvoice: log.relatedInvoiceId || null,
      createdAt: log.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          quantity: product.quantity,
          unit: product.unit,
          reorderThreshold: product.reorderThreshold,
        },
        logs: formattedLogs,
        totalEntries: formattedLogs.length,
      },
    });
  } catch (error) {
    console.error("Error in getStockHistory:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const products = await productModel
      .find({
        organizationId,
        $expr: {
          $lte: ["$quantity", "$reorderThreshold"],
        },
      })
      .select("name sku quantity reorderThreshold unit isActive imageUrl")
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name contactPerson email phone")
      .sort({ quantity: 1 })
      .lean();

    const lowStockCount = products.length;

    // Format products for cleaner response
    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      unit: product.unit,
      isActive: product.isActive,
      imageUrl: product.imageUrl,
      category: product.categoryId || null,
      supplier: product.supplierId || null,
      stockStatus: product.quantity === 0 ? "Out of Stock" : "Low Stock",
      shortage: product.reorderThreshold - product.quantity,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalLowStock: lowStockCount,
        products: formattedProducts,
      },
    });
  } catch (error) {
    console.error("Error in getLowStockProducts:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getStockSummary = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const totalProducts = await productModel.countDocuments({ organizationId });

    const lowStockProducts = await productModel.countDocuments({
      organizationId,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    });

    const outOfStockProducts = await productModel.countDocuments({
      organizationId,
      quantity: 0,
    });

    const totalStockValue = await productModel.aggregate([
      { $match: { organizationId } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
        },
      },
    ]);

    // Recent stock activity (last 10 entries)
    const recentActivity = await stockLogModel
      .find({ organizationId })
      .populate("productId", "name sku")
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Distribution by category
    const stockByCategory = await productModel.aggregate([
      { $match: { organizationId } },
      {
        $group: {
          _id: "$categoryId",
          value: { $sum: "$quantity" },
        },
      },
    ]);

    const stockByCategoryWithNames = await categoryModel.populate(stockByCategory, {
      path: "_id",
      select: "name",
    });

    const formattedStockByCategory = stockByCategoryWithNames
      .filter((item) => item._id)
      .map((item) => ({
        name: item._id.name,
        value: item.value,
      }));

    // Monthly stock movements (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrendData = await stockLogModel.aggregate([
      {
        $match: {
          organizationId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            type: "$type",
          },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendsMap = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      trendsMap[key] = {
        month: monthNames[d.getMonth()],
        stockIn: 0,
        stockOut: 0,
      };
    }

    monthlyTrendData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (trendsMap[key]) {
        if (item._id.type === "in") {
          trendsMap[key].stockIn += item.totalQuantity;
        } else if (item._id.type === "out") {
          trendsMap[key].stockOut += item.totalQuantity;
        }
      }
    });

    const monthlyTrend = Object.values(trendsMap);

    // Current month stock movements
    const currentMonthTrend = monthlyTrend[monthlyTrend.length - 1] || { stockIn: 0, stockOut: 0 };
    const stockMovement = {
      stockIn: currentMonthTrend.stockIn,
      stockOut: currentMonthTrend.stockOut,
      thisMonth: currentMonthTrend.stockIn + currentMonthTrend.stockOut,
    };

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue: totalStockValue[0]?.total || 0,
        recentActivity,
        stockByCategory: formattedStockByCategory,
        monthlyTrend,
        stockMovement,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllStock = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { search, category, supplier, page = 1, limit = 20 } = req.query;

    const query = { organizationId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.categoryId = category;
    if (supplier) query.supplierId = supplier;

    const products = await productModel
      .find(query)
      .populate("categoryId", "name")
      .populate("supplierId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await productModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductStockDetails = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.productId;

    const product = await productModel
      .findOne({ _id: productId, organizationId })
      .populate("categoryId", "name")
      .populate("supplierId", "name contactPerson email phone");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Get stock history summary
    const stockSummary = await stockLogModel.aggregate([
      { $match: { organizationId, productId } },
      {
        $group: {
          _id: "$type",
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        product,
        stockSummary,
        stockStatus:
          product.quantity === 0
            ? "out_of_stock"
            : product.quantity <= product.reorderThreshold
              ? "low_stock"
              : "in_stock",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
