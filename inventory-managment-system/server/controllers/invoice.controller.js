// controllers/invoice.controller.js
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

    // Validate each product
    for (const item of products) {
      if (!item.productId || !item.quantity || !item.sellingPrice) {
        return res.status(400).json({
          success: false,
          message:
            "Each product must have productId, quantity, and sellingPrice",
        });
      }
    }

    // Check stock availability
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

    // Get organization for invoice settings
    const org = await organizationModel.findById(organizationId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Calculate subtotal for each product
    const itemsWithSubtotal = products.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      sellingPrice: p.sellingPrice,
      subtotal: p.quantity * p.sellingPrice,
    }));

    const subtotal = itemsWithSubtotal.reduce((sum, i) => sum + i.subtotal, 0);

    // Use provided tax/discount or fallback to organization defaults
    const finalTax =
      tax !== undefined ? tax : org.invoiceSettings?.taxRate || 0;
    const finalDiscount =
      discount !== undefined
        ? discount
        : org.invoiceSettings?.defaultDiscount || 0;
    const total = subtotal + finalTax - finalDiscount;

    // Generate invoice number
    const count = await invoiceModel.countDocuments({ organizationId });
    const invoicePrefix = org.invoiceSettings?.invoicePrefix || "INV";
    const invoiceNumber = `${invoicePrefix}-${String(count + 1).padStart(4, "0")}`;

    // Create invoice
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

    // Perform stock out for each product
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

    // Get populated invoice
    const populatedInvoice = await invoiceModel
      .findById(invoice._id)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate({
        path: "products.productId",
        select: "name sku quantity unit sellingPrice imageUrl",
        populate: {
          path: "categoryId supplierId",
          select: "name",
        },
      })
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
      customerName,
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
      if (status === "paid" || status === "unpaid" || status === "void") {
        query.status = status;
      } else {
        return res.status(400).json({
          success: false,
          message: "Status must be 'paid', 'unpaid', or 'void'",
        });
      }
    }

    // Search by customer name or invoice number
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by customer name
    if (customerName) {
      query.customerName = { $regex: customerName, $options: "i" };
    }

    // Filter by total amount range
    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) query.total.$gte = Number(minTotal);
      if (maxTotal) query.total.$lte = Number(maxTotal);
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalInvoices = await invoiceModel.countDocuments(query);

    // Get invoices with full population
    const invoices = await invoiceModel
      .find(query)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate({
        path: "products.productId",
        select:
          "name sku quantity unit sellingPrice imageUrl categoryId supplierId",
        populate: [
          {
            path: "categoryId",
            select: "name categorySlug",
          },
          {
            path: "supplierId",
            select: "name contactPerson phone email",
          },
        ],
      })
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Calculate summary statistics
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
    const totalDiscount = invoices.reduce((sum, inv) => sum + inv.discount, 0);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          total: totalInvoices,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalInvoices / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(totalInvoices / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
        summary: {
          totalRevenue,
          totalTax,
          totalDiscount,
          totalInvoices: totalInvoices,
          paidInvoices: await invoiceModel.countDocuments({
            organizationId,
            status: "paid",
          }),
          unpaidInvoices: await invoiceModel.countDocuments({
            organizationId,
            status: "unpaid",
          }),
          voidInvoices: await invoiceModel.countDocuments({
            organizationId,
            status: "void",
          }),
        },
      },
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
      search,
      minTotal,
      maxTotal,
      startDate,
      endDate,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId, createdBy };

    // Filter by status
    if (status) {
      if (status === "paid" || status === "unpaid" || status === "void") {
        query.status = status;
      } else {
        return res.status(400).json({
          success: false,
          message: "Status must be 'paid', 'unpaid', or 'void'",
        });
      }
    }

    // Search by customer name or invoice number
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by total amount range
    if (minTotal || maxTotal) {
      query.total = {};
      if (minTotal) query.total.$gte = Number(minTotal);
      if (maxTotal) query.total.$lte = Number(maxTotal);
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalInvoices = await invoiceModel.countDocuments(query);

    // Get invoices with full population
    const invoices = await invoiceModel
      .find(query)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate({
        path: "products.productId",
        select: "name sku quantity unit sellingPrice imageUrl",
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

    // Calculate my summary statistics
    const myTotalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const myTotalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
    const myTotalDiscount = invoices.reduce(
      (sum, inv) => sum + inv.discount,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          total: totalInvoices,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalInvoices / Number(limit)),
          hasNextPage: Number(page) < Math.ceil(totalInvoices / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
        summary: {
          totalRevenue: myTotalRevenue,
          totalTax: myTotalTax,
          totalDiscount: myTotalDiscount,
          totalInvoices: totalInvoices,
          paidInvoices: await invoiceModel.countDocuments({
            organizationId,
            createdBy,
            status: "paid",
          }),
          unpaidInvoices: await invoiceModel.countDocuments({
            organizationId,
            createdBy,
            status: "unpaid",
          }),
          voidInvoices: await invoiceModel.countDocuments({
            organizationId,
            createdBy,
            status: "void",
          }),
        },
      },
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

    // Staff can only view their own invoices
    if (userRole === "staff") {
      query.createdBy = userId;
    }

    const invoice = await invoiceModel
      .findOne(query)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate({
        path: "products.productId",
        select: "name sku quantity unit sellingPrice imageUrl",
        populate: [
          {
            path: "categoryId",
            select: "name categorySlug",
          },
          {
            path: "supplierId",
            select: "name contactPerson phone email",
          },
        ],
      })
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Calculate additional product details
    const enrichedInvoice = {
      ...invoice,
      products: invoice.products.map((item) => ({
        ...item,
        productDetails: item.productId,
        totalItemPrice: item.quantity * item.sellingPrice,
      })),
      summary: {
        totalProducts: invoice.products.length,
        totalQuantity: invoice.products.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        averageItemPrice:
          invoice.products.length > 0
            ? invoice.products.reduce(
                (sum, item) => sum + item.sellingPrice,
                0,
              ) / invoice.products.length
            : 0,
      },
    };

    res.status(200).json({
      success: true,
      data: enrichedInvoice,
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

    // Restore stock for each product
    for (const item of invoice.products) {
      await performStockIn({
        organizationId,
        productId: item.productId,
        quantity: item.quantity,
        reason: "return",
        performedBy: voidedBy,
      });
    }

    // Update invoice status
    invoice.status = "void";
    invoice.voidedBy = voidedBy;
    await invoice.save();

    // Get populated invoice
    const updatedInvoice = await invoiceModel
      .findById(invoiceId)
      .populate("createdBy", "name email role")
      .populate("voidedBy", "name email role")
      .populate({
        path: "products.productId",
        select: "name sku quantity unit sellingPrice",
        populate: {
          path: "categoryId supplierId",
          select: "name",
        },
      })
      .lean();

    res.status(200).json({
      success: true,
      message: "Invoice voided successfully. Stock has been restored.",
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
