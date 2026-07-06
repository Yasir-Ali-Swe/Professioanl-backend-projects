import stockLogModel from "../models/stock.log.model.js";
import productModel from "../models/product.model.js";

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

    if (!["adjustment", "return"].includes(reason)) {
      return res.status(400).json({
        success: false,
        message:
          "Reason must be either 'adjustment' or 'return' for manual stock-in",
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

    product.quantity += quantity;
    await product.save();

    const stockLog = await stockLogModel.create({
      organizationId,
      productId,
      type: "in",
      reason,
      quantity,
      performedBy,
    });

    res.status(201).json({
      success: true,
      message: "Stock added successfully",
      data: {
        product: {
          _id: product._id,
          name: product.name,
          quantity: product.quantity,
        },
        stockLog,
      },
    });
  } catch (error) {
    console.error("Error in stockIn:", error.message);
    res.status(error.status || 500).json({
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

    if (!["adjustment", "damage"].includes(reason)) {
      return res.status(400).json({
        success: false,
        message:
          "Reason must be either 'adjustment' or 'damage' for manual stock-out",
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

    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    product.quantity -= quantity;
    await product.save();

    const stockLog = await stockLogModel.create({
      organizationId,
      productId,
      type: "out",
      reason,
      quantity,
      performedBy,
    });

    res.status(201).json({
      success: true,
      message: "Stock removed successfully",
      data: {
        product: {
          _id: product._id,
          name: product.name,
          quantity: product.quantity,
        },
        stockLog,
      },
    });
  } catch (error) {
    console.error("Error in stockOut:", error.message);
    res.status(error.status || 500).json({
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
      .populate("performedBy", "name email")
      .populate("relatedPurchaseOrderId", "poNumber")
      .populate("relatedInvoiceId", "invoiceNumber")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          quantity: product.quantity,
        },
        logs: stockLogs,
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
      .select("name sku quantity reorderThreshold unit isActive")
      .populate("categoryId", "name")
      .populate("supplierId", "name contactPerson phone")
      .sort({ quantity: 1 })
      .lean();

    const lowStockCount = products.length;

    res.status(200).json({
      success: true,
      data: {
        totalLowStock: lowStockCount,
        products,
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
