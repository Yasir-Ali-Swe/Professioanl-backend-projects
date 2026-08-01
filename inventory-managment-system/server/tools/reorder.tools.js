import ReorderSuggestion from "../models/reorder.suggestion.model.js";
import DemandForecast from "../models/product.forcast.model.js";
import Product from "../models/product.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const reorderToolsDeclaration = {
  name: "query_reorder",
  description: `
Retrieve reorder suggestions and demand forecasts.

Use this tool whenever the user asks about:
- Reorder suggestions
- Demand forecast
- Product forecast
- Stockout prediction
- Suggested reorder quantity
- Suggested reorder date
- Reorder history
- AI reorder recommendations
- Forecast by product
- Forecast period (7/30/90 days)
- Confidence scores
- Highest/lowest demand forecasts
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_reorder_suggestions",
          "reorder_suggestion_details",
          "pending_suggestions",
          "product_reorder_suggestion",
          "list_forecasts",
          "forecast_details",
          "product_forecast",
          "stockout_prediction",
          "forecast_summary",
        ],
      },
      suggestionId: {
        type: "string",
        description: "Reorder suggestion ID.",
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
      status: {
        type: "string",
        enum: ["pending", "actioned", "dismissed"],
        description: "Filter by suggestion status.",
      },
      forecastPeriod: {
        type: "string",
        enum: ["7_days", "30_days", "90_days"],
        description: "Forecast period.",
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

export const reorderToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    suggestionId,
    productId,
    productSku,
    productName,
    status,
    forecastPeriod,
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

  switch (action) {
    case "list_reorder_suggestions": {
      if (status) match.status = status;
      if (resolvedProductId) match.productId = resolvedProductId;

      const suggestions = await ReorderSuggestion.find(match)
        .sort({ suggestedReorderDate: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichSuggestions(suggestions);

      return sanitizeForModel({
        suggestions: enriched,
        count: enriched.length,
        total: await ReorderSuggestion.countDocuments(match),
      });
    }

    case "reorder_suggestion_details": {
      if (!suggestionId) return { error: "suggestionId required" };

      const suggestion = await ReorderSuggestion.findById(suggestionId).lean();
      if (!suggestion) return { found: false, message: "Suggestion not found" };

      const enriched = await enrichSingleSuggestion(suggestion);

      return sanitizeForModel(enriched);
    }

    case "pending_suggestions": {
      match.status = "pending";
      const suggestions = await ReorderSuggestion.find(match)
        .sort({ suggestedReorderDate: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichSuggestions(suggestions);

      return sanitizeForModel({
        suggestions: enriched,
        count: enriched.length,
        total: await ReorderSuggestion.countDocuments(match),
        status: "pending",
      });
    }

    case "product_reorder_suggestion": {
      if (!resolvedProductId) {
        return { error: "productId, productSku, or productName required" };
      }

      match.productId = resolvedProductId;
      const suggestions = await ReorderSuggestion.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichSuggestions(suggestions);

      const product = await Product.findById(resolvedProductId)
        .select("name sku quantity reorderThreshold")
        .lean();

      return sanitizeForModel({
        product,
        suggestions: enriched,
        count: enriched.length,
      });
    }

    case "list_forecasts": {
      if (forecastPeriod) match.forecastPeriod = forecastPeriod;
      if (resolvedProductId) match.productId = resolvedProductId;

      const forecasts = await DemandForecast.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichForecasts(forecasts);

      return sanitizeForModel({
        forecasts: enriched,
        count: enriched.length,
        total: await DemandForecast.countDocuments(match),
      });
    }

    case "forecast_details": {
      if (!productId && !productSku && !productName) {
        return { error: "productId, productSku, or productName required" };
      }

      if (!resolvedProductId)
        return { found: false, message: "Product not found" };

      match.productId = resolvedProductId;
      if (forecastPeriod) match.forecastPeriod = forecastPeriod;

      const forecasts = await DemandForecast.find(match)
        .sort({ createdAt: -1 })
        .lean();

      const enriched = await enrichForecasts(forecasts);

      const product = await Product.findById(resolvedProductId)
        .select("name sku quantity reorderThreshold")
        .lean();

      return sanitizeForModel({
        product,
        forecasts: enriched,
        count: enriched.length,
        latest: enriched[0] || null,
      });
    }

    case "product_forecast": {
      if (!resolvedProductId) {
        return { error: "productId, productSku, or productName required" };
      }

      match.productId = resolvedProductId;
      if (forecastPeriod) match.forecastPeriod = forecastPeriod;

      const forecasts = await DemandForecast.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichForecasts(forecasts);

      const product = await Product.findById(resolvedProductId)
        .select("name sku quantity reorderThreshold sellingPrice")
        .lean();

      return sanitizeForModel({
        product,
        forecasts: enriched,
        count: enriched.length,
        status:
          product.quantity <= product.reorderThreshold
            ? "Below threshold"
            : "Above threshold",
      });
    }

    case "stockout_prediction": {
      const now = new Date();
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const predictions = await DemandForecast.find({
        ...match,
        daysUntilStockout: { $lte: 30, $gt: 0 },
      })
        .sort({ daysUntilStockout: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichForecasts(predictions);

      const productIds = predictions.map((p) => p.productId);
      const products = await Product.find({ _id: { $in: productIds } })
        .select("name sku quantity reorderThreshold")
        .lean();

      const productMap = {};
      for (const p of products) {
        productMap[p._id.toString()] = p;
      }

      const results = enriched.map((f) => ({
        ...f,
        product: productMap[f.productId?.toString()] || null,
      }));

      return sanitizeForModel({
        predictions: results,
        count: results.length,
        urgency: results.some((r) => r.daysUntilStockout <= 7)
          ? "High"
          : "Medium",
      });
    }

    case "forecast_summary": {
      const summary = await DemandForecast.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$forecastPeriod",
            count: { $sum: 1 },
            avgDemand: { $avg: "$predictedDemand" },
            avgConfidence: { $avg: "$confidence" },
            maxDemand: { $max: "$predictedDemand" },
            minDemand: { $min: "$predictedDemand" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const totalProducts = await DemandForecast.distinct("productId", match);

      return sanitizeForModel({
        summary,
        totalProductsWithForecast: totalProducts.length,
        totalForecasts: await DemandForecast.countDocuments(match),
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichSuggestions(suggestions) {
  return await Promise.all(
    suggestions.map(async (suggestion) => {
      const product = await Product.findById(suggestion.productId)
        .select("name sku quantity reorderThreshold")
        .lean();
      return {
        ...suggestion,
        product: product || null,
        isUrgent:
          suggestion.suggestedReorderDate <
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    }),
  );
}

async function enrichSingleSuggestion(suggestion) {
  const product = await Product.findById(suggestion.productId)
    .select("name sku quantity reorderThreshold sellingPrice unit")
    .lean();

  return {
    ...suggestion,
    product: product || null,
    isUrgent:
      suggestion.suggestedReorderDate <
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

async function enrichForecasts(forecasts) {
  return await Promise.all(
    forecasts.map(async (forecast) => {
      const product = await Product.findById(forecast.productId)
        .select("name sku quantity reorderThreshold")
        .lean();
      return {
        ...forecast,
        product: product || null,
      };
    }),
  );
}
