// services/resolvers/chatQueryPlanner.js
import mongoose from "mongoose";
import { resolveUserQuery } from "./userResolver.js";
import { resolveProductQuery } from "./productResolver.js";
import { resolveInvoiceQuery } from "./invoiceResolver.js";
import { resolvePurchaseOrderQuery } from "./purchaseOrderResolver.js";
import { resolveSupplierQuery } from "./supplierResolver.js";
import { resolveCategoryQuery } from "./categoryResolver.js";
import { resolveStockLogQuery } from "./stockLogResolver.js";
import { resolveAnomalyQuery } from "./anomalyResolver.js";
import { resolveForecastQuery } from "./forecastResolver.js";
import { resolveReorderQuery } from "./reorderResolver.js";
import { resolveInsightsQuery } from "./insightsResolver.js";

import {
  extractEntitiesFromQuery,
  extractExactIdentifier,
  stripTriggerPhrases,
  buildDisambiguationResult,
  buildNotFoundResult,
  escapeRegex,
} from "./chatEntityExtractor.js";
import { resolveJoinPathPrecedence, buildStrictOrgLookupStage } from "./schemaGraph.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import { handleInventory, handleSales } from "../chatTools.service.js";

import supplierModel from "../../models/supplier.model.js";
import categoryModel from "../../models/category.model.js";
import userModel from "../../models/user.model.js";
import productModel from "../../models/product.model.js";
import anomalyModel from "../../models/anomaly.model.js";
import invoiceModel from "../../models/invoice.model.js";
import purchaseOrderModel from "../../models/purchaseOrder.model.js";
import reorderSuggestionModel from "../../models/reorder.suggestion.model.js";

/**
 * Checks if a query is a conversational continuation request.
 * Guards against false positives: returns false if the query introduces new entities/filters.
 */
export const isContinuationQuery = (queryText = "", previousMetadata = null) => {
  if (!previousMetadata || !previousMetadata.queryState) return false;

  const lower = queryText.toLowerCase().trim();
  const continuationPhrases = ["show more", "next page", "show the rest", "next", "and the rest", "more results", "page 2", "page 3"];

  const matchesPhrase = continuationPhrases.some((phrase) => lower === phrase || lower.startsWith(phrase));
  if (!matchesPhrase) return false;

  // Guard against false positives: If query contains new specific nouns or filter keywords, it's a NEW query
  const newKeywords = ["forecast", "invoice", "admin", "staff", "supplier", "anomaly", "category", "po-", "inv-", "sku-"];
  const containsNewKeyword = newKeywords.some((kw) => lower.includes(kw));

  return !containsNewKeyword;
};

/**
 * Main query planner and dispatcher for natural language chat queries.
 */
export const planAndExecuteChatQuery = async ({
  queryText = "",
  args = {},
  organizationId = null,
  role = "admin",
  previousMetadata = null,
}) => {
  const lowerQuery = (queryText || "").toLowerCase().trim();

  // ABC Analysis Routing
  if (lowerQuery.includes("abc analysis") || lowerQuery.includes("abc classification")) {
    return await resolveInsightsQuery(queryText, { ...args, type: "abc_analysis" }, organizationId);
  }

  // Grouping Queries Routing
  if (lowerQuery.includes("group") || lowerQuery.includes("grouped")) {
    if (lowerQuery.includes("category") || lowerQuery.includes("categories")) {
      const res = await handleInventory({ groupBy: "category" }, organizationId);
      return {
        success: true,
        data: res.data,
        fields: res.fields,
        count: res.count,
        tableTitle: "Products Grouped by Category",
        framingLine: "Inventory grouped by category:",
        reply: "Inventory grouped by category:",
        isAnalytical: true,
        summary: res.summary,
      };
    }
    if (lowerQuery.includes("supplier") || lowerQuery.includes("suppliers")) {
      const res = await handleInventory({ groupBy: "supplier" }, organizationId);
      return {
        success: true,
        data: res.data,
        fields: res.fields,
        count: res.count,
        tableTitle: "Products Grouped by Supplier",
        framingLine: "Inventory grouped by supplier:",
        reply: "Inventory grouped by supplier:",
        isAnalytical: true,
        summary: res.summary,
      };
    }
    if (lowerQuery.includes("customer") || lowerQuery.includes("sales") || lowerQuery.includes("invoice")) {
      const res = await handleSales({ groupBy: "customer" }, organizationId);
      return {
        success: true,
        data: res.data,
        fields: res.fields,
        count: res.count,
        tableTitle: "Sales Grouped by Customer",
        framingLine: "Sales grouped by customer:",
        reply: "Sales grouped by customer:",
        isAnalytical: true,
        summary: res.summary,
      };
    }
  }

  // Check 0: Continuation Request Handling ("show more", "next page")
  if (isContinuationQuery(lowerQuery, previousMetadata)) {
    const prevState = previousMetadata.queryState;
    const nextPage = (prevState.page || 1) + 1;
    return await planAndExecuteChatQuery({
      queryText: prevState.queryText,
      args: { ...prevState.args, page: nextPage },
      organizationId,
      role,
      previousMetadata: null, // Avoid infinite loop
    });
  }

  // Check 1: Exact Number Matches (INV-xxxx, PO-xxxx)
  const exactIdent = extractExactIdentifier(queryText);
  if (exactIdent) {
    if (exactIdent.type === "invoiceNumber") {
      return await resolveInvoiceQuery(queryText, { ...args, invoiceNumber: exactIdent.value }, organizationId);
    }
    if (exactIdent.type === "poNumber") {
      return await resolvePurchaseOrderQuery(queryText, { ...args, poNumber: exactIdent.value }, organizationId);
    }
    if (exactIdent.type === "sku") {
      return await resolveProductQuery(queryText, { ...args, sku: exactIdent.value }, organizationId);
    }
  }

  // Check 2: Single-Entity Special Intents
  if (lowerQuery.includes("dead stock") || lowerQuery.includes("deadstock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "dead_stock" }, organizationId);
  }
  if (lowerQuery.includes("low stock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "low_stock" }, organizationId);
  }
  if (lowerQuery.includes("out of stock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "out_of_stock" }, organizationId);
  }
  if (lowerQuery.includes("admin") || lowerQuery.includes("staff member")) {
    return await resolveUserQuery(queryText, args, organizationId);
  }
  if (lowerQuery.includes("profit margin") || lowerQuery.includes("category margin")) {
    return await resolveCategoryQuery(queryText, args, organizationId);
  }

  // Step 3: Entity Extraction for Filter & Disambiguation Checks
  const extracted = await extractEntitiesFromQuery(queryText, organizationId);

  // Check for Filter Entity Ambiguity
  if (extracted.suppliers.length > 1 && !lowerQuery.includes("all suppliers")) {
    return buildDisambiguationResult("suppliers", extracted.cleanedQuery, extracted.suppliers);
  }
  if (extracted.categories.length > 1 && !lowerQuery.includes("all categories")) {
    return buildDisambiguationResult("categories", extracted.cleanedQuery, extracted.categories);
  }
  if (extracted.users.length > 1 && !lowerQuery.includes("all users")) {
    return buildDisambiguationResult("users", extracted.cleanedQuery, extracted.users);
  }

  const matchedSupplier = extracted.suppliers.length === 1 ? extracted.suppliers[0] : null;
  const matchedCategory = extracted.categories.length === 1 ? extracted.categories[0] : null;
  const matchedUser = extracted.users.length === 1 ? extracted.users[0] : null;

  // Step 4: Cross-Model / Combined Queries Handling

  // Combo Scenario A: Products from [Supplier Name] below reorder threshold
  if (
    (matchedSupplier || lowerQuery.includes("supplier")) &&
    (lowerQuery.includes("product") || lowerQuery.includes("below reorder threshold") || lowerQuery.includes("reorder threshold"))
  ) {
    if (!matchedSupplier && !lowerQuery.includes("all suppliers")) {
      return buildNotFoundResult("supplier", extracted.cleanedQuery);
    }

    const isTransactionalIntent = lowerQuery.includes("po") || lowerQuery.includes("purchased from") || lowerQuery.includes("ordered from");
    const pathPrecedence = resolveJoinPathPrecedence("Product", "Supplier", isTransactionalIntent);

    const baseMatch = organizationId
      ? { organizationId: new mongoose.Types.ObjectId(organizationId), isActive: true }
      : { isActive: true };

    if (matchedSupplier) {
      baseMatch.supplierId = matchedSupplier._id;
    }
    if (lowerQuery.includes("below reorder threshold") || lowerQuery.includes("reorder threshold")) {
      baseMatch.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
    }

    const limitValue = Math.min(args.limit || 25, 50);
    const pageValue = Math.max(args.page || 1, 1);
    const skipValue = (pageValue - 1) * limitValue;

    const totalCount = await productModel.countDocuments(baseMatch);
    if (totalCount === 0) {
      return buildNotFoundResult("products", `${matchedSupplier?.name || "supplier"} criteria`);
    }

    const products = await productModel
      .find(baseMatch)
      .populate("categoryId", "name")
      .populate("supplierId", "name")
      .skip(skipValue)
      .limit(limitValue)
      .lean();

    const enhancedProducts = products.map((p) => {
      const profit = p.sellingPrice - p.costPrice;
      const margin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
      return {
        productName: p.name,
        sku: p.sku,
        categoryName: p.categoryId?.name || "N/A",
        supplierName: p.supplierId?.name || matchedSupplier?.name || "N/A",
        quantity: p.quantity,
        reorderThreshold: p.reorderThreshold,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        status: p.quantity === 0 ? "🔴 Out of Stock" : p.quantity <= p.reorderThreshold ? "🟡 Low Stock" : "🟢 In Stock",
      };
    });

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.products_detailed, enhancedProducts);

    const supplierLabel = matchedSupplier ? matchedSupplier.name : "all suppliers";
    const startItem = skipValue + 1;
    const endItem = Math.min(skipValue + limitValue, totalCount);
    const cappingText = totalCount > limitValue ? ` (showing top ${startItem}–${endItem} of ${totalCount} results)` : "";

    const framingLine = `Found ${totalCount} product${totalCount === 1 ? "" : "s"} (${pathPrecedence.description}: ${supplierLabel}) currently below reorder threshold${cappingText}:`;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: totalCount,
      page: pageValue,
      totalPages: Math.ceil(totalCount / limitValue),
      pageSize: limitValue,
      tableTitle: `Products from ${supplierLabel}`,
      framingLine,
      reply: framingLine,
      isAnalytical: true, // Analytical stock check -> MAY append insight if notable
      queryState: { queryText, args, organizationId },
      summary: { totalProducts: totalCount, isEmpty: false },
    };
  }

  // Combo Scenario E: Products in Category (e.g., "show me product from electronic categories")
  if (
    (lowerQuery.includes("product") || lowerQuery.includes("products")) &&
    (matchedCategory || lowerQuery.includes("categor"))
  ) {
    const catSearch = matchedCategory
      ? matchedCategory.name
      : extracted.cleanedQuery.replace(/^(from|in)\s+/i, "").replace(/\s+(categories|category)$/i, "");
    return await resolveProductQuery(queryText, { ...args, category: catSearch }, organizationId);
  }

  // Combo Scenario B: Invoices created by [Staff Name]
  if (matchedUser && (lowerQuery.includes("invoice") || lowerQuery.includes("sales"))) {
    const baseMatch = organizationId
      ? { organizationId: new mongoose.Types.ObjectId(organizationId), createdBy: matchedUser._id }
      : { createdBy: matchedUser._id };

    const totalCount = await invoiceModel.countDocuments(baseMatch);
    if (totalCount === 0) {
      return buildNotFoundResult("invoices created by staff", matchedUser.name);
    }

    const invoices = await invoiceModel.find(baseMatch).populate("createdBy", "name").sort({ createdAt: -1 }).lean();
    const enhancedInvoices = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      date: inv.createdAt,
      subtotal: inv.subtotal,
      tax: inv.tax,
      discount: inv.discount || 0,
      total: inv.total,
      status: inv.status,
      createdBy: matchedUser.name,
    }));

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.invoices_detailed, enhancedInvoices);
    const framingLine = `Found ${totalCount} invoice${totalCount === 1 ? "" : "s"} created by staff member ${matchedUser.name}:`;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: totalCount,
      tableTitle: `Invoices by ${matchedUser.name}`,
      framingLine,
      reply: framingLine,
      isAnalytical: false, // Record lookup -> NO insight
      queryState: { queryText, args, organizationId },
      summary: { totalInvoices: totalCount, isEmpty: false },
    };
  }

  // Combo Scenario C: Products with unresolved anomalies and who supplies them (3-hop join)
  if (lowerQuery.includes("anomal") && (lowerQuery.includes("supplier") || lowerQuery.includes("who supplies"))) {
    const orgObjectId = organizationId ? new mongoose.Types.ObjectId(organizationId) : null;
    const pathPrecedence = resolveJoinPathPrecedence("Anomaly", "Supplier");

    const pipeline = [
      {
        $match: {
          ...(orgObjectId ? { organizationId: orgObjectId } : {}),
          isResolved: false,
        },
      },
      buildStrictOrgLookupStage({
        fromCollection: "products",
        localField: "productId",
        foreignField: "_id",
        asField: "productDoc",
        organizationId,
      }),
      { $unwind: "$productDoc" },
      buildStrictOrgLookupStage({
        fromCollection: "suppliers",
        localField: "productDoc.supplierId",
        foreignField: "_id",
        asField: "supplierDoc",
        organizationId,
      }),
      { $unwind: { path: "$supplierDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: "$productDoc.name",
          sku: "$productDoc.sku",
          anomalyType: "$type",
          severity: "$severity",
          supplierName: { $ifNull: ["$supplierDoc.name", "Unassigned"] },
          contactPerson: { $ifNull: ["$supplierDoc.contactPerson", "N/A"] },
        },
      },
    ];

    const results = await anomalyModel.aggregate(pipeline);
    if (results.length === 0) {
      return buildNotFoundResult("unresolved anomalies", "organization");
    }

    const anomalyJoinColumns = [
      { key: "productName", label: "Product Name", type: "string" },
      { key: "sku", label: "SKU", type: "string" },
      { key: "anomalyType", label: "Anomaly Type", type: "string" },
      { key: "severity", label: "Severity", type: "string", align: "center" },
      { key: "supplierName", label: "Supplier Name", type: "string" },
      { key: "contactPerson", label: "Supplier Contact", type: "string" },
    ];

    const { columns, rows } = buildFlatTable(anomalyJoinColumns, results);
    const framingLine = `Found ${results.length} product${results.length === 1 ? "" : "s"} with unresolved anomalies (${pathPrecedence.description}):`;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: results.length,
      tableTitle: "Anomalies with Suppliers",
      framingLine,
      reply: framingLine,
      isAnalytical: true, // Analytical risk check -> MAY append insight if notable
      queryState: { queryText, args, organizationId },
      summary: { totalAnomalies: results.length, isEmpty: false },
    };
  }

  // Combo Scenario D: Reorder suggestions for products in Category
  if (matchedCategory && (lowerQuery.includes("reorder") || lowerQuery.includes("suggestion"))) {
    const orgObjectId = organizationId ? new mongoose.Types.ObjectId(organizationId) : null;
    const pathPrecedence = resolveJoinPathPrecedence("ReorderSuggestion", "Category");

    const pipeline = [
      { $match: orgObjectId ? { organizationId: orgObjectId } : {} },
      buildStrictOrgLookupStage({
        fromCollection: "products",
        localField: "productId",
        foreignField: "_id",
        asField: "productDoc",
        organizationId,
      }),
      { $unwind: "$productDoc" },
      { $match: { "productDoc.categoryId": matchedCategory._id } },
      {
        $project: {
          productName: "$productDoc.name",
          suggestedQuantity: "$suggestedQuantity",
          suggestedReorderDate: "$suggestedReorderDate",
          reasoning: "$reasoning",
          status: "$status",
        },
      },
    ];

    const suggestions = await reorderSuggestionModel.aggregate(pipeline);
    if (suggestions.length === 0) {
      return buildNotFoundResult("reorder suggestions for category", matchedCategory.name);
    }

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.reorder_suggestions, suggestions);
    const framingLine = `Found ${suggestions.length} reorder suggestion${suggestions.length === 1 ? "" : "s"} (${pathPrecedence.description}: ${matchedCategory.name}):`;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: suggestions.length,
      tableTitle: `Reorders for ${matchedCategory.name}`,
      framingLine,
      reply: framingLine,
      isAnalytical: true, // Analytical reorder check -> MAY append insight if notable
      queryState: { queryText, args, organizationId },
      summary: { totalSuggestions: suggestions.length, isEmpty: false },
    };
  }

  // Fallback: Delegate to per-entity resolvers based on keywords
  const isGenericTerm = (term = "") => {
    const t = (term || "").toLowerCase().trim();
    return [
      "",
      "all",
      "product",
      "products",
      "all products",
      "invoice",
      "invoices",
      "all invoices",
      "user",
      "users",
      "org users",
      "all users",
      "supplier",
      "suppliers",
      "all suppliers",
      "category",
      "categories",
      "all categories",
    ].includes(t);
  };

  const cleanSearchTerm = isGenericTerm(extracted.cleanedQuery) ? "" : extracted.cleanedQuery;

  if (lowerQuery.includes("user") || lowerQuery.includes("admin") || lowerQuery.includes("staff") || lowerQuery.includes("member") || lowerQuery.includes("team")) {
    return await resolveUserQuery(queryText, { ...args, search: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("dead stock") || lowerQuery.includes("deadstock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "dead_stock", search: "" }, organizationId);
  }
  if (lowerQuery.includes("low stock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "low_stock", search: "" }, organizationId);
  }
  if (lowerQuery.includes("out of stock")) {
    return await resolveProductQuery(queryText, { ...args, stockStatus: "out_of_stock", search: "" }, organizationId);
  }
  if (lowerQuery.includes("product") || lowerQuery.includes("item") || lowerQuery.includes("stock")) {
    return await resolveProductQuery(queryText, { ...args, search: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("invoice") || lowerQuery.includes("sale")) {
    return await resolveInvoiceQuery(queryText, { ...args, search: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("po") || lowerQuery.includes("purchase order")) {
    return await resolvePurchaseOrderQuery(queryText, { ...args, search: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("supplier") || lowerQuery.includes("vendor")) {
    return await resolveSupplierQuery(queryText, { ...args, identifier: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("categor")) {
    return await resolveCategoryQuery(queryText, { ...args, category: cleanSearchTerm }, organizationId);
  }
  if (lowerQuery.includes("transaction") || lowerQuery.includes("movement") || lowerQuery.includes("log")) {
    return await resolveStockLogQuery(queryText, args, organizationId);
  }
  if (lowerQuery.includes("anomal")) {
    return await resolveAnomalyQuery(queryText, args, organizationId);
  }
  if (lowerQuery.includes("forecast") || lowerQuery.includes("stockout")) {
    return await resolveForecastQuery(queryText, args, organizationId);
  }
  if (lowerQuery.includes("reorder") || lowerQuery.includes("suggest")) {
    return await resolveReorderQuery(queryText, args, organizationId);
  }

  // Final fallback: Insights summary
  return await resolveInsightsQuery(queryText, args, organizationId);
};
