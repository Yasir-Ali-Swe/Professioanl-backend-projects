// services/resolvers/schemaGraph.js
import mongoose from "mongoose";

/**
 * Mongoose Schema Relationship Graph for StockPilot inventory models.
 * Defines direct FK fields, collection names, and join paths.
 */

export const SCHEMA_MODELS = {
  Organization: { collection: "organizations", primaryKey: "_id" },
  User: { collection: "users", primaryKey: "_id" },
  Category: { collection: "categories", primaryKey: "_id", fk: { createdBy: "User" } },
  Supplier: { collection: "suppliers", primaryKey: "_id", fk: { createdBy: "User" } },
  Product: {
    collection: "products",
    primaryKey: "_id",
    fk: {
      categoryId: "Category",
      supplierId: "Supplier",
      createdBy: "User",
    },
  },
  Invoice: {
    collection: "invoices",
    primaryKey: "_id",
    fk: {
      "products.productId": "Product",
      createdBy: "User",
      voidedBy: "User",
    },
  },
  PurchaseOrder: {
    collection: "purchaseorders",
    primaryKey: "_id",
    fk: {
      supplierId: "Supplier",
      "items.productId": "Product",
      createdBy: "User",
      approvedBy: "User",
    },
  },
  StockLog: {
    collection: "stocklogs",
    primaryKey: "_id",
    fk: {
      productId: "Product",
      relatedInvoiceId: "Invoice",
      relatedPurchaseOrderId: "PurchaseOrder",
      performedBy: "User",
    },
  },
  Anomaly: { collection: "anomalies", primaryKey: "_id", fk: { productId: "Product" } },
  DemandForecast: { collection: "demandforecasts", primaryKey: "_id", fk: { productId: "Product" } },
  ReorderSuggestion: { collection: "reordersuggestions", primaryKey: "_id", fk: { productId: "Product" } },
  AiInsights: { collection: "aiinsights", primaryKey: "_id" },
};

/**
 * Builds a multi-hop $lookup stage enforcing organizationId matching at EVERY hop.
 */
export const buildStrictOrgLookupStage = ({
  fromCollection,
  localField,
  foreignField = "_id",
  asField,
  organizationId,
  isArrayField = false,
}) => {
  const orgObjectId = organizationId
    ? new mongoose.Types.ObjectId(organizationId)
    : null;

  if (!orgObjectId) {
    return {
      $lookup: {
        from: fromCollection,
        localField: localField,
        foreignField: foreignField,
        as: asField,
      },
    };
  }

  // Multi-tenant pipeline lookup enforcing orgId at inner match
  return {
    $lookup: {
      from: fromCollection,
      let: { localVal: `$${localField}`, targetOrgId: orgObjectId },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                isArrayField
                  ? { $in: ["$" + foreignField, "$$localVal"] }
                  : { $eq: ["$" + foreignField, "$$localVal"] },
                { $eq: ["$organizationId", "$$targetOrgId"] }, // MANDATORY multi-tenant isolation!
              ],
            },
          },
        },
      ],
      as: asField,
    },
  };
};

/**
 * Resolves path precedence: Direct FK vs Indirect Transactional path.
 */
export const resolveJoinPathPrecedence = (fromModel, targetModel, isTransactionalIntent = false) => {
  if (fromModel === "Product" && targetModel === "Supplier") {
    if (isTransactionalIntent) {
      return {
        pathType: "indirect_po",
        description: "based on historical purchase orders from this supplier",
        hops: ["Product", "PurchaseOrder", "Supplier"],
      };
    }
    return {
      pathType: "direct_fk",
      description: "based on each product's current assigned supplier",
      hops: ["Product", "Supplier"],
    };
  }

  if (fromModel === "Anomaly" && targetModel === "Supplier") {
    return {
      pathType: "multi_hop",
      description: "based on anomalous products and their assigned supplier",
      hops: ["Anomaly", "Product", "Supplier"],
    };
  }

  if (fromModel === "ReorderSuggestion" && targetModel === "Category") {
    return {
      pathType: "multi_hop",
      description: "based on reorder suggestions for products in category",
      hops: ["ReorderSuggestion", "Product", "Category"],
    };
  }

  if (fromModel === "Invoice" && targetModel === "User") {
    return {
      pathType: "direct_fk",
      description: "based on invoices created by staff member",
      hops: ["Invoice", "User"],
    };
  }

  return {
    pathType: "direct_fk",
    description: `based on ${fromModel} to ${targetModel} relationship`,
    hops: [fromModel, targetModel],
  };
};
