// services/resolvers/forecastResolver.js
import demandForecastModel from "../../models/product.forcast.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import { buildNotFoundResult } from "./chatEntityExtractor.js";

export const resolveForecastQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};

  const totalCount = await demandForecastModel.countDocuments(baseFilter);
  if (totalCount === 0) {
    return buildNotFoundResult("demand forecasts", "organization");
  }

  const forecasts = await demandForecastModel
    .find(baseFilter)
    .populate("productId", "name")
    .lean();

  const enhancedForecasts = forecasts.map((f) => ({
    productName: f.productId?.name || "N/A",
    predictedDemand: f.predictedDemand,
    forecastPeriod: f.forecastPeriod,
    daysUntilStockout: f.daysUntilStockout ?? "N/A",
    confidence: f.confidence,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.forecast_compact, enhancedForecasts);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    tableTitle: "Demand Forecasts",
    framingLine: `Found ${totalCount} demand forecast${totalCount === 1 ? "" : "s"}:`,
    reply: `Found ${totalCount} demand forecast${totalCount === 1 ? "" : "s"}:`,
    isAnalytical: true, // Analytical resolver -> MAY append insight if notable
    summary: { totalForecasts: totalCount, isEmpty: false },
  };
};
