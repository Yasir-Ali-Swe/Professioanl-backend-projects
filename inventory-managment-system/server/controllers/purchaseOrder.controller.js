// controllers/purchaseOrder.controller.js
import purchaseOrderModel from "../models/purchaseOrder.model.js";
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

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitCost) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId, quantity, and unitCost",
        });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than 0",
        });
      }
      if (item.unitCost <= 0) {
        return res.status(400).json({
          success: false,
          message: "Unit cost must be greater than 0",
        });
      }
    }

    // Verify supplier exists
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

    // Calculate total cost
    const totalCost = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    // Generate PO number
    const count = await purchaseOrderModel.countDocuments({ organizationId });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    // Admin auto-approves, Manager creates pending
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

    // Populate and return
    const populatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku quantity unit")
      .lean();

    res.status(201).json({
      success: true,
      message:
        userRole === "admin"
          ? "Purchase order created and approved successfully"
          : "Purchase order created successfully (admin approval pending)",
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
      supplierId,
      search,
      minTotal,
      maxTotal,
      startDate,
      endDate,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId };

    // Filter by status
    if (status) {
      const validStatuses = ["pending", "approved", "rejected", "fulfilled"];
      if (validStatuses.includes(status)) {
        query.status = status;
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Status must be 'pending', 'approved', 'rejected', or 'fulfilled'",
        });
      }
    }

    // Filter by supplier
    if (supplierId) {
      query.supplierId = supplierId;
    }

    // Search by PO number
    if (search) {
      query.$or = [{ poNumber: { $regex: search, $options: "i" } }];
    }

    // Filter by total cost range
    if (minTotal || maxTotal) {
      query.totalCost = {};
      if (minTotal) query.totalCost.$gte = Number(minTotal);
      if (maxTotal) query.totalCost.$lte = Number(maxTotal);
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalOrders = await purchaseOrderModel.countDocuments(query);

    // Get orders with full population
    const orders = await purchaseOrderModel
      .find(query)
      .populate(
        "supplierId",
        "name contactPerson phone email address leadTimeDays",
      )
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate({
        path: "items.productId",
        select: "name sku quantity unit sellingPrice costPrice",
        populate: {
          path: "categoryId supplierId",
          select: "name",
        },
      })
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Calculate summary statistics
    const summary = {
      totalOrders: totalOrders,
      pending: await purchaseOrderModel.countDocuments({
        organizationId,
        status: "pending",
      }),
      approved: await purchaseOrderModel.countDocuments({
        organizationId,
        status: "approved",
      }),
      rejected: await purchaseOrderModel.countDocuments({
        organizationId,
        status: "rejected",
      }),
      fulfilled: await purchaseOrderModel.countDocuments({
        organizationId,
        status: "fulfilled",
      }),
      totalCost: 0,
    };

    // Calculate total cost from current page
    orders.forEach((order) => {
      summary.totalCost += order.totalCost || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total: totalOrders,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalOrders / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(totalOrders / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
        summary,
      },
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
      .populate(
        "supplierId",
        "name contactPerson phone email address leadTimeDays",
      )
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate({
        path: "items.productId",
        select: "name sku quantity unit sellingPrice costPrice imageUrl",
        populate: {
          path: "categoryId supplierId",
          select: "name",
        },
      })
      .lean();

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    // Add enriched data
    const enrichedPO = {
      ...po,
      items: po.items.map((item) => ({
        ...item,
        totalItemCost: item.quantity * item.unitCost,
        productDetails: item.productId,
      })),
      summary: {
        totalItems: po.items.length,
        totalQuantity: po.items.reduce((sum, item) => sum + item.quantity, 0),
        averageUnitCost:
          po.items.length > 0
            ? po.items.reduce((sum, item) => sum + item.unitCost, 0) /
              po.items.length
            : 0,
      },
    };

    res.status(200).json({
      success: true,
      data: enrichedPO,
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

    // Check if already approved
    if (po.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is already approved",
      });
    }

    // Check if rejected
    if (po.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot approve a rejected purchase order",
      });
    }

    // Check if fulfilled
    if (po.status === "fulfilled") {
      return res.status(400).json({
        success: false,
        message: "Cannot approve an already fulfilled purchase order",
      });
    }

    // Only pending orders can be approved
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
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku quantity unit")
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

    // Check if already rejected
    if (po.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is already rejected",
      });
    }

    // Check if fulfilled
    if (po.status === "fulfilled") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already fulfilled purchase order",
      });
    }

    // Check if approved
    if (po.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already approved purchase order",
      });
    }

    // Only pending orders can be rejected
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
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name email role")
      .populate("items.productId", "name sku quantity unit")
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
    const userRole = req.user.role;

    // Additional role check (though middleware already handles this)
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin can fulfill purchase orders",
      });
    }

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

    // Check if already fulfilled
    if (po.status === "fulfilled") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is already fulfilled",
      });
    }

    // Check if rejected
    if (po.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Cannot fulfill a rejected purchase order",
      });
    }

    // Check if pending
    if (po.status === "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot fulfill a pending purchase order. Please approve first.",
      });
    }

    // Only approved orders can be fulfilled
    if (po.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: `Only approved orders can be fulfilled. Current status: ${po.status}`,
      });
    }

    // Perform stock in for each item
    const stockResults = [];
    for (const item of po.items) {
      const result = await performStockIn({
        organizationId,
        productId: item.productId,
        quantity: item.quantity,
        reason: "purchase",
        relatedPurchaseOrderId: po._id,
        performedBy,
      });
      stockResults.push(result);
    }

    po.status = "fulfilled";
    await po.save();

    const updatedPO = await purchaseOrderModel
      .findById(po._id)
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name email role")
      .populate("approvedBy", "name email role")
      .populate("items.productId", "name sku quantity unit sellingPrice")
      .lean();

    res.status(200).json({
      success: true,
      message: `Purchase order fulfilled successfully. ${po.items.length} product(s) added to stock.`,
      data: {
        purchaseOrder: updatedPO,
        stockUpdates: stockResults,
      },
    });
  } catch (error) {
    console.error("Error in fulfillPurchaseOrder:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
