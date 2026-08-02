import Invoice from "../models/invoice.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const invoiceToolsDeclaration = {
  name: "query_invoices",
  description: `
Retrieve invoice and sales information.

Use this tool whenever the user asks about:
- Invoices
- Invoice details
- Sales
- Revenue
- Customer purchases
- Paid/unpaid invoices
- Voided invoices
- Invoice history
- Sales trends
- Customer spending
- Top customers
- Invoice line items
- Invoice totals

Supports filtering by status, date range, customer, and amount.
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_invoices",
          "invoice_details",
          "invoice_line_items",
          "search_invoices",
          "paid_invoices",
          "unpaid_invoices",
          "voided_invoices",
          "sales_summary",
          "sales_trend",
          "top_customers",
          "customer_purchases",
          "customer_history",
        ],
      },
      invoiceId: {
        type: "string",
        description: "Invoice ID for details.",
      },
      invoiceNumber: {
        type: "string",
        description: "Invoice number for lookup.",
      },
      customerName: {
        type: "string",
        description: "Customer name to filter by.",
      },
      status: {
        type: "string",
        enum: ["paid", "unpaid", "void"],
        description: "Filter by invoice status.",
      },
      startDate: {
        type: "string",
        description: "Start date for filtering (ISO format).",
      },
      endDate: {
        type: "string",
        description: "End date for filtering (ISO format).",
      },
      minTotal: {
        type: "number",
        description: "Minimum invoice total.",
      },
      maxTotal: {
        type: "number",
        description: "Maximum invoice total.",
      },
      sortBy: {
        type: "string",
        enum: ["createdAt", "total", "customerName"],
        description: "Field to sort by.",
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort order.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default: 50).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["action"],
  },
};

export const invoiceToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    invoiceId,
    invoiceNumber,
    customerName,
    status,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 50,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});
  const sortObj = {};
  sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

  switch (action) {
    case "list_invoices":
    case "search_invoices": {
      if (customerName)
        match.customerName = { $regex: customerName, $options: "i" };
      if (status) match.status = status;
      if (startDate) match.createdAt = { $gte: new Date(startDate) };
      if (endDate)
        match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };
      if (minTotal) match.total = { $gte: minTotal };
      if (maxTotal) match.total = { ...match.total, $lte: maxTotal };

      const invoices = await Invoice.find(match)
        .sort(sortObj)
        .limit(limit)
        .lean();

      return sanitizeForModel({
        invoices,
        count: invoices.length,
        total: await Invoice.countDocuments(match),
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      });
    }

    case "invoice_details": {
      if (!invoiceId && !invoiceNumber) {
        return { error: "invoiceId or invoiceNumber required" };
      }

      const query = { ...match };
      if (invoiceId) query._id = invoiceId;
      else if (invoiceNumber) query.invoiceNumber = invoiceNumber;

      const invoice = await Invoice.findOne(query).lean();
      if (!invoice) return { found: false, message: "Invoice not found" };

      const productIds = [
        ...new Set(
          invoice.products.map((item) => item.productId).filter(Boolean),
        ),
      ];

      const [products, createdByUser, voidedByUser] = await Promise.all([
        Product.find({ _id: { $in: productIds } })
          .select("name sku sellingPrice")
          .lean(),
        invoice.createdBy
          ? User.findById(invoice.createdBy).select("name email").lean()
          : null,
        invoice.voidedBy
          ? User.findById(invoice.voidedBy).select("name email").lean()
          : null,
      ]);

      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      const enrichedProducts = invoice.products.map((item) => {
        const product = item.productId
          ? productMap.get(item.productId.toString())
          : null;
        return {
          ...item,
          productName: product?.name || "Unknown",
          productSku: product?.sku || "Unknown",
        };
      });

      return sanitizeForModel({
        ...invoice,
        products: enrichedProducts,
        createdBy: createdByUser,
        voidedBy: voidedByUser,
      });
    }

    case "invoice_line_items": {
      if (!invoiceId && !invoiceNumber) {
        return { error: "invoiceId or invoiceNumber required" };
      }

      const query = { ...match };
      if (invoiceId) query._id = invoiceId;
      else if (invoiceNumber) query.invoiceNumber = invoiceNumber;

      const invoice = await Invoice.findOne(query)
        .select("invoiceNumber customerName products total")
        .lean();

      if (!invoice) return { found: false, message: "Invoice not found" };

      const enrichedItems = await Promise.all(
        invoice.products.map(async (item) => {
          const product = await Product.findById(item.productId)
            .select("name sku")
            .lean();
          return {
            productName: product?.name || "Unknown",
            productSku: product?.sku || "Unknown",
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            subtotal: item.subtotal,
          };
        }),
      );

      return sanitizeForModel({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        items: enrichedItems,
        total: invoice.total,
        itemCount: enrichedItems.length,
      });
    }

    case "paid_invoices": {
      match.status = "paid";
      const invoices = await Invoice.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

      return sanitizeForModel({
        invoices,
        count: invoices.length,
        totalRevenue,
        status: "paid",
      });
    }

    case "unpaid_invoices": {
      match.status = "unpaid";
      const invoices = await Invoice.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const totalOutstanding = invoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      );

      return sanitizeForModel({
        invoices,
        count: invoices.length,
        totalOutstanding,
        status: "unpaid",
      });
    }

    case "voided_invoices": {
      match.status = "void";
      const invoices = await Invoice.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await Promise.all(
        invoices.map(async (inv) => {
          let voidedByUser = null;
          if (inv.voidedBy) {
            const user = await User.findById(inv.voidedBy)
              .select("name email")
              .lean();
            voidedByUser = user;
          }
          return { ...inv, voidedBy: voidedByUser };
        }),
      );

      return sanitizeForModel({
        invoices: enriched,
        count: enriched.length,
        status: "void",
      });
    }

    case "sales_summary": {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      if (Object.keys(dateFilter).length > 0) {
        match.createdAt = dateFilter;
      }

      const result = await Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            totalTax: { $sum: "$tax" },
            totalDiscount: { $sum: "$discount" },
            totalInvoices: { $sum: 1 },
            avgInvoiceValue: { $avg: "$total" },
            minInvoice: { $min: "$total" },
            maxInvoice: { $max: "$total" },
          },
        },
      ]);

      const summary = result[0] || {
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalInvoices: 0,
        avgInvoiceValue: 0,
        minInvoice: 0,
        maxInvoice: 0,
      };

      return sanitizeForModel({
        summary,
        dateRange: { startDate, endDate },
      });
    }

    case "sales_trend": {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      if (Object.keys(dateFilter).length > 0) {
        match.createdAt = dateFilter;
      }

      const trend = await Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]);

      return sanitizeForModel({
        trend,
        dateRange: { startDate, endDate },
      });
    }

    case "top_customers": {
      const result = await Invoice.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$customerName",
            totalSpent: { $sum: "$total" },
            invoiceCount: { $sum: 1 },
            avgInvoice: { $avg: "$total" },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: limit },
      ]);

      return sanitizeForModel({
        customers: result,
        count: result.length,
      });
    }

    case "customer_purchases": {
      if (!customerName) return { error: "customerName required" };

      match.customerName = { $regex: customerName, $options: "i" };

      const invoices = await Invoice.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const totalSpent = invoices.reduce((sum, inv) => sum + inv.total, 0);

      return sanitizeForModel({
        customerName: customerName,
        invoices,
        count: invoices.length,
        totalSpent,
        avgInvoice: invoices.length > 0 ? totalSpent / invoices.length : 0,
      });
    }

    case "customer_history": {
      if (!customerName) return { error: "customerName required" };

      match.customerName = { $regex: customerName, $options: "i" };

      const invoices = await Invoice.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const productMap = {};
      for (const inv of invoices) {
        for (const item of inv.products) {
          const key = item.productId.toString();
          if (!productMap[key]) {
            const product = await Product.findById(item.productId)
              .select("name sku")
              .lean();
            productMap[key] = {
              name: product?.name || "Unknown",
              sku: product?.sku || "Unknown",
              quantity: 0,
              total: 0,
            };
          }
          productMap[key].quantity += item.quantity;
          productMap[key].total += item.subtotal;
        }
      }

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return sanitizeForModel({
        customerName: customerName,
        invoiceCount: invoices.length,
        totalSpent: invoices.reduce((sum, inv) => sum + inv.total, 0),
        invoices: invoices.slice(0, 10),
        topProducts,
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
