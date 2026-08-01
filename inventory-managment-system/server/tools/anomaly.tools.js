import Anomaly from "../models/anomaly.model.js";
import Product from "../models/product.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const anomalyToolsDeclaration = {
  name: "query_anomalies",
  description: `
Retrieve anomaly detection information.

Use this tool whenever the user asks about:
- Anomalies
- Dead stock
- Sales spikes
- Suspicious adjustments
- Unusual returns
- Unresolved anomalies
- Resolved anomalies
- High severity anomalies
- Medium severity anomalies
- Anomaly details
- Anomaly explanations
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_anomalies",
          "anomaly_details",
          "unresolved_anomalies",
          "resolved_anomalies",
          "high_severity",
          "medium_severity",
          "low_severity",
          "anomalies_by_type",
          "product_anomalies",
          "anomaly_summary",
        ],
      },
      anomalyId: {
        type: "string",
        description: "Anomaly ID.",
      },
      productId: {
        type: "string",
        description: "Product ID.",
      },
      productSku: {
        type: "string",
        description: "Product SKU.",
      },
      productName: {
        type: "string",
        description: "Product name.",
      },
      type: {
        type: "string",
        enum: [
          "dead_stock",
          "sales_spike",
          "suspicious_adjustment",
          "unusual_return",
        ],
        description: "Filter by anomaly type.",
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Filter by severity.",
      },
      isResolved: {
        type: "boolean",
        description: "Filter by resolution status.",
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

export const anomalyToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    anomalyId,
    productId,
    productSku,
    productName,
    type,
    severity,
    isResolved,
    limit = 50,
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
  if (type) match.type = type;
  if (severity) match.severity = severity;
  if (isResolved !== undefined) match.isResolved = isResolved;

  const sortOrder =
    severity === "high" ? { severity: -1, createdAt: -1 } : { createdAt: -1 };

  switch (action) {
    case "list_anomalies": {
      const anomalies = await Anomaly.find(match)
        .sort(sortOrder)
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
      });
    }

    case "anomaly_details": {
      if (!anomalyId) return { error: "anomalyId required" };

      const anomaly = await Anomaly.findById(anomalyId).lean();
      if (!anomaly) return { found: false, message: "Anomaly not found" };

      const enriched = await enrichSingleAnomaly(anomaly);

      return sanitizeForModel(enriched);
    }

    case "unresolved_anomalies": {
      match.isResolved = false;
      const anomalies = await Anomaly.find(match)
        .sort({ severity: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        status: "unresolved",
      });
    }

    case "resolved_anomalies": {
      match.isResolved = true;
      const anomalies = await Anomaly.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        status: "resolved",
      });
    }

    case "high_severity": {
      match.severity = "high";
      const anomalies = await Anomaly.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        severity: "high",
      });
    }

    case "medium_severity": {
      match.severity = "medium";
      const anomalies = await Anomaly.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        severity: "medium",
      });
    }

    case "low_severity": {
      match.severity = "low";
      const anomalies = await Anomaly.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        severity: "low",
      });
    }

    case "anomalies_by_type": {
      if (!type) return { error: "type required" };

      match.type = type;
      const anomalies = await Anomaly.find(match)
        .sort({ severity: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      return sanitizeForModel({
        anomalies: enriched,
        count: enriched.length,
        total: await Anomaly.countDocuments(match),
        type,
      });
    }

    case "product_anomalies": {
      if (!resolvedProductId) {
        return { error: "productId, productSku, or productName required" };
      }

      const anomalies = await Anomaly.find(match)
        .sort({ severity: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichAnomalies(anomalies);

      const product = await Product.findById(resolvedProductId)
        .select("name sku")
        .lean();

      return sanitizeForModel({
        product: product || null,
        anomalies: enriched,
        count: enriched.length,
      });
    }

    case "anomaly_summary": {
      const summary = await Anomaly.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              type: "$type",
              severity: "$severity",
              resolved: "$isResolved",
            },
            count: { $sum: 1 },
          },
        },
      ]);

      const byType = await Anomaly.aggregate([
        { $match: match },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]);

      const bySeverity = await Anomaly.aggregate([
        { $match: match },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]);

      const total = await Anomaly.countDocuments(match);
      const unresolved = await Anomaly.countDocuments({
        ...match,
        isResolved: false,
      });

      return sanitizeForModel({
        summary,
        byType,
        bySeverity,
        totals: {
          total,
          unresolved,
          resolved: total - unresolved,
        },
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichAnomalies(anomalies) {
  return await Promise.all(
    anomalies.map(async (anomaly) => {
      const product = await Product.findById(anomaly.productId)
        .select("name sku quantity")
        .lean();
      return {
        ...anomaly,
        product: product || null,
      };
    }),
  );
}

async function enrichSingleAnomaly(anomaly) {
  const product = await Product.findById(anomaly.productId)
    .select("name sku quantity sellingPrice")
    .lean();

  return {
    ...anomaly,
    product: product || null,
  };
}
