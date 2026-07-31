// services/resolvers/purchaseOrderResolver.js
import purchaseOrderModel from "../../models/purchaseOrder.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  extractExactIdentifier,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

export const resolvePurchaseOrderQuery = async (queryText = "", args = {}, organizationId = null) => {
  const lowerQuery = (queryText || "").toLowerCase();
  const baseFilter = organizationId ? { organizationId } : {};

  // Step 1: Exact PO Number Match First
  const exactIdent = extractExactIdentifier(queryText);
  const poSearchTerm = exactIdent?.type === "poNumber" ? exactIdent.value : (args.identifier || args.poNumber || args.search);

  if (poSearchTerm) {
    const poRegex = new RegExp(`^${escapeRegex(poSearchTerm)}$`, "i");
    const matchingPOs = await purchaseOrderModel
      .find({ ...baseFilter, poNumber: poRegex })
      .populate("supplierId", "name contactPerson email")
      .populate("createdBy", "name")
      .populate("approvedBy", "name")
      .populate("items.productId", "name sku costPrice")
      .lean();

    if (matchingPOs.length > 1) {
      return buildDisambiguationResult("purchase orders", poSearchTerm, matchingPOs);
    }

    if (matchingPOs.length === 1) {
      const po = matchingPOs[0];
      const lineItems = (po.items || []).map((item) => ({
        productName: item.productId?.name || "Item",
        sku: item.productId?.sku || "N/A",
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.quantity * item.unitCost,
      }));

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.purchase_order_items, lineItems);

      return {
        success: true,
        data: rows,
        fields: columns,
        count: lineItems.length,
        tableTitle: `PO Details: ${po.poNumber}`,
        framingLine: `Here is purchase order ${po.poNumber} from supplier ${po.supplierId?.name || "N/A"} (status: ${po.status}):`,
        reply: `Here is purchase order ${po.poNumber} from supplier ${po.supplierId?.name || "N/A"} (status: ${po.status}):`,
        isAnalytical: false, // Record lookup -> NO insight
        summary: {
          poNumber: po.poNumber,
          supplierName: po.supplierId?.name || "N/A",
          totalCost: po.totalCost,
          status: po.status,
          createdBy: po.createdBy?.name || "N/A",
          approvedBy: po.approvedBy?.name || "N/A",
          lineItems,
          isEmpty: false,
        },
      };
    }

    if (exactIdent || args.identifier || args.poNumber) {
      return buildNotFoundResult("purchase order", poSearchTerm);
    }
  }

  // Step 2: List / Filtered Purchase Orders Query
  const filter = { ...baseFilter };

  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  const limitValue = Math.min(args.limit || 25, 50);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await purchaseOrderModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  if (totalCount === 0) {
    return buildNotFoundResult("purchase orders", args.status || "query");
  }

  const rawPOs = await purchaseOrderModel
    .find(filter)
    .populate("supplierId", "name")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedPOs = rawPOs.map((o) => ({
    poNumber: o.poNumber, // Plain text!
    supplierName: o.supplierId?.name || "N/A",
    date: o.createdAt,
    totalCost: Math.round(o.totalCost * 100) / 100,
    status: o.status,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.purchase_orders_compact, enhancedPOs);

  const startItem = skipValue + 1;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const cappingText = totalCount > limitValue ? ` (showing top ${startItem}–${endItem} of ${totalCount} results)` : "";

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    tableTitle: "Purchase Orders",
    framingLine: `Found ${totalCount} purchase order${totalCount === 1 ? "" : "s"}${args.status ? ` [status: ${args.status}]` : ""}${cappingText}:`,
    reply: `Found ${totalCount} purchase order${totalCount === 1 ? "" : "s"}${args.status ? ` [status: ${args.status}]` : ""}${cappingText}:`,
    isAnalytical: false, // Record lookup -> NO insight
    summary: {
      totalOrders: totalCount,
      totalCost: rawPOs.reduce((sum, o) => sum + (o.totalCost || 0), 0),
      isEmpty: false,
    },
  };
};
