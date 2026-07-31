// services/resolvers/anomalyResolver.js
import anomalyModel from "../../models/anomaly.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import { buildNotFoundResult } from "./chatEntityExtractor.js";

const getSeverityWithEmoji = (severity) => {
  const map = { low: "🟡 Low", medium: "🟠 Medium", high: "🔴 Critical" };
  return map[severity] || severity;
};

export const resolveAnomalyQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};
  if (args.severity) baseFilter.severity = args.severity;

  const totalCount = await anomalyModel.countDocuments(baseFilter);
  if (totalCount === 0) {
    return buildNotFoundResult("anomalies", "organization");
  }

  const anomalies = await anomalyModel
    .find(baseFilter)
    .populate("productId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const enhancedAnomalies = anomalies.map((a) => ({
    severity: getSeverityWithEmoji(a.severity),
    type: a.type,
    productName: a.productId?.name || "N/A",
    description: a.description || "N/A",
    status: a.isResolved ? "Resolved" : "Unresolved",
    date: a.createdAt,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.anomalies_compact, enhancedAnomalies);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    tableTitle: "Detected Anomalies",
    framingLine: `Found ${totalCount} inventory anomal${totalCount === 1 ? "y" : "ies"}:`,
    reply: `Found ${totalCount} inventory anomal${totalCount === 1 ? "y" : "ies"}:`,
    isAnalytical: true, // Analytical resolver -> MAY append insight if notable
    summary: { totalAnomalies: totalCount, isEmpty: false },
  };
};
