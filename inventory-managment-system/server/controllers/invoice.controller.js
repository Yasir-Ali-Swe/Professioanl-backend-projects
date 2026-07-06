import invoiceModel from "../models/invoice.model.js";
import productModel from "../models/product.model.js";
import organizationModel from "../models/organization.model.js";
import { performStockOut, performStockIn } from "../services/stock.service.js";

export const createInvoice = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const { customerName, products, tax, discount } = req.body;

    if (!customerName || !products || !products.length) {
      return res.status(400).json({
        success: false,
        message: "customerName and products are required",
      });
    }

    for (const item of products) {
      if (!item.productId || !item.quantity || !item.sellingPrice) {
        return res.status(400).json({
          success: false,
          message:
            "Each product must have productId, quantity, and sellingPrice",
        });
      }
    }

    for (const item of products) {
      const product = await productModel.findOne({
        _id: item.productId,
        organizationId,
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }
    }

    const org = await organizationModel.findById(organizationId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const itemsWithSubtotal = products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      sellingPrice: p.sellingPrice,
      subtotal: p.quantity * p.sellingPrice,
    }));

    const subtotal = itemsWithSubtotal.reduce((sum, i) => sum + i.subtotal, 0);

    const finalTax =
      tax !== undefined ? tax : org.invoiceSettings?.taxRate || 0;
    const finalDiscount =
      discount !== undefined
        ? discount
        : org.invoiceSettings?.defaultDiscount || 0;
    const total = subtotal + finalTax - finalDiscount;

    const count = await invoiceModel.countDocuments({ organizationId });
    const invoicePrefix = org.invoiceSettings?.invoicePrefix || "INV";
    const invoiceNumber = `${invoicePrefix}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await invoiceModel.create({
      organizationId,
      invoiceNumber,
      customerName,
      products: itemsWithSubtotal,
      subtotal,
      tax: finalTax,
      discount: finalDiscount,
      total,
      createdBy,
    });

    for (const item of products) {
      await performStockOut({
        organizationId,
        productId: item.productId,
        quantity: item.quantity,
        reason: "sale",
        relatedInvoiceId: invoice._id,
        performedBy: createdBy,
      });
    }

    const populatedInvoice = await invoiceModel
      .findById(invoice._id)
      .populate("createdBy", "name email role")
      .populate("products.productId", "name sku")
      .lean();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: populatedInvoice,
    });
  } catch (error) {
    console.error("Error in createInvoice:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalInvoices = await invoiceModel.countDocuments(query);

    const invoices = await invoiceModel
      .find(query)
      .populate("createdBy", "name email role")
      .populate("products.productId", "name sku")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: invoices,
      total: totalInvoices,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalInvoices / Number(limit)),
    });
  } catch (error) {
    console.error("Error in getAllInvoices:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId, createdBy };

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalInvoices = await invoiceModel.countDocuments(query);

    const invoices = await invoiceModel
      .find(query)
      .populate("createdBy", "name email role")
      .populate("products.productId", "name sku")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: invoices,
      total: totalInvoices,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalInvoices / Number(limit)),
    });
  } catch (error) {
    console.error("Error in getMyInvoices:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const invoiceId = req.params.id;
    const userRole = req.user.role;
    const userId = req.user._id;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    const query = { _id: invoiceId, organizationId };

    if (userRole === "staff") {
      query.createdBy = userId;
    }

    const invoice = await invoiceModel
      .findOne(query)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate("products.productId", "name sku")
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error in getInvoiceById:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const voidInvoice = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const invoiceId = req.params.id;
    const voidedBy = req.user._id;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    const invoice = await invoiceModel.findOne({
      _id: invoiceId,
      organizationId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.status === "void") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already voided",
      });
    }

    for (const item of invoice.products) {
      await performStockIn({
        organizationId,
        productId: item.productId,
        quantity: item.quantity,
        reason: "return",
        performedBy: voidedBy,
      });
    }

    invoice.status = "void";
    invoice.voidedBy = voidedBy;
    await invoice.save();

    const updatedInvoice = await invoiceModel
      .findById(invoiceId)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate("products.productId", "name sku")
      .lean();

    res.status(200).json({
      success: true,
      message: "Invoice voided successfully",
      data: updatedInvoice,
    });
  } catch (error) {
    console.error("Error in voidInvoice:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
