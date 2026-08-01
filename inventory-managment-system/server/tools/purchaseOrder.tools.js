import PurchaseOrder from "../models/purchaseOrder.model.js";
import Supplier from "../models/supplier.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const purchaseOrderToolsDeclaration = {
  name: "query_purchase_orders",
  description: `
Retrieve purchase order information.

Use this tool whenever the user asks about:
- Purchase orders
- PO details
- Pending purchase orders
- Approved purchase orders
- Fulfilled purchase orders
- Rejected purchase orders
- Purchase order cost
- PO items
- Supplier of PO
- PO approvals
- PO history
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_purchase_orders",
          "po_details",
          "po_items",
          "pending_pos",
          "approved_pos",
          "fulfilled_pos",
          "rejected_pos",
          "po_by_supplier",
          "po_analytics",
        ],
      },
      poId: {
        type: "string",
        description: "Purchase order ID for details.",
      },
      poNumber: {
        type: "string",
        description: "PO number for lookup.",
      },
      supplierId: {
        type: "string",
        description: "Supplier ID to filter by.",
      },
      supplierName: {
        type: "string",
        description: "Supplier name to filter by.",
      },
      status: {
        type: "string",
        enum: ["pending", "approved", "rejected", "fulfilled"],
        description: "Filter by status.",
      },
      generatedFromAI: {
        type: "boolean",
        description: "Filter by AI-generated POs.",
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
        description: "Maximum number of results (default: 50).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["action"],
  },
};

export const purchaseOrderToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    poId,
    poNumber,
    supplierId,
    supplierName,
    status,
    generatedFromAI,
    startDate,
    endDate,
    limit = 50,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});

  if (startDate) match.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };
  if (status) match.status = status;
  if (generatedFromAI !== undefined) match.generatedFromAI = generatedFromAI;

  let resolvedSupplierId = supplierId;
  if (supplierName && !supplierId) {
    const supplier = await Supplier.findOne({
      organizationId: organizationId || match.organizationId,
      name: { $regex: supplierName, $options: "i" },
    }).lean();
    if (supplier) resolvedSupplierId = supplier._id;
  }
  if (resolvedSupplierId) match.supplierId = resolvedSupplierId;

  switch (action) {
    case "list_purchase_orders": {
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "po_details": {
      if (!poId && !poNumber) {
        return { error: "poId or poNumber required" };
      }

      const query = { ...match };
      if (poId) query._id = poId;
      else if (poNumber) query.poNumber = poNumber;

      const po = await PurchaseOrder.findOne(query).lean();
      if (!po) return { found: false, message: "Purchase order not found" };

      const enriched = await enrichSinglePurchaseOrder(po);

      return sanitizeForModel(enriched);
    }

    case "po_items": {
      if (!poId && !poNumber) {
        return { error: "poId or poNumber required" };
      }

      const query = { ...match };
      if (poId) query._id = poId;
      else if (poNumber) query.poNumber = poNumber;

      const po = await PurchaseOrder.findOne(query)
        .select("poNumber supplierId items totalCost status")
        .lean();

      if (!po) return { found: false, message: "Purchase order not found" };

      const supplier = await Supplier.findById(po.supplierId)
        .select("name")
        .lean();

      const enrichedItems = await Promise.all(
        po.items.map(async (item) => {
          const product = await Product.findById(item.productId)
            .select("name sku unit")
            .lean();
          return {
            ...item,
            productName: product?.name || "Unknown",
            productSku: product?.sku || "Unknown",
            unit: product?.unit || "unknown",
            totalCost: item.quantity * item.unitCost,
          };
        }),
      );

      return sanitizeForModel({
        poNumber: po.poNumber,
        supplierName: supplier?.name || "Unknown",
        status: po.status,
        totalCost: po.totalCost,
        items: enrichedItems,
        itemCount: enrichedItems.length,
      });
    }

    case "pending_pos": {
      match.status = "pending";
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "approved_pos": {
      match.status = "approved";
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "fulfilled_pos": {
      match.status = "fulfilled";
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "rejected_pos": {
      match.status = "rejected";
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "po_by_supplier": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      let supplier;
      if (supplierId) {
        supplier = await Supplier.findById(supplierId).lean();
      } else {
        supplier = await Supplier.findOne({
          organizationId: organizationId || match.organizationId,
          name: { $regex: supplierName, $options: "i" },
        }).lean();
      }

      if (!supplier) return { found: false, message: "Supplier not found" };

      match.supplierId = supplier._id;
      const pos = await PurchaseOrder.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichPurchaseOrders(pos);

      return sanitizeForModel({
        supplierName: supplier.name,
        purchaseOrders: enriched,
        count: enriched.length,
        total: await PurchaseOrder.countDocuments(match),
      });
    }

    case "po_analytics": {
      const analytics = await PurchaseOrder.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalCost: { $sum: "$totalCost" },
            avgCost: { $avg: "$totalCost" },
          },
        },
      ]);

      const totalCost = analytics.reduce((sum, a) => sum + a.totalCost, 0);
      const totalCount = analytics.reduce((sum, a) => sum + a.count, 0);

      const bySupplier = await PurchaseOrder.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "suppliers",
            localField: "supplierId",
            foreignField: "_id",
            as: "supplier",
          },
        },
        { $unwind: "$supplier" },
        {
          $group: {
            _id: "$supplierId",
            supplierName: { $first: "$supplier.name" },
            count: { $sum: 1 },
            totalCost: { $sum: "$totalCost" },
          },
        },
        { $sort: { totalCost: -1 } },
      ]);

      return sanitizeForModel({
        summary: {
          totalCount,
          totalCost,
          avgCost: totalCount > 0 ? totalCost / totalCount : 0,
        },
        byStatus: analytics,
        bySupplier: bySupplier.slice(0, 10),
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichPurchaseOrders(pos) {
  return await Promise.all(
    pos.map(async (po) => {
      const supplier = await Supplier.findById(po.supplierId)
        .select("name")
        .lean();
      return {
        ...po,
        supplierName: supplier?.name || "Unknown",
        itemCount: po.items?.length || 0,
      };
    }),
  );
}

async function enrichSinglePurchaseOrder(po) {
  const [supplier, createdBy, approvedBy] = await Promise.all([
    Supplier.findById(po.supplierId)
      .select("name contactPerson email phone")
      .lean(),
    User.findById(po.createdBy).select("name email").lean(),
    po.approvedBy
      ? User.findById(po.approvedBy).select("name email").lean()
      : null,
  ]);

  const enrichedItems = await Promise.all(
    po.items.map(async (item) => {
      const product = await Product.findById(item.productId)
        .select("name sku unit sellingPrice")
        .lean();
      return {
        ...item,
        productName: product?.name || "Unknown",
        productSku: product?.sku || "Unknown",
        unit: product?.unit || "unknown",
        totalCost: item.quantity * item.unitCost,
      };
    }),
  );

  return {
    ...po,
    supplier,
    createdBy,
    approvedBy,
    items: enrichedItems,
  };
}
