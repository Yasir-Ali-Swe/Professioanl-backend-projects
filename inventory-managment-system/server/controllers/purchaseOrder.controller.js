import purchaseOrderModel from "../models/purchase.order.model.js";
import supplierModel from "../models/supplier.model.js";
import { performStockIn } from "../services/stock.service.js";

export const createPurchaseOrder = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const userRole = req.user.role;
    const { supplierId, items } = req.body;

    if (!supplierId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "supplierId and items are required",
      });
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitCost) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId, quantity, and unitCost",
        });
      }
    }

    const supplier = await supplierModel.findOne({
      _id: supplierId,
      organizationId,
    });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const totalCost = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    const count = await purchaseOrderModel.countDocuments({ organizationId });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    const status = userRole === "admin" ? "approved" : "pending";

    const po = await purchaseOrderModel.create({
      organizationId,
      poNumber,
      supplierId,
      items,
      totalCost,
      status,
      createdBy,
      approvedBy: userRole === "admin" ? createdBy : null,
    });

    const populatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku")
      .lean();

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: populatedPO,
    });
  } catch (error) {
    console.error("Error in createPurchaseOrder:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId };

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalOrders = await purchaseOrderModel.countDocuments(query);

    const orders = await purchaseOrderModel
      .find(query)
      .populate("supplierId", "name contactPerson phone")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: orders,
      total: totalOrders,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalOrders / Number(limit)),
    });
  } catch (error) {
    console.error("Error in getAllPurchaseOrders:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Purchase order ID is required",
      });
    }

    const po = await purchaseOrderModel
      .findOne({ _id: orderId, organizationId })
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku quantity unit")
      .lean();

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: po,
    });
  } catch (error) {
    console.error("Error in getPurchaseOrderById:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approvePurchaseOrder = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const orderId = req.params.id;
    const approvedBy = req.user._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Purchase order ID is required",
      });
    }

    const po = await purchaseOrderModel.findOne({
      _id: orderId,
      organizationId,
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (po.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be approved. Current status: ${po.status}`,
      });
    }

    po.status = "approved";
    po.approvedBy = approvedBy;
    await po.save();

    const updatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku")
      .lean();

    res.status(200).json({
      success: true,
      message: "Purchase order approved successfully",
      data: updatedPO,
    });
  } catch (error) {
    console.error("Error in approvePurchaseOrder:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectPurchaseOrder = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Purchase order ID is required",
      });
    }

    const po = await purchaseOrderModel.findOne({
      _id: orderId,
      organizationId,
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (po.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be rejected. Current status: ${po.status}`,
      });
    }

    po.status = "rejected";
    await po.save();

    const updatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone")
      .populate("createdBy", "name email role")
      .populate("items.productId", "name sku")
      .lean();

    res.status(200).json({
      success: true,
      message: "Purchase order rejected successfully",
      data: updatedPO,
    });
  } catch (error) {
    console.error("Error in rejectPurchaseOrder:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const fulfillPurchaseOrder = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const orderId = req.params.id;
    const performedBy = req.user._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Purchase order ID is required",
      });
    }

    const po = await purchaseOrderModel.findOne({
      _id: orderId,
      organizationId,
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (po.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: `Only approved orders can be fulfilled. Current status: ${po.status}`,
      });
    }

    for (const item of po.items) {
      await performStockIn({
        organizationId,
        productId: item.productId,
        quantity: item.quantity,
        reason: "purchase",
        relatedPurchaseOrderId: po._id,
        performedBy,
      });
    }

    po.status = "fulfilled";
    await po.save();

    const updatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku")
      .lean();

    res.status(200).json({
      success: true,
      message: "Purchase order fulfilled successfully. Stock has been updated.",
      data: updatedPO,
    });
  } catch (error) {
    console.error("Error in fulfillPurchaseOrder:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
