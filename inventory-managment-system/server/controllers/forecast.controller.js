// controllers/forecast.controller.js
import { generateForecastForProduct } from "../services/forecast.service.js";
import { generateReorderSuggestionForProduct } from "../services/reorderSuggestion.service.js"; // ADD THIS IMPORT
import demandForecastModel from "../models/product.forcast.model.js";
import reorderSuggestionModel from "../models/reorder.suggestion.model.js";
import stockLogModel from "../models/stockLog.model.js";
import productModel from "../models/product.model.js";
import purchaseOrderModel from "../models/purchaseOrder.model.js";
import supplierModel from "../models/supplier.model.js";

export const getForecastForProduct = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const forecast = await generateForecastForProduct(
      organizationId,
      productId,
    );

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error("Error in getForecastForProduct:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllForecasts = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const forecasts = await demandForecastModel.aggregate([
      { $match: { organizationId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$productId",
          latest: { $first: "$$ROOT" },
        },
      },
    ]);

    const result = await demandForecastModel.populate(
      forecasts.map((f) => f.latest),
      [{ path: "productId", select: "name sku quantity reorderThreshold" }],
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getAllForecasts:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ============ NEW FUNCTIONS TO ADD ============

// POST /api/ai/reorder-suggestions/generate/:id
export const generateReorderSuggestion = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // First, generate forecast if it doesn't exist
    await generateForecastForProduct(organizationId, productId);

    const suggestion = await generateReorderSuggestionForProduct(
      organizationId,
      productId,
    );

    if (!suggestion) {
      return res.status(200).json({
        success: true,
        message: "No reorder needed at this time",
        data: null,
      });
    }

    res.status(201).json({
      success: true,
      message: "Reorder suggestion generated successfully",
      data: suggestion,
    });
  } catch (error) {
    console.error("Error in generateReorderSuggestion:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// GET /api/ai/reorder-suggestions
export const getReorderSuggestions = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { status } = req.query;

    const query = { organizationId };
    if (status) {
      if (status !== "all") {
        query.status = status;
      }
    } else {
      query.status = "pending";
    }

    const suggestions = await reorderSuggestionModel
      .find(query)
      .populate("productId", "name sku quantity reorderThreshold supplierId")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Error in getReorderSuggestions:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// PATCH /api/ai/reorder-suggestions/:id/approve
export const approveReorderSuggestion = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const suggestionId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const suggestion = await reorderSuggestionModel.findOne({
      _id: suggestionId,
      organizationId,
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Suggestion not found",
      });
    }

    if (suggestion.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Suggestion already ${suggestion.status}`,
      });
    }

    const product = await productModel.findOne({
      _id: suggestion.productId,
      organizationId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const supplier = await supplierModel.findOne({
      _id: product.supplierId,
      organizationId,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found for this product",
      });
    }

    const count = await purchaseOrderModel.countDocuments({ organizationId });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    const status = userRole === "admin" ? "approved" : "pending";

    const purchaseOrder = await purchaseOrderModel.create({
      organizationId,
      poNumber,
      supplierId: product.supplierId,
      items: [
        {
          productId: product._id,
          quantity: suggestion.suggestedQuantity,
          unitCost: product.costPrice,
        },
      ],
      totalCost: suggestion.suggestedQuantity * product.costPrice,
      status,
      createdBy: userId,
      approvedBy: userRole === "admin" ? userId : null,
      generatedFromAI: true,
    });

    suggestion.status = "actioned";
    await suggestion.save();

    const populatedPO = await purchaseOrderModel
      .findById(purchaseOrder._id)
      .populate("supplierId", "name")
      .populate("items.productId", "name sku")
      .lean();

    res.status(200).json({
      success: true,
      message: "Suggestion approved and purchase order created",
      data: {
        suggestion,
        purchaseOrder: populatedPO,
      },
    });
  } catch (error) {
    console.error("Error in approveReorderSuggestion:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// PATCH /api/ai/reorder-suggestions/:id/dismiss
export const dismissReorderSuggestion = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const suggestionId = req.params.id;

    const suggestion = await reorderSuggestionModel.findOneAndUpdate(
      { _id: suggestionId, organizationId },
      { status: "dismissed" },
      { new: true },
    );

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: "Suggestion not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Suggestion dismissed successfully",
      data: suggestion,
    });
  } catch (error) {
    console.error("Error in dismissReorderSuggestion:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
