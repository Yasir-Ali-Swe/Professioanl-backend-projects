// services/resolvers/invoiceResolver.js
import invoiceModel from "../../models/invoice.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable, FORMAT_TYPES } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  extractExactIdentifier,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

export const resolveInvoiceQuery = async (queryText = "", args = {}, organizationId = null) => {
  const lowerQuery = (queryText || "").toLowerCase();
  const baseFilter = organizationId ? { organizationId } : {};

  // Step 1: Prefer Exact Number Match first
  const exactIdent = extractExactIdentifier(queryText);
  const rawSearch = exactIdent?.type === "invoiceNumber" ? exactIdent.value : (args.identifier || args.invoiceNumber || args.search);
  const isGeneric = ["all invoices", "invoices", "invoice", "all"].includes((rawSearch || "").toLowerCase().trim());
  const invoiceSearchTerm = isGeneric ? "" : rawSearch;

  if (invoiceSearchTerm) {
    const escaped = escapeRegex(invoiceSearchTerm);
    const flexPattern = escaped.replace(/(\d+)$/, (match, num) => `0*${num}`);
    const invRegex = new RegExp(`^${flexPattern}$`, "i");
    const matchingInvoices = await invoiceModel
      .find({ ...baseFilter, invoiceNumber: invRegex })
      .populate("createdBy", "name email")
      .populate("products.productId", "name sku unit costPrice sellingPrice")
      .lean();

    if (matchingInvoices.length > 1) {
      return buildDisambiguationResult("invoices", invoiceSearchTerm, matchingInvoices);
    }

    if (matchingInvoices.length === 1) {
      const inv = matchingInvoices[0];

      const asksForItemsOnly =
        lowerQuery.includes("product") ||
        lowerQuery.includes("item") ||
        lowerQuery.includes("included") ||
        lowerQuery.includes("inside") ||
        lowerQuery.includes("content") ||
        lowerQuery.includes("bought") ||
        lowerQuery.includes("purchase") ||
        lowerQuery.includes("purchased") ||
        lowerQuery.includes("what is in") ||
        lowerQuery.includes("what product") ||
        lowerQuery.includes("which product") ||
        lowerQuery.includes("contains");

      const lineItems = (inv.products || []).map((item) => ({
        productName: item.productId?.name || "Item",
        sku: item.productId?.sku || "N/A",
        quantity: item.quantity,
        sellingPrice: item.sellingPrice || item.productId?.sellingPrice || 0,
        subtotal: item.subtotal || item.quantity * (item.sellingPrice || 0),
      }));

      if (asksForItemsOnly) {
        const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.invoice_items, lineItems);
        return {
          success: true,
          data: rows,
          fields: columns,
          count: lineItems.length,
          tableTitle: `Products Purchased in Invoice ${inv.invoiceNumber}`,
          framingLine: `Here are the ${lineItems.length} product(s) purchased in invoice ${inv.invoiceNumber} (customer: ${inv.customerName}):`,
          reply: `Here are the ${lineItems.length} product(s) purchased in invoice ${inv.invoiceNumber} (customer: ${inv.customerName}):`,
          isAnalytical: false,
          summary: {
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            totalItems: lineItems.length,
            totalAmount: inv.total,
            isEmpty: lineItems.length === 0,
          },
        };
      }

      const enhancedInvoice = [
        {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          date: inv.createdAt,
          subtotal: inv.subtotal,
          tax: inv.tax,
          discount: inv.discount || 0,
          total: Math.round(inv.total * 100) / 100,
          status: inv.status,
          createdBy: inv.createdBy?.name || "N/A",
        },
      ];

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.invoices_detailed, enhancedInvoice);

      return {
        success: true,
        data: rows,
        fields: columns,
        count: 1,
        tableTitle: `Invoice Details: ${inv.invoiceNumber}`,
        framingLine: `Here is the full information for invoice ${inv.invoiceNumber} (customer: ${inv.customerName}):`,
        reply: `Here is the full information for invoice ${inv.invoiceNumber} (customer: ${inv.customerName}):`,
        isAnalytical: false, // Record lookup -> NO insight
        summary: {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          total: inv.total,
          status: inv.status,
          lineItems,
          isEmpty: false,
        },
      };
    }

    if (exactIdent || args.identifier || args.invoiceNumber) {
      return buildNotFoundResult("invoice", invoiceSearchTerm);
    }
  }

  // Step 2: List / Filtered Invoices Query
  const filter = { ...baseFilter };

  if (args.customer) {
    filter.customerName = new RegExp(escapeRegex(args.customer), "i");
  }

  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  const limitValue = Math.min(args.limit || 25, 50);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await invoiceModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  if (totalCount === 0) {
    return buildNotFoundResult("invoices", args.customer || args.status || "query");
  }

  const rawInvoices = await invoiceModel
    .find(filter)
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedInvoices = rawInvoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber, // Explicit plain string!
    customerName: inv.customerName,
    date: inv.createdAt,
    subtotal: inv.subtotal,
    tax: inv.tax,
    discount: inv.discount || 0,
    total: Math.round(inv.total * 100) / 100,
    status: inv.status,
    createdBy: inv.createdBy?.name || "N/A",
  }));

  const isDetailed = lowerQuery.includes("detail") || lowerQuery.includes("full");
  const columnConfig = isDetailed ? COLUMN_DEFINITIONS.invoices_detailed : COLUMN_DEFINITIONS.invoices_compact;
  const { columns, rows } = buildFlatTable(columnConfig, enhancedInvoices);

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
    tableTitle: "Invoices",
    framingLine: `Found ${totalCount} invoice${totalCount === 1 ? "" : "s"}${args.customer ? ` for customer "${args.customer}"` : ""}${cappingText}:`,
    reply: `Found ${totalCount} invoice${totalCount === 1 ? "" : "s"}${args.customer ? ` for customer "${args.customer}"` : ""}${cappingText}:`,
    isAnalytical: false, // Record lookup -> NO insight
    summary: {
      totalInvoices: totalCount,
      totalRevenue: rawInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
      isEmpty: false,
    },
  };
};
