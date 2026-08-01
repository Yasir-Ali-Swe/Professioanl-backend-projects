import AiInsights from "../models/insights.model.js";
import Product from "../models/product.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const insightToolsDeclaration = {
  name: "query_insights",
  description: `
Retrieve AI-generated insights and business intelligence.

Use this tool whenever the user asks about:
- AI insights
- Weekly insights
- Monthly insights
- AI summary
- AI recommendations
- Business insights
- Key metrics
- Top products
- Declining products
- Revenue insights
- Order insights
- Business performance
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "latest_insights",
          "weekly_insights",
          "monthly_insights",
          "insights_by_period",
          "insights_summary",
          "top_product",
          "declining_product",
        ],
      },
      period: {
        type: "string",
        enum: ["weekly", "monthly"],
        description: "Filter by insight period.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default: 10).",
        minimum: 1,
        maximum: 50,
      },
    },
    required: ["action"],
  },
};

export const insightToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const { action, period, limit = 10 } = args;

  const match = applyScopeFilter(scope, organizationId, {});
  if (period) match.period = period;

  switch (action) {
    case "latest_insights": {
      const insights = await AiInsights.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      return sanitizeForModel({
        insights: enriched,
        count: enriched.length,
        latest: enriched[0] || null,
      });
    }

    case "weekly_insights": {
      match.period = "weekly";
      const insights = await AiInsights.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      return sanitizeForModel({
        insights: enriched,
        count: enriched.length,
        period: "weekly",
      });
    }

    case "monthly_insights": {
      match.period = "monthly";
      const insights = await AiInsights.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      return sanitizeForModel({
        insights: enriched,
        count: enriched.length,
        period: "monthly",
      });
    }

    case "insights_by_period": {
      if (!period) return { error: "period required (weekly or monthly)" };

      match.period = period;
      const insights = await AiInsights.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      return sanitizeForModel({
        insights: enriched,
        count: enriched.length,
        period,
      });
    }

    case "insights_summary": {
      const insights = await AiInsights.find(match)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      const totals = {
        revenue: 0,
        orders: 0,
        count: 0,
      };

      for (const insight of enriched) {
        if (insight.keyMetrics) {
          totals.revenue += insight.keyMetrics.totalRevenue || 0;
          totals.orders += insight.keyMetrics.totalOrders || 0;
          totals.count++;
        }
      }

      return sanitizeForModel({
        insights: enriched,
        count: enriched.length,
        averages: {
          avgRevenue: totals.count > 0 ? totals.revenue / totals.count : 0,
          avgOrders: totals.count > 0 ? totals.orders / totals.count : 0,
        },
        totalRevenue: totals.revenue,
        totalOrders: totals.orders,
      });
    }

    case "top_product": {
      const insights = await AiInsights.find({
        ...match,
        "keyMetrics.topSellingProductId": { $ne: null },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      const topProducts = [];
      for (const insight of enriched) {
        if (insight.keyMetrics?.topSellingProductId) {
          topProducts.push({
            product: insight.topSellingProduct,
            period: insight.period,
            date: insight.createdAt,
            revenue: insight.keyMetrics?.totalRevenue || 0,
            orders: insight.keyMetrics?.totalOrders || 0,
          });
        }
      }

      return sanitizeForModel({
        topProducts: topProducts.slice(0, limit),
        count: topProducts.length,
      });
    }

    case "declining_product": {
      const insights = await AiInsights.find({
        ...match,
        "keyMetrics.decliningProductId": { $ne: null },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichInsights(insights);

      const decliningProducts = [];
      for (const insight of enriched) {
        if (insight.keyMetrics?.decliningProductId) {
          decliningProducts.push({
            product: insight.decliningProduct,
            period: insight.period,
            date: insight.createdAt,
            revenue: insight.keyMetrics?.totalRevenue || 0,
            orders: insight.keyMetrics?.totalOrders || 0,
          });
        }
      }

      return sanitizeForModel({
        decliningProducts: decliningProducts.slice(0, limit),
        count: decliningProducts.length,
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichInsights(insights) {
  return await Promise.all(
    insights.map(async (insight) => {
      let topProduct = null;
      let decliningProduct = null;

      if (insight.keyMetrics?.topSellingProductId) {
        topProduct = await Product.findById(
          insight.keyMetrics.topSellingProductId,
        )
          .select("name sku sellingPrice")
          .lean();
      }

      if (insight.keyMetrics?.decliningProductId) {
        decliningProduct = await Product.findById(
          insight.keyMetrics.decliningProductId,
        )
          .select("name sku sellingPrice")
          .lean();
      }

      return {
        ...insight,
        topSellingProduct: topProduct,
        decliningProduct: decliningProduct,
      };
    }),
  );
}
