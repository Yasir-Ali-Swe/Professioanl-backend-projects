// services/resolvers/reorderResolver.js
import reorderSuggestionModel from "../../models/reorder.suggestion.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import { buildNotFoundResult } from "./chatEntityExtractor.js";

export const resolveReorderQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};

  const totalCount = await reorderSuggestionModel.countDocuments(baseFilter);
  if (totalCount === 0) {
    return buildNotFoundResult("reorder suggestions", "organization");
  }

  const suggestions = await reorderSuggestionModel
    .find(baseFilter)
    .populate("productId", "name")
    .lean();

  const enhancedSuggestions = suggestions.map((s) => ({
    productName: s.productId?.name || "N/A",
    suggestedQuantity: s.suggestedQuantity,
    suggestedReorderDate: s.suggestedReorderDate,
    reasoning: s.reasoning,
    status: s.status,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.reorder_suggestions, enhancedSuggestions);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    tableTitle: "Reorder Suggestions",
    framingLine: `Found ${totalCount} AI reorder suggestion${totalCount === 1 ? "" : "s"}:`,
    reply: `Found ${totalCount} AI reorder suggestion${totalCount === 1 ? "" : "s"}:`,
    isAnalytical: true, // Analytical resolver -> MAY append insight if notable
    summary: { totalSuggestions: totalCount, isEmpty: false },
  };
};
