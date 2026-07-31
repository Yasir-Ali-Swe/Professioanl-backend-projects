// services/resolvers/chatEntityExtractor.js
import mongoose from "mongoose";
import userModel from "../../models/user.model.js";
import productModel from "../../models/product.model.js";
import categoryModel from "../../models/category.model.js";
import supplierModel from "../../models/supplier.model.js";
import invoiceModel from "../../models/invoice.model.js";
import purchaseOrderModel from "../../models/purchaseOrder.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";

/**
 * Escapes regex special characters in a string.
 */
export const escapeRegex = (string) => {
  if (!string) return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Strips common trigger and filler phrases from user queries.
 */
export const stripTriggerPhrases = (text = "") => {
  if (!text) return "";
  let clean = text.trim();
  const triggerPatterns = [
    /^(show|give|get|find|list|display|view|fetch)(\s+me)?(\s+the\b|\s+a\b|\s+an\b|\s+org\b)?/i,
    /^(full|complete|all)\s+(details|detail|profile|info|information)\s+(of|for|about)?/i,
    /^(profile|details|detail|info|information)\s+(of|for|about)?/i,
    /^(what|who|which)\s+(is|are|were)(\s+the\b|\s+a\b|\s+an\b)?/i,
    /^(can\s+you|please|could\s+you)\s+(show|give|tell|find|list)/i,
    /^(tell\s+me\s+about)/i,
  ];

  for (const pattern of triggerPatterns) {
    clean = clean.replace(pattern, "").trim();
  }

  // Strip standalone entity type prefix if followed by specific identifier
  clean = clean.replace(/^(product|products|supplier|suppliers|category|categories|invoice|invoices|po|purchase order)\s+/i, "").trim();

  return clean;
};

/**
 * Extracts exact invoice, purchase order, or SKU identifier patterns.
 */
export const extractExactIdentifier = (query = "") => {
  const q = query.trim();
  const invoiceMatch = q.match(/\b(INV-\d{4}-\d+|INV-\d+)\b/i);
  if (invoiceMatch) return { type: "invoiceNumber", value: invoiceMatch[1].toUpperCase() };

  const poMatch = q.match(/\b(PO-\d{4}-\d+|PO-\d+)\b/i);
  if (poMatch) return { type: "poNumber", value: poMatch[1].toUpperCase() };

  const skuMatch = q.match(/\b([A-Z0-9]{2,8}-[A-Z0-9-]{2,12})\b/i);
  if (skuMatch) {
    const val = skuMatch[1].toUpperCase();
    if (!val.startsWith("INV-") && !val.startsWith("PO-")) {
      return { type: "sku", value: val };
    }
  }

  return null;
};

/**
 * Fuzzy/partial matching against DB entities for a given organizationId.
 * Returns { matches: [...], isAmbiguous: boolean, isNotFound: boolean }
 */
export const extractEntitiesFromQuery = async (query = "", organizationId = null) => {
  const cleanedQuery = stripTriggerPhrases(query);
  const lowerCleaned = cleanedQuery.toLowerCase().trim();

  // Generic entity keywords must NOT trigger specific entity fuzzy search
  const genericListPhrases = [
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
    "team members",
    "team members of organization",
  ];

  if (!cleanedQuery || genericListPhrases.includes(lowerCleaned)) {
    return {
      cleanedQuery,
      users: [],
      products: [],
      suppliers: [],
      categories: [],
    };
  }

  const baseFilter = organizationId ? { organizationId } : {};

  // Check Users (both via cleanedQuery and checking if user.name appears in query)
  const allUsers = await userModel.find(baseFilter).select("_id name email role").lean();
  const matchingUsers = allUsers.filter(
    (u) => u.name && query.toLowerCase().includes(u.name.toLowerCase())
  );
  if (matchingUsers.length === 0 && cleanedQuery) {
    const userRegex = new RegExp(escapeRegex(cleanedQuery), "i");
    matchingUsers.push(...allUsers.filter((u) => userRegex.test(u.name) || userRegex.test(u.email)));
  }

  // Check Products
  const productQuery = { ...baseFilter, isActive: true };
  const productRegex = new RegExp(escapeRegex(cleanedQuery), "i");
  productQuery.$or = [{ name: productRegex }, { sku: productRegex }];
  const matchingProducts = await productModel.find(productQuery).select("_id name sku sellingPrice costPrice categoryId supplierId").lean();

  // Check Suppliers
  const supplierQuery = { ...baseFilter };
  const supplierRegex = new RegExp(escapeRegex(cleanedQuery), "i");
  supplierQuery.$or = [{ name: supplierRegex }, { contactPerson: supplierRegex }];
  const matchingSuppliers = await supplierModel.find(supplierQuery).select("_id name contactPerson email phone").lean();

  // Check Categories
  const categoryQuery = { ...baseFilter };
  const categoryRegex = new RegExp(escapeRegex(cleanedQuery), "i");
  categoryQuery.name = categoryRegex;
  const matchingCategories = await categoryModel.find(categoryQuery).select("_id name categorySlug").lean();

  return {
    cleanedQuery,
    users: matchingUsers,
    products: matchingProducts,
    suppliers: matchingSuppliers,
    categories: matchingCategories,
  };
};

/**
 * Builds an explicit disambiguation prompt when a name matches > 1 candidate.
 */
export const buildDisambiguationResult = (entityType, searchTerm, candidates) => {
  const candidateList = candidates
    .map((c, idx) => `${idx + 1}) ${c.name || c.userName || c.invoiceNumber || c.poNumber} (${c.email || c.sku || c.role || "Record"})`)
    .join(", ");

  let colDef = COLUMN_DEFINITIONS.suppliers_compact;
  if (entityType === "products") colDef = COLUMN_DEFINITIONS.products_compact;
  else if (entityType === "invoices") colDef = COLUMN_DEFINITIONS.invoices_compact;
  else if (entityType === "users") colDef = COLUMN_DEFINITIONS.users_compact;
  else if (entityType === "categories") colDef = COLUMN_DEFINITIONS.categories_compact;

  const { columns, rows } = buildFlatTable(colDef, candidates);
  const message = `Found multiple ${entityType} matching "${searchTerm}": ${candidateList}. Which one did you mean?`;
  return {
    success: true,
    isDisambiguation: true,
    data: rows,
    fields: columns,
    count: candidates.length,
    framingLine: message,
    reply: message,
    isAnalytical: false,
    tableTitle: `Ambiguous ${entityType} Candidates`,
  };
};

/**
 * Builds an explicit not-found response when 0 records match.
 */
export const buildNotFoundResult = (entityType, searchTerm) => {
  const message = `No ${entityType} found matching "${searchTerm}".`;
  return {
    success: true,
    isNotFound: true,
    data: [],
    framingLine: message,
    reply: `${message} Please check the spelling or try a different search.`,
    tableTitle: "No Matching Records",
  };
};
