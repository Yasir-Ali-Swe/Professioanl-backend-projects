import StockLog from "../models/stockLog.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Invoice from "../models/invoice.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const stockLogToolsDeclaration = {
  name: "query_stock_logs",
  description: `
Retrieve stock movement and inventory history.

Use this tool whenever the user asks about:
- Stock history
- Inventory movement
- Product movement
- Stock in/out
- Sales movement
- Purchase movement
- Return history
- Damage history
- Adjustment history
- Stock timeline
- Last stock updates
- Recent stock movements
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "stock_history",
          "stock_movement",
          "stock_in",
          "stock_out",
          "sales_movement",
          "purchase_movement",
          "return_history",
          "damage_history",
          "adjustment_history",
          "stock_timeline",
          "recent_movements",
          "movement_summary",
        ],
      },
      productId: {
        type: "string",
        description: "Product ID to filter by.",
      },
      productSku: {
        type: "string",
        description: "Product SKU to filter by.",
      },
      productName: {
        type: "string",
        description: "Product name to filter by.",
      },
      type: {
        type: "string",
        enum: ["in", "out"],
        description: "Filter by movement type.",
      },
      reason: {
        type: "string",
        enum: ["purchase", "sale", "adjustment", "return", "damage"],
        description: "Filter by reason.",
      },
      startDate: {
        type: "string",
        description: "Start date for filtering (ISO format).",
      },
      endDate: {
        type: "string",
        description: "End date for filtering (ISO format).",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default: 100).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["action"],
  },
};

export const stockLogToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    productId,
    productSku,
    productName,
    type,
    reason,
    startDate,
    endDate,
    limit = 100,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});

  let resolvedProductId = productId;
  if ((productSku || productName) && !productId) {
    const productMatch = applyScopeFilter(scope, organizationId, {});
    if (productSku) productMatch.sku = productSku;
    if (productName) productMatch.name = { $regex: productName, $options: "i" };

    const product = await Product.findOne(productMatch).lean();
    if (product) resolvedProductId = product._id;
  }
  if (resolvedProductId) match.productId = resolvedProductId;

  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };
  if (type) match.type = type;
  if (reason) match.reason = reason;

  switch (action) {
    case "stock_history":
    case "stock_movement": {
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        total: await StockLog.countDocuments(match),
      });
    }

    case "stock_in": {
      match.type = "in";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);
      const totalIn = enriched.reduce((sum, log) => sum + log.quantity, 0);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        totalIn,
        type: "in",
      });
    }

    case "stock_out": {
      match.type = "out";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);
      const totalOut = enriched.reduce((sum, log) => sum + log.quantity, 0);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        totalOut,
        type: "out",
      });
    }

    case "sales_movement": {
      match.type = "out";
      match.reason = "sale";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);
      const totalSold = enriched.reduce((sum, log) => sum + log.quantity, 0);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        totalSold,
        reason: "sale",
      });
    }

    case "purchase_movement": {
      match.type = "in";
      match.reason = "purchase";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);
      const totalPurchased = enriched.reduce(
        (sum, log) => sum + log.quantity,
        0,
      );

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        totalPurchased,
        reason: "purchase",
      });
    }

    case "return_history": {
      match.reason = "return";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        reason: "return",
      });
    }

    case "damage_history": {
      match.reason = "damage";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        reason: "damage",
      });
    }

    case "adjustment_history": {
      match.reason = "adjustment";
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        reason: "adjustment",
      });
    }

    case "stock_timeline": {
      if (!productId && !productSku && !productName) {
        return { error: "productId, productSku, or productName required" };
      }

      let product;
      const productQuery = applyScopeFilter(scope, organizationId, {});
      if (productId) productQuery._id = productId;
      else if (productSku) productQuery.sku = productSku;
      else if (productName)
        productQuery.name = { $regex: productName, $options: "i" };

      product = await Product.findOne(productQuery).lean();
      if (!product) return { found: false, message: "Product not found" };

      match.productId = product._id;

      const timeline = await StockLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              type: "$type",
            },
            total: { $sum: "$quantity" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]);

      const formatted = {};
      for (const entry of timeline) {
        if (!formatted[entry._id.date]) {
          formatted[entry._id.date] = { in: 0, out: 0 };
        }
        if (entry._id.type === "in") {
          formatted[entry._id.date].in += entry.total;
        } else {
          formatted[entry._id.date].out += entry.total;
        }
      }

      const timelineArray = Object.entries(formatted).map(([date, data]) => ({
        date,
        in: data.in,
        out: data.out,
        net: data.in - data.out,
      }));

      return sanitizeForModel({
        product: { name: product.name, sku: product.sku },
        currentQuantity: product.quantity,
        timeline: timelineArray,
      });
    }

    case "recent_movements": {
      const logs = await StockLog.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichStockLogs(logs);

      return sanitizeForModel({
        stockLogs: enriched,
        count: enriched.length,
        period: "recent",
      });
    }

    case "movement_summary": {
      const summary = await StockLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              type: "$type",
              reason: "$reason",
            },
            total: { $sum: "$quantity" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.type": 1, "_id.reason": 1 } },
      ]);

      const totalIn = summary
        .filter((s) => s._id.type === "in")
        .reduce((sum, s) => sum + s.total, 0);

      const totalOut = summary
        .filter((s) => s._id.type === "out")
        .reduce((sum, s) => sum + s.total, 0);

      return sanitizeForModel({
        summary,
        totals: {
          in: totalIn,
          out: totalOut,
          net: totalIn - totalOut,
        },
        dateRange: { startDate, endDate },
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichStockLogs(logs) {
  return await Promise.all(
    logs.map(async (log) => {
      const [product, user, invoice, purchaseOrder] = await Promise.all([
        Product.findById(log.productId).select("name sku").lean(),
        User.findById(log.performedBy).select("name email").lean(),
        log.relatedInvoiceId
          ? Invoice.findById(log.relatedInvoiceId)
              .select("invoiceNumber")
              .lean()
          : null,
        log.relatedPurchaseOrderId
          ? PurchaseOrder.findById(log.relatedPurchaseOrderId)
              .select("poNumber")
              .lean()
          : null,
      ]);

      return {
        ...log,
        product: product || null,
        performedBy: user || null,
        invoice: invoice || null,
        purchaseOrder: purchaseOrder || null,
      };
    }),
  );
}
