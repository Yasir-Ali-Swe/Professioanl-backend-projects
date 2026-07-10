// controllers/stock.controller.js
import stockLogModel from "../models/stockLog.model.js";
import productModel from "../models/product.model.js";
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

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!["purchase", "adjustment", "return"].includes(reason)) {
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
      reason,
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

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!["sale", "adjustment", "damage"].includes(reason)) {
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
      reason,
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
