// services/resolvers/productResolver.js
import productModel from "../../models/product.model.js";
import categoryModel from "../../models/category.model.js";
import supplierModel from "../../models/supplier.model.js";
import invoiceModel from "../../models/invoice.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

const getActiveSoldProductIds = async (organizationId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const baseFilter = { status: "paid", createdAt: { $gte: thirtyDaysAgo } };
  if (organizationId) baseFilter.organizationId = organizationId;

  const activeSales = await invoiceModel.find(baseFilter).select("products.productId").lean();
  const idSet = new Set();
  for (const sale of activeSales) {
    for (const p of sale.products || []) {
      if (p.productId) idSet.add(p.productId.toString());
    }
  }
  return Array.from(idSet);
};

export const resolveProductQuery = async (queryText = "", args = {}, organizationId = null) => {
  const lowerQuery = (queryText || "").toLowerCase();
  const baseFilter = organizationId ? { organizationId, isActive: true } : { isActive: true };

  // Case 1: Specific Product Full Details Lookup by SKU or Name
  const rawSearch = args.search || args.sku || args.identifier || stripTriggerPhrases(queryText);
  const lowerRaw = (rawSearch || "").toLowerCase().trim();
  const isGeneric =
    [
      "all products",
      "products",
      "product",
      "all",
      "dead stock",
      "dead stock products",
      "dead stock products in our inventory",
      "low stock",
      "low stock products",
      "out of stock",
      "out of stock products",
      "in stock",
      "in stock products",
    ].includes(lowerRaw) || Boolean(args.stockStatus);
  const searchTerm = isGeneric ? "" : rawSearch;

  if (searchTerm && !args.category && !args.stockStatus) {
    const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
    const matchingProducts = await productModel
      .find({
        ...baseFilter,
        $or: [{ name: searchRegex }, { sku: searchRegex }],
      })
      .populate("categoryId", "name")
      .populate("supplierId", "name contactPerson")
      .populate("createdBy", "name")
      .lean();

    if (matchingProducts.length > 1) {
      return buildDisambiguationResult("products", searchTerm, matchingProducts);
    }

    if (matchingProducts.length === 1) {
      const p = matchingProducts[0];
      const profit = p.sellingPrice - p.costPrice;
      const profitMargin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

      const enhancedProduct = [
        {
          productName: p.name,
          sku: p.sku,
          categoryName: p.categoryId?.name || "N/A",
          supplierName: p.supplierId?.name || "N/A",
          quantity: p.quantity,
          reorderThreshold: p.reorderThreshold,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          profit: Math.round(profit * 100) / 100,
          margin: Math.round(profitMargin * 100) / 100,
          status:
            p.quantity === 0
              ? "🔴 Out of Stock"
              : p.quantity <= p.reorderThreshold
                ? "🟡 Low Stock"
                : "🟢 In Stock",
          createdAt: p.createdAt,
        },
      ];

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.products_detailed, enhancedProduct);

      return {
        success: true,
        data: rows,
        fields: columns,
        count: 1,
        tableTitle: `Product Details: ${p.name}`,
        framingLine: `Here are the full details for product "${p.name}" (SKU: ${p.sku}):`,
        reply: `Here are the full details for product "${p.name}" (SKU: ${p.sku}):`,
        isAnalytical: false, // Plain lookup -> NO insight
        summary: {
          productName: p.name,
          sku: p.sku,
          profit: Math.round(profit * 100) / 100,
          margin: `${Math.round(profitMargin)}%`,
          isEmpty: false,
        },
      };
    }

    // If a specific single search term was supplied and matched 0, return explicit not-found
    if (args.search || args.sku || args.identifier) {
      return buildNotFoundResult("product", searchTerm);
    }
  }

  // Case 2: Stock Status or Category Filters or Listing
  const filter = { ...baseFilter };

  if (args.category) {
    const categoryDoc = await categoryModel.findOne({
      ...(organizationId ? { organizationId } : {}),
      name: new RegExp(escapeRegex(args.category), "i"),
    });

    if (!categoryDoc) {
      return buildNotFoundResult("category", args.category);
    }
    filter.categoryId = categoryDoc._id;
  }

  if (args.supplier) {
    const supplierDoc = await supplierModel.findOne({
      ...(organizationId ? { organizationId } : {}),
      name: new RegExp(escapeRegex(args.supplier), "i"),
    });

    if (!supplierDoc) {
      return buildNotFoundResult("supplier", args.supplier);
    }
    filter.supplierId = supplierDoc._id;
  }

  const activeProductIds = await getActiveSoldProductIds(organizationId);

  const isDeadStockQuery = args.stockStatus === "dead_stock" || lowerQuery.includes("dead stock");

  if (args.stockStatus || isDeadStockQuery) {
    const statusType = args.stockStatus || (isDeadStockQuery ? "dead_stock" : null);
    switch (statusType) {
      case "low_stock":
        filter.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
        filter.quantity = { $gt: 0 };
        break;
      case "out_of_stock":
        filter.quantity = 0;
        break;
      case "dead_stock": {
        filter.quantity = { $gt: 0 };
        filter._id = { $nin: activeProductIds };
        break;
      }
      case "in_stock":
        filter.quantity = { $gt: 0 };
        break;
    }
  }

  const limitValue = Math.min(args.limit || 25, 50);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await productModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  if (totalCount === 0) {
    return buildNotFoundResult("products", searchTerm || args.category || args.stockStatus || "criteria");
  }

  const products = await productModel
    .find(filter)
    .populate("categoryId", "name")
    .populate("supplierId", "name")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedProducts = products.map((p) => {
    const profit = p.sellingPrice - p.costPrice;
    const profitMargin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

    let statusDisplay = p.quantity === 0
      ? "🔴 Out of Stock"
      : p.quantity <= p.reorderThreshold
        ? "🟡 Low Stock"
        : "🟢 In Stock";

    if (isDeadStockQuery && p.quantity > 0) {
      statusDisplay = "⚠️ Dead Stock (Unsold 30+ Days)";
    }

    return {
      productName: p.name,
      sku: p.sku,
      categoryName: p.categoryId?.name || "N/A",
      supplierName: p.supplierId?.name || "N/A",
      quantity: p.quantity,
      reorderThreshold: p.reorderThreshold,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(profitMargin * 100) / 100,
      status: statusDisplay,
    };
  });

  const isDetailed = lowerQuery.includes("detail") || lowerQuery.includes("profit") || lowerQuery.includes("margin");
  const columnConfig = isDetailed ? COLUMN_DEFINITIONS.products_detailed : COLUMN_DEFINITIONS.products_compact;
  const { columns, rows } = buildFlatTable(columnConfig, enhancedProducts);

  const startItem = skipValue + 1;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const cappingText = totalCount > limitValue ? ` (showing top ${startItem}–${endItem} of ${totalCount} results)` : "";

  const categoryLabel = args.category ? ` in category "${args.category}"` : "";

  const customTitle = isDeadStockQuery
    ? "Dead Stock Products (Unsold > 30 Days)"
    : "Products";

  const customFraming = isDeadStockQuery
    ? `Found ${totalCount} dead stock product${totalCount === 1 ? "" : "s"} with no sales activity in the past 30 days:`
    : `Found ${totalCount} product${totalCount === 1 ? "" : "s"}${categoryLabel}${cappingText}:`;

  const isAnalyticalCheck = Boolean(args.stockStatus || isDeadStockQuery || lowerQuery.includes("profit") || lowerQuery.includes("margin") || lowerQuery.includes("low stock"));

  return {
    success: true,
    data: rows,
    fields: columns,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    tableTitle: customTitle,
    framingLine: customFraming,
    reply: customFraming,
    isAnalytical: isAnalyticalCheck,
    queryState: {
      queryText,
      args: { ...args, page: pageValue, limit: limitValue },
      organizationId,
    },
    summary: {
      totalProducts: totalCount,
      totalStock: enhancedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0),
      isEmpty: false,
    },
  };
};
