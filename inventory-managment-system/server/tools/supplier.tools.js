import Supplier from "../models/supplier.model.js";
import Product from "../models/product.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const supplierToolsDeclaration = {
  name: "query_suppliers",
  description: `
Retrieve supplier information.

Use this tool whenever the user asks about:
- Suppliers
- Supplier details
- Supplier contact information
- Products supplied by a supplier
- Supplier performance
- Supplier lead times
- Best suppliers
- Supplier purchase orders
- Supplier comparisons
- Supplier analytics
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_suppliers",
          "supplier_details",
          "search_suppliers",
          "supplier_products",
          "supplier_performance",
          "supplier_purchase_orders",
          "top_suppliers",
          "supplier_lead_times",
          "compare_suppliers",
        ],
      },
      supplierId: {
        type: "string",
        description: "Supplier ID for details.",
      },
      supplierName: {
        type: "string",
        description: "Supplier name for search.",
      },
      searchTerm: {
        type: "string",
        description: "Search term for suppliers.",
      },
      sortBy: {
        type: "string",
        enum: ["name", "leadTimeDays", "createdAt"],
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

export const supplierToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    supplierId,
    supplierName,
    searchTerm,
    sortBy = "name",
    sortOrder = "asc",
    limit = 50,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});
  const sortObj = {};
  sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

  switch (action) {
    case "list_suppliers":
    case "search_suppliers": {
      if (searchTerm) {
        match.name = { $regex: searchTerm, $options: "i" };
      }

      const suppliers = await Supplier.find(match)
        .sort(sortObj)
        .limit(limit)
        .lean();

      return sanitizeForModel({
        suppliers,
        count: suppliers.length,
        total: await Supplier.countDocuments(match),
      });
    }

    case "supplier_details": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      const query = { ...match };
      if (supplierId) query._id = supplierId;
      else if (supplierName)
        query.name = { $regex: supplierName, $options: "i" };

      const supplier = await Supplier.findOne(query).lean();
      if (!supplier) return { found: false, message: "Supplier not found" };

      const productCount = await Product.countDocuments({
        organizationId: supplier.organizationId,
        supplierId: supplier._id,
      });

      const poStats = await PurchaseOrder.aggregate([
        {
          $match: {
            organizationId: supplier.organizationId,
            supplierId: supplier._id,
            status: "fulfilled",
          },
        },
        {
          $group: {
            _id: null,
            totalPOValue: { $sum: "$totalCost" },
            poCount: { $sum: 1 },
          },
        },
      ]);

      return sanitizeForModel({
        ...supplier,
        productCount,
        poStats: poStats[0] || { totalPOValue: 0, poCount: 0 },
      });
    }

    case "supplier_products": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      const query = { ...match };
      if (supplierId) query._id = supplierId;
      else if (supplierName)
        query.name = { $regex: supplierName, $options: "i" };

      const supplier = await Supplier.findOne(query).lean();
      if (!supplier) return { found: false, message: "Supplier not found" };

      const products = await Product.find({
        organizationId: supplier.organizationId,
        supplierId: supplier._id,
      })
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      return sanitizeForModel({
        supplier: { name: supplier.name, id: supplier._id },
        products,
        count: products.length,
      });
    }

    case "supplier_performance": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      const query = { ...match };
      if (supplierId) query._id = supplierId;
      else if (supplierName)
        query.name = { $regex: supplierName, $options: "i" };

      const supplier = await Supplier.findOne(query).lean();
      if (!supplier) return { found: false, message: "Supplier not found" };

      const pos = await PurchaseOrder.find({
        organizationId: supplier.organizationId,
        supplierId: supplier._id,
      }).lean();

      const totalPOValue = pos.reduce(
        (sum, po) => sum + (po.totalCost || 0),
        0,
      );
      const fulfilled = pos.filter((po) => po.status === "fulfilled");
      const pending = pos.filter((po) => po.status === "pending");

      const productCount = await Product.countDocuments({
        organizationId: supplier.organizationId,
        supplierId: supplier._id,
      });

      return sanitizeForModel({
        supplierName: supplier.name,
        totalPOValue,
        poCount: pos.length,
        fulfilledCount: fulfilled.length,
        pendingCount: pending.length,
        avgLeadTime: supplier.leadTimeDays || null,
        productCount,
        performanceScore:
          pos.length > 0
            ? ((fulfilled.length / pos.length) * 100).toFixed(1)
            : 0,
      });
    }

    case "supplier_purchase_orders": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      const query = { ...match };
      if (supplierId) query._id = supplierId;
      else if (supplierName)
        query.name = { $regex: supplierName, $options: "i" };

      const supplier = await Supplier.findOne(query).lean();
      if (!supplier) return { found: false, message: "Supplier not found" };

      const pos = await PurchaseOrder.find({
        organizationId: supplier.organizationId,
        supplierId: supplier._id,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return sanitizeForModel({
        supplierName: supplier.name,
        purchaseOrders: pos,
        count: pos.length,
      });
    }

    case "top_suppliers": {
      const result = await Supplier.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "supplierId",
            as: "products",
          },
        },
        {
          $addFields: {
            productCount: { $size: "$products" },
          },
        },
        {
          $lookup: {
            from: "purchaseorders",
            localField: "_id",
            foreignField: "supplierId",
            as: "purchaseOrders",
          },
        },
        {
          $addFields: {
            poCount: { $size: "$purchaseOrders" },
            totalPOValue: {
              $sum: "$purchaseOrders.totalCost",
            },
          },
        },
        { $sort: { productCount: -1 } },
        { $limit: limit },
        {
          $project: {
            name: 1,
            contactPerson: 1,
            email: 1,
            phone: 1,
            leadTimeDays: 1,
            productCount: 1,
            poCount: 1,
            totalPOValue: 1,
          },
        },
      ]);

      return sanitizeForModel({
        topSuppliers: result,
        count: result.length,
      });
    }

    case "supplier_lead_times": {
      const suppliers = await Supplier.find(match)
        .select("name leadTimeDays")
        .sort({ leadTimeDays: 1 })
        .lean();

      const avgLeadTime =
        suppliers
          .filter((s) => s.leadTimeDays !== null)
          .reduce((sum, s) => sum + s.leadTimeDays, 0) /
          suppliers.filter((s) => s.leadTimeDays !== null).length || 0;

      return sanitizeForModel({
        suppliers: suppliers,
        count: suppliers.length,
        avgLeadTime: Math.round(avgLeadTime * 10) / 10,
        minLeadTime:
          Math.min(
            ...suppliers.map((s) => s.leadTimeDays).filter((v) => v !== null),
          ) || 0,
        maxLeadTime:
          Math.max(
            ...suppliers.map((s) => s.leadTimeDays).filter((v) => v !== null),
          ) || 0,
      });
    }

    case "compare_suppliers": {
      if (!supplierName) {
        return { error: "supplierName required for comparison" };
      }

      const names = supplierName.split(",").map((s) => s.trim());
      if (names.length < 2) {
        return { error: "Need at least 2 suppliers to compare" };
      }

      const suppliers = await Supplier.find({
        name: { $in: names.map((n) => new RegExp(n, "i")) },
      }).lean();

      if (suppliers.length < 2) {
        return { error: "Could not find at least 2 suppliers to compare" };
      }

      const comparisons = await Promise.all(
        suppliers.map(async (sup) => {
          const productCount = await Product.countDocuments({
            organizationId: sup.organizationId,
            supplierId: sup._id,
          });

          const pos = await PurchaseOrder.find({
            organizationId: sup.organizationId,
            supplierId: sup._id,
          }).lean();

          return {
            name: sup.name,
            contactPerson: sup.contactPerson,
            leadTimeDays: sup.leadTimeDays,
            productCount,
            poCount: pos.length,
            totalPOValue: pos.reduce((sum, po) => sum + (po.totalCost || 0), 0),
          };
        }),
      );

      return sanitizeForModel({
        comparison: comparisons,
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
