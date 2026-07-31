// services/resolvers/stockLogResolver.js
import stockLogModel from "../../models/stockLog.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable, FORMAT_TYPES } from "../chatResponseFormatter.service.js";
import { buildNotFoundResult } from "./chatEntityExtractor.js";

export const resolveStockLogQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};

  if (args.type && args.type !== "all") {
    baseFilter.type = args.type;
  }
  if (args.reason && args.reason !== "all") {
    baseFilter.reason = args.reason;
  }

  const limitValue = Math.min(args.limit || 25, 50);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await stockLogModel.countDocuments(baseFilter);
  const totalPages = Math.ceil(totalCount / limitValue);

  if (totalCount === 0) {
    return buildNotFoundResult("stock transactions", "filters");
  }

  const logs = await stockLogModel
    .find(baseFilter)
    .populate("productId", "name sku")
    .populate("performedBy", "name")
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedLogs = logs.map((l) => ({
    productName: l.productId?.name || "N/A",
    type: l.type === "in" ? "📥 In" : "📤 Out",
    reason: l.reason,
    quantity: l.quantity,
    performedBy: l.performedBy?.name || "N/A",
    createdAt: l.createdAt,
  }));

  const logColumns = [
    { key: "productName", label: "Product Name", type: "string" },
    { key: "type", label: "Type", type: "string", align: "center" },
    { key: "reason", label: "Reason", type: "string" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "performedBy", label: "Performed By", type: "string" },
    { key: "createdAt", label: "Date", type: "string", format: FORMAT_TYPES.DATE },
  ];

  const { columns, rows } = buildFlatTable(logColumns, enhancedLogs);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    tableTitle: "Stock Transactions",
    framingLine: `Found ${totalCount} stock transaction log${totalCount === 1 ? "" : "s"}:`,
    reply: `Found ${totalCount} stock transaction log${totalCount === 1 ? "" : "s"}:`,
    isAnalytical: true, // Analytical check -> MAY append insight if notable
    summary: { totalTransactions: totalCount, isEmpty: false },
  };
};
