// services/chatTools.service.js
import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import supplierModel from "../models/supplier.model.js";
import stockLogModel from "../models/stockLog.model.js";
import invoiceModel from "../models/invoice.model.js";
import purchaseOrderModel from "../models/purchaseOrder.model.js";
import demandForecastModel from "../models/product.forcast.model.js";
import reorderSuggestionModel from "../models/reorder.suggestion.model.js";
import anomalyModel from "../models/anomaly.model.js";
import aiInsightsModel from "../models/insights.model.js";
import userModel from "../models/user.model.js";
import organizationModel from "../models/organization.model.js";
import { CONSTANTS } from "../config/constants.js";
import {
  COLUMN_DEFINITIONS,
  buildFlatTable,
  formatPrimitiveValue,
  FORMAT_TYPES,
} from "./chatResponseFormatter.service.js";
import {
  resolveAdminProfileIntent,
  resolveProfitMarginByCategoryIntent,
} from "./chatIntentResolver.service.js";

// ============ FORMATTING HELPERS ============

const formatCurrency = (value) => {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (num === undefined || num === null || isNaN(num)) return "PKR 0.00";
  return `PKR ${num.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusWithEmoji = (status) => {
  const statusMap = {
    in_stock: "🟢 In Stock",
    low_stock: "🟡 Low Stock",
    out_of_stock: "🔴 Out of Stock",
    dead_stock: "⚫ Dead Stock",
  };
  return statusMap[status] || status;
};

const getSeverityWithEmoji = (severity) => {
  const severityMap = {
    low: "🟡 Low",
    medium: "🟠 Medium",
    high: "🔴 Critical",
  };
  return severityMap[severity] || severity;
};

const isValidProduct = (product) => {
  if (product.costPrice < 0) return false;
  if (product.sellingPrice < 0) return false;
  if (product.reorderThreshold < 0) return false;
  if (product.quantity < 0) return false;
  if (product.costPrice > product.sellingPrice * 10) return false;
  return true;
};

// ============ CACHE HELPERS ============

const lookupCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedOrFetch = async (key, fetchFn) => {
  const cached = lookupCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  const value = await fetchFn();
  lookupCache.set(key, { value, timestamp: Date.now() });
  return value;
};

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of lookupCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        lookupCache.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

// ============ FILTER & DATE HELPERS ============

const buildFilter = (organizationId, baseFilter = {}) => {
  if (organizationId) {
    return {
      ...baseFilter,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };
  }
  const filter = { ...baseFilter };
  if (filter.organizationId) {
    filter.organizationId = new mongoose.Types.ObjectId(filter.organizationId);
  }
  return filter;
};

const buildFindFilter = (organizationId, baseFilter = {}) => {
  if (organizationId) {
    return { ...baseFilter, organizationId };
  }
  return baseFilter;
};

/**
 * Enhanced Date Range Parser supporting relative natural language periods.
 */
const parseDateRange = (args) => {
  const now = new Date();
  let startDate = null;
  let endDate = new Date();

  if (args.startDate || args.endDate) {
    return {
      startDate: args.startDate ? new Date(args.startDate) : null,
      endDate: args.endDate ? new Date(args.endDate) : new Date(),
    };
  }

  if (args.period) {
    const p = String(args.period).toLowerCase().trim();
    switch (p) {
      case "today": {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d;
        const e = new Date();
        e.setHours(23, 59, 59, 999);
        endDate = e;
        break;
      }
      case "yesterday": {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        d.setHours(0, 0, 0, 0);
        startDate = d;
        const e = new Date();
        e.setDate(e.getDate() - 1);
        e.setHours(23, 59, 59, 999);
        endDate = e;
        break;
      }
      case "this_week": {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        startDate = d;
        break;
      }
      case "last_week": {
        const lastWeekStart = new Date();
        const day = lastWeekStart.getDay();
        const diff = lastWeekStart.getDate() - day - 6 + (day === 0 ? -6 : 1);
        lastWeekStart.setDate(diff);
        lastWeekStart.setHours(0, 0, 0, 0);
        startDate = lastWeekStart;

        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        endDate = lastWeekEnd;
        break;
      }
      case "this_month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      }
      case "last_month": {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case "this_year": {
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      }
      case "weekly": {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d;
        break;
      }
      case "monthly": {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d;
        break;
      }
    }
  }

  return { startDate, endDate };
};

const findCategory = async (organizationId, name) => {
  if (!name) return null;
  const cacheKey = `category_${organizationId || "global"}_${name.toLowerCase()}`;
  return getCachedOrFetch(cacheKey, async () => {
    return await categoryModel.findOne(
      buildFindFilter(organizationId, { name: new RegExp(`^${name}$`, "i") }),
    );
  });
};

const findSupplier = async (organizationId, name) => {
  if (!name) return null;
  const cacheKey = `supplier_${organizationId || "global"}_${name.toLowerCase()}`;
  return getCachedOrFetch(cacheKey, async () => {
    return await supplierModel.findOne(
      buildFindFilter(organizationId, { name: new RegExp(`^${name}$`, "i") }),
    );
  });
};

const findUserIdsByName = async (organizationId, name) => {
  if (!name) return [];
  const cacheKey = `users_${organizationId || "global"}_${name.toLowerCase()}`;
  return getCachedOrFetch(cacheKey, async () => {
    const query = { name: new RegExp(name, "i") };
    if (organizationId) {
      query.organizationId = organizationId;
    }
    const users = await userModel.find(query).select("_id").lean();
    return users.map((u) => u._id);
  });
};

const escapeRegex = (string) => {
  if (!string) return string;
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getActiveSoldProductIds = async (organizationId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeSales = await invoiceModel
    .find(
      buildFindFilter(organizationId, {
        status: "paid",
        createdAt: { $gte: thirtyDaysAgo },
      }),
    )
    .select("products.productId");

  const idSet = new Set();
  for (const sale of activeSales) {
    for (const p of sale.products) {
      if (p.productId) idSet.add(p.productId.toString());
    }
  }
  return Array.from(idSet);
};

const createEmptyResult = (message) => {
  return {
    data: [],
    fields: [],
    columns: [],
    rows: [],
    count: 0,
    page: 1,
    totalPages: 0,
    tableTitle: "Results",
    summary: {
      isEmpty: true,
      message: message || "No data found matching your criteria.",
    },
  };
};

// ============ 1. INVENTORY TOOL ============

export const handleInventory = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId, { isActive: true });

  if (args.search) {
    const escapedSearch = escapeRegex(args.search);
    filter.$or = [
      { name: new RegExp(escapedSearch, "i") },
      { sku: new RegExp(escapedSearch, "i") },
    ];
  }

  if (args.category) {
    const cat = await findCategory(organizationId, args.category);
    if (cat) {
      filter.categoryId = cat._id;
    } else {
      return createEmptyResult(`No category found with name "${args.category}".`);
    }
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) {
      filter.supplierId = supp._id;
    } else {
      return createEmptyResult(`No supplier found with name "${args.supplier}".`);
    }
  }

  if (args.minPrice || args.maxPrice) {
    filter.sellingPrice = {};
    if (args.minPrice) filter.sellingPrice.$gte = args.minPrice;
    if (args.maxPrice) filter.sellingPrice.$lte = args.maxPrice;
  }

  if (args.minMargin || args.maxMargin) {
    const marginExpr = {
      $cond: [
        { $gt: ["$sellingPrice", 0] },
        {
          $divide: [
            { $subtract: ["$sellingPrice", "$costPrice"] },
            "$sellingPrice",
          ],
        },
        0,
      ],
    };
    filter.$expr = {};
    if (args.minMargin) filter.$expr.$gte = [marginExpr, args.minMargin];
    if (args.maxMargin) filter.$expr.$lte = [marginExpr, args.maxMargin];
  }

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.createdBy = { $in: userIds };
    } else {
      return createEmptyResult(`No users found with name "${args.creatorName}".`);
    }
  }

  const activeProductIds = await getActiveSoldProductIds(organizationId);

  if (args.stockStatus) {
    switch (args.stockStatus) {
      case "low_stock":
        filter.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
        filter.quantity = { $gt: 0 };
        break;
      case "out_of_stock":
        filter.quantity = 0;
        break;
      case "in_stock":
        filter.quantity = { $gt: 0 };
        if (activeProductIds.length > 0) {
          filter._id = { $in: activeProductIds };
        }
        break;
      case "dead_stock":
        filter.quantity = { $gt: 0 };
        filter._id = { $nin: activeProductIds };
        break;
    }
  }

  if (args.groupBy) {
    return handleGroupByInventory(args, filter, organizationId);
  }

  const limitValue = Math.min(
    args.limit || CONSTANTS.DEFAULT_PAGE_LIMIT,
    CONSTANTS.MAX_PAGE_LIMIT,
  );
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await productModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  const rawProducts = await productModel
    .find(filter)
    .populate("categoryId", "name")
    .populate("supplierId", "name contactPerson")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const validProducts = rawProducts.filter((p) => isValidProduct(p));

  const enhancedProducts = validProducts.map((p) => {
    const profit = p.sellingPrice - p.costPrice;
    const margin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

    let statusKey = "in_stock";
    if (p.quantity === 0) {
      statusKey = "out_of_stock";
    } else if (p.quantity <= p.reorderThreshold) {
      statusKey = "low_stock";
    }
    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) {
      statusKey = "dead_stock";
    }

    return {
      productName: p.name,
      sku: p.sku,
      quantity: p.quantity,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      reorderThreshold: p.reorderThreshold,
      categoryName: p.categoryId?.name || "N/A",
      supplierName: p.supplierId?.name || "N/A",
      status: getStatusWithEmoji(statusKey),
      createdAt: p.createdAt,
    };
  });

  const lowerQuery = (args._query || "").toLowerCase();
  const isDetailed =
    lowerQuery.includes("detail") ||
    lowerQuery.includes("complete") ||
    lowerQuery.includes("all field") ||
    lowerQuery.includes("every field") ||
    lowerQuery.includes("full info") ||
    lowerQuery.includes("profit") ||
    lowerQuery.includes("margin") ||
    lowerQuery.includes("cost price");

  const columnConfig = isDetailed
    ? COLUMN_DEFINITIONS.products_detailed
    : COLUMN_DEFINITIONS.products_compact;

  const { columns, rows } = buildFlatTable(columnConfig, enhancedProducts);

  const allProductsForStats = await productModel.find(filter).lean();
  let totalStock = 0;
  let totalInventoryValue = 0;
  let totalPotentialRevenue = 0;
  let totalPotentialProfit = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let deadStockCount = 0;
  let inStockCount = 0;

  for (const p of allProductsForStats) {
    if (!isValidProduct(p)) continue;
    const profit = p.sellingPrice - p.costPrice;
    totalStock += p.quantity;
    totalInventoryValue += p.quantity * p.costPrice;
    totalPotentialRevenue += p.quantity * p.sellingPrice;
    totalPotentialProfit += p.quantity * profit;

    let statusKey = "in_stock";
    if (p.quantity === 0) statusKey = "out_of_stock";
    else if (p.quantity <= p.reorderThreshold) statusKey = "low_stock";
    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) statusKey = "dead_stock";

    if (statusKey === "out_of_stock") outOfStockCount++;
    else if (statusKey === "low_stock") lowStockCount++;
    else if (statusKey === "dead_stock") deadStockCount++;
    else if (statusKey === "in_stock") inStockCount++;
  }

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange =
    totalCount > 0
      ? `showing ${startItem}–${endItem} of ${totalCount}`
      : "showing 0 of 0";

  const summary = {
    totalProducts: totalCount,
    totalStock: totalStock,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
    totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
    lowStockCount: lowStockCount,
    outOfStockCount: outOfStockCount,
    deadStockCount: deadStockCount,
    inStockCount: inStockCount,
    statusBreakdown: {
      "🟢 In Stock": inStockCount,
      "🟡 Low Stock": lowStockCount,
      "🔴 Out of Stock": outOfStockCount,
      "⚫ Dead Stock": deadStockCount,
    },
    isEmpty: totalCount === 0,
  };

  return {
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    pageSize: limitValue,
    showingRange: showingRange,
    summary: summary,
    tableTitle: "Products",
    filters: { limit: limitValue, page: pageValue, ...args },
  };
};

const handleGroupByInventory = async (args, baseFilter, organizationId) => {
  const filter = { ...baseFilter };
  let pipeline = [{ $match: buildFilter(organizationId, filter) }];

  if (args.groupBy === "category") {
    pipeline = pipeline.concat([
      {
        $group: {
          _id: "$categoryId",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          totalSellingValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $project: {
          groupName: { $ifNull: [{ $arrayElemAt: ["$categoryDetails.name", 0] }, "Uncategorized"] },
          totalCount: "$productCount",
          totalValue: "$totalCostValue",
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    const groupedResults = await productModel.aggregate(pipeline);
    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.grouped_summary, groupedResults);

    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: groupedResults.length,
      tableTitle: "Inventory by Category",
      summary: {
        totalCategories: groupedResults.length,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  if (args.groupBy === "supplier") {
    pipeline = pipeline.concat([
      {
        $group: {
          _id: "$supplierId",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "_id",
          foreignField: "_id",
          as: "supplierDetails",
        },
      },
      {
        $project: {
          groupName: { $ifNull: [{ $arrayElemAt: ["$supplierDetails.name", 0] }, "Unknown Supplier"] },
          totalCount: "$productCount",
          totalValue: "$totalCostValue",
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    const groupedResults = await productModel.aggregate(pipeline);
    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.grouped_summary, groupedResults);

    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: groupedResults.length,
      tableTitle: "Inventory by Supplier",
      summary: {
        totalSuppliers: groupedResults.length,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  return createEmptyResult();
};

// ============ 2. PURCHASE TOOL ============

const handlePurchases = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) {
      filter.supplierId = supp._id;
    } else {
      return createEmptyResult(`No supplier found with name "${args.supplier}".`);
    }
  }

  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  if (args.search) {
    filter.poNumber = new RegExp(escapeRegex(args.search), "i");
  }

  const limitValue = Math.min(
    args.limit || CONSTANTS.DEFAULT_PAGE_LIMIT,
    CONSTANTS.MAX_PAGE_LIMIT,
  );
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await purchaseOrderModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  const rawOrders = await purchaseOrderModel
    .find(filter)
    .populate("supplierId", "name contactPerson email")
    .populate("createdBy", "name")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedOrders = rawOrders.map((o) => ({
    poNumber: o.poNumber,
    supplierName: o.supplierId?.name || "N/A",
    date: o.createdAt,
    totalCost: Math.round(o.totalCost * 100) / 100,
    status: o.status,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.purchase_orders_compact, enhancedOrders);

  const allOrders = await purchaseOrderModel.find(filter).select("totalCost status").lean();
  const totalCost = allOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);

  return {
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    tableTitle: "Purchase Orders",
    summary: {
      totalOrders: totalCount,
      totalCost: Math.round(totalCost * 100) / 100,
      isEmpty: totalCount === 0,
    },
  };
};

// ============ 3. SALES TOOL ============

export const handleSales = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.customer) {
    filter.customerName = new RegExp(`^${escapeRegex(args.customer)}$`, "i");
  }

  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  if (args.search) {
    const escapedSearch = escapeRegex(args.search);
    filter.$or = [
      { invoiceNumber: new RegExp(escapedSearch, "i") },
      { customerName: new RegExp(escapedSearch, "i") },
    ];
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    let pipeline = [{ $match: matchFilter }];

    if (args.groupBy === "customer") {
      pipeline.push(
        {
          $group: {
            _id: "$customerName",
            salesCount: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
          },
        },
        {
          $project: {
            groupName: "$_id",
            totalCount: "$salesCount",
            totalValue: "$totalRevenue",
          },
        },
        { $sort: { totalValue: -1 } },
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: "$status",
            salesCount: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
          },
        },
        {
          $project: {
            groupName: "$_id",
            totalCount: "$salesCount",
            totalValue: "$totalRevenue",
          },
        },
      );
    }

    const groupedResults = await invoiceModel.aggregate(pipeline);
    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.grouped_summary, groupedResults);

    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: groupedResults.length,
      tableTitle: "Sales Grouped Summary",
      summary: {
        totalGroups: groupedResults.length,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  const limitValue = Math.min(
    args.limit || CONSTANTS.DEFAULT_PAGE_LIMIT,
    CONSTANTS.MAX_PAGE_LIMIT,
  );
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await invoiceModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  const rawInvoices = await invoiceModel
    .find(filter)
    .populate("createdBy", "name")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedInvoices = rawInvoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    date: inv.createdAt,
    subtotal: inv.subtotal,
    tax: inv.tax,
    discount: inv.discount || 0,
    total: Math.round(inv.total * 100) / 100,
    status: inv.status,
    createdBy: inv.createdBy?.name || "N/A",
  }));

  const lowerQuery = (args._query || "").toLowerCase();
  const isDetailed = lowerQuery.includes("detail") || lowerQuery.includes("complete") || lowerQuery.includes("full");
  const columnConfig = isDetailed ? COLUMN_DEFINITIONS.invoices_detailed : COLUMN_DEFINITIONS.invoices_compact;

  const { columns, rows } = buildFlatTable(columnConfig, enhancedInvoices);

  const allSales = await invoiceModel.find(filter).select("total status").lean();
  const totalSalesRevenue = allSales.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return {
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    tableTitle: "Invoices",
    summary: {
      totalInvoices: totalCount,
      totalRevenue: Math.round(totalSalesRevenue * 100) / 100,
      isEmpty: totalCount === 0,
    },
  };
};

// ============ 4. ORGANIZATION TOOL ============

const handleOrganization = async (args, organizationId) => {
  if (args.target === "users" || args.groupBy === "role") {
    const filter = buildFindFilter(organizationId);
    const users = await userModel.find(filter).select("name email role isActive").lean();

    const enhancedUsers = users.map((u) => ({
      userName: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? "Active" : "Inactive",
    }));

    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.users_compact, enhancedUsers);

    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: users.length,
      tableTitle: "Team Members",
      summary: {
        totalUsers: users.length,
        isEmpty: users.length === 0,
      },
    };
  }

  if (args.target === "categories") {
    const categories = await categoryModel.find(buildFindFilter(organizationId)).lean();
    const enhancedCats = categories.map((c) => ({
      categoryName: c.name,
      productCount: 0,
      createdAt: c.createdAt,
    }));
    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.categories_compact, enhancedCats);
    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: categories.length,
      tableTitle: "Categories",
      summary: { totalCategories: categories.length, isEmpty: categories.length === 0 },
    };
  }

  if (args.target === "suppliers") {
    const suppliers = await supplierModel.find(buildFindFilter(organizationId)).lean();
    const enhancedSupps = suppliers.map((s) => ({
      supplierName: s.name,
      contactPerson: s.contactPerson,
      email: s.email || "N/A",
      phone: s.phone || "N/A",
      leadTimeDays: s.leadTimeDays || 0,
    }));
    const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.suppliers_compact, enhancedSupps);
    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: suppliers.length,
      tableTitle: "Suppliers",
      summary: { totalSuppliers: suppliers.length, isEmpty: suppliers.length === 0 },
    };
  }

  const orgDoc = organizationId ? await organizationModel.findById(organizationId).lean() : null;
  const userCount = await userModel.countDocuments(buildFindFilter(organizationId));
  const productCount = await productModel.countDocuments(buildFindFilter(organizationId, { isActive: true }));
  const supplierCount = await supplierModel.countDocuments(buildFindFilter(organizationId));

  return {
    data: [],
    fields: [],
    columns: [],
    rows: [],
    count: 1,
    tableTitle: "Organization Overview",
    summary: {
      organizationName: orgDoc?.name || "StockPilot Organization",
      contactEmail: orgDoc?.contactEmail || "N/A",
      address: orgDoc?.address || "N/A",
      phone: orgDoc?.phone || "N/A",
      taxRate: orgDoc?.invoiceSettings?.taxRate || 0,
      defaultDiscount: orgDoc?.invoiceSettings?.defaultDiscount || 0,
      invoicePrefix: orgDoc?.invoiceSettings?.invoicePrefix || "INV",
      totalUsers: userCount,
      totalProducts: productCount,
      totalSuppliers: supplierCount,
      isEmpty: false,
    },
  };
};

// ============ 5. INSIGHTS TOOL ============

const handleInsights = async (args, organizationId) => {
  const type = args.type || "dashboard";

  if (type === "anomalies") {
    const filter = buildFindFilter(organizationId);
    if (args.severity) filter.severity = args.severity;

    const anomalies = await anomalyModel
      .find(filter)
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
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: anomalies.length,
      tableTitle: "Anomalies",
      summary: { totalAnomalies: anomalies.length, isEmpty: anomalies.length === 0 },
    };
  }

  if (type === "suggestions") {
    const suggestions = await reorderSuggestionModel
      .find(buildFindFilter(organizationId))
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
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: suggestions.length,
      tableTitle: "Reorder Suggestions",
      summary: { totalSuggestions: suggestions.length, isEmpty: suggestions.length === 0 },
    };
  }

  if (type === "forecast") {
    const forecasts = await demandForecastModel
      .find(buildFindFilter(organizationId))
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
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: forecasts.length,
      tableTitle: "Demand Forecasts",
      summary: { totalForecasts: forecasts.length, isEmpty: forecasts.length === 0 },
    };
  }

  // Dashboard fallback
  const totalProducts = await productModel.countDocuments(buildFindFilter(organizationId, { isActive: true }));
  const lowStock = await productModel.countDocuments(
    buildFindFilter(organizationId, { isActive: true, $expr: { $lte: ["$quantity", "$reorderThreshold"] } }),
  );
  const outOfStock = await productModel.countDocuments(buildFindFilter(organizationId, { isActive: true, quantity: 0 }));
  const totalRevenueRes = await invoiceModel.aggregate([
    { $match: buildFilter(organizationId, { status: "paid" }) },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);

  const totalRevenue = totalRevenueRes[0]?.total || 0;

  return {
    data: [],
    fields: [],
    columns: [],
    rows: [],
    count: 1,
    tableTitle: "Business Intelligence Summary",
    summary: {
      totalProducts,
      lowStock,
      outOfStock,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      isEmpty: false,
    },
  };
};

// ============ 6. GET DETAILS TOOL (Invoice Items & Specific Entities) ============

const handleGetDetails = async (args, organizationId) => {
  const { type, identifier } = args;
  const lowerQuery = (args._query || "").toLowerCase();
  const baseQuery = buildFindFilter(organizationId);

  switch (type) {
    case "invoice": {
      const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
      const escapedInv = escapeRegex(identifier);
      const flexInvPattern = escapedInv.replace(/(\d+)$/, (match, num) => `0*${num}`);
      const q = isObjectId
        ? { _id: identifier }
        : { invoiceNumber: new RegExp(`^${flexInvPattern}$`, "i") };

      const invoice = await invoiceModel
        .findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name email")
        .populate({
          path: "products.productId",
          select: "name sku unit costPrice sellingPrice",
        })
        .lean();

      if (!invoice) {
        return createEmptyResult(`Invoice "${identifier}" not found.`);
      }

      const lineItems = (invoice.products || []).map((item) => {
        const prod = item.productId;
        const sellingPrice = item.sellingPrice || prod?.sellingPrice || 0;
        const qty = item.quantity || 0;
        const subtotal = item.subtotal || qty * sellingPrice;
        return {
          productName: prod?.name || "Unknown Item",
          sku: prod?.sku || "N/A",
          quantity: qty,
          sellingPrice: sellingPrice,
          subtotal: subtotal,
        };
      });

      const asksForItemsOnly =
        lowerQuery.includes("product") ||
        lowerQuery.includes("item") ||
        lowerQuery.includes("included") ||
        lowerQuery.includes("inside") ||
        lowerQuery.includes("content");

      if (asksForItemsOnly) {
        const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.invoice_items, lineItems);
        return {
          data: rows,
          fields: columns,
          columns: columns,
          rows: rows,
          count: lineItems.length,
          tableTitle: `Items in Invoice ${invoice.invoiceNumber}`,
          summary: {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            totalItems: lineItems.length,
            invoiceTotal: invoice.total,
            isEmpty: lineItems.length === 0,
          },
        };
      }

      // General Invoice Details with line items in summary
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        date: invoice.createdAt,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount || 0,
        total: invoice.total,
        status: invoice.status,
        createdBy: invoice.createdBy?.name || "N/A",
      };

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.invoices_detailed, [invoiceData]);

      return {
        data: rows,
        fields: columns,
        columns: columns,
        rows: rows,
        count: 1,
        tableTitle: `Invoice ${invoice.invoiceNumber} Details`,
        summary: {
          invoiceHeader: invoiceData,
          lineItems: lineItems,
          totalItems: lineItems.length,
          isEmpty: false,
        },
      };
    }

    case "purchase_order": {
      const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
      const escapedPo = escapeRegex(identifier);
      const flexPoPattern = escapedPo.replace(/(\d+)$/, (match, num) => `0*${num}`);
      const q = isObjectId
        ? { _id: identifier }
        : { poNumber: new RegExp(`^${flexPoPattern}$`, "i") };

      const po = await purchaseOrderModel
        .findOne({ ...baseQuery, ...q })
        .populate("supplierId", "name contactPerson")
        .populate("createdBy", "name")
        .populate("items.productId", "name sku costPrice")
        .lean();

      if (!po) {
        return createEmptyResult(`Purchase Order "${identifier}" not found.`);
      }

      const lineItems = (po.items || []).map((item) => {
        const prod = item.productId;
        const qty = item.quantity || 0;
        const unitCost = item.unitCost || prod?.costPrice || 0;
        return {
          productName: prod?.name || "Unknown Item",
          sku: prod?.sku || "N/A",
          quantity: qty,
          unitCost: unitCost,
          subtotal: qty * unitCost,
        };
      });

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.purchase_order_items, lineItems);

      return {
        data: rows,
        fields: columns,
        columns: columns,
        rows: rows,
        count: lineItems.length,
        tableTitle: `Items in PO ${po.poNumber}`,
        summary: {
          poNumber: po.poNumber,
          supplierName: po.supplierId?.name || "N/A",
          totalCost: po.totalCost,
          status: po.status,
          isEmpty: lineItems.length === 0,
        },
      };
    }

    case "product": {
      const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
      const q = isObjectId
        ? { _id: identifier }
        : { name: new RegExp(escapeRegex(identifier), "i") };

      const product = await productModel
        .findOne({ ...baseQuery, ...q })
        .populate("categoryId", "name")
        .populate("supplierId", "name")
        .lean();

      if (!product) {
        return createEmptyResult(`Product "${identifier}" not found.`);
      }

      const profit = product.sellingPrice - product.costPrice;
      const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

      const productData = {
        productName: product.name,
        sku: product.sku,
        categoryName: product.categoryId?.name || "N/A",
        supplierName: product.supplierId?.name || "N/A",
        quantity: product.quantity,
        reorderThreshold: product.reorderThreshold,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        margin: Math.round(margin * 100) / 100,
        status: getStatusWithEmoji(
          product.quantity === 0
            ? "out_of_stock"
            : product.quantity <= product.reorderThreshold
              ? "low_stock"
              : "in_stock",
        ),
      };

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.products_detailed, [productData]);

      return {
        data: rows,
        fields: columns,
        columns: columns,
        rows: rows,
        count: 1,
        tableTitle: "Product Details",
        summary: { isEmpty: false },
      };
    }

    case "supplier": {
      const supplier = await supplierModel
        .findOne({ ...baseQuery, name: new RegExp(escapeRegex(identifier), "i") })
        .lean();

      if (!supplier) {
        return createEmptyResult(`Supplier "${identifier}" not found.`);
      }

      const supplierData = {
        supplierName: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email || "N/A",
        phone: supplier.phone || "N/A",
        leadTimeDays: supplier.leadTimeDays || 0,
      };

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.suppliers_compact, [supplierData]);

      return {
        data: rows,
        fields: columns,
        columns: columns,
        rows: rows,
        count: 1,
        tableTitle: "Supplier Details",
        summary: { isEmpty: false },
      };
    }

    default:
      return createEmptyResult(`Entity details not found for "${identifier}".`);
  }
};

// ============ 7. TRANSACTIONS TOOL ============

const handleTransactions = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.type && args.type !== "all") {
    filter.type = args.type;
  }

  if (args.reason && args.reason !== "all") {
    filter.reason = args.reason;
  }

  const limitValue = Math.min(
    args.limit || CONSTANTS.DEFAULT_PAGE_LIMIT,
    CONSTANTS.MAX_PAGE_LIMIT,
  );
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const totalCount = await stockLogModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  const rawLogs = await stockLogModel
    .find(filter)
    .populate("productId", "name sku")
    .populate("performedBy", "name")
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const enhancedLogs = rawLogs.map((l) => ({
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
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    tableTitle: "Stock Transactions",
    summary: { totalTransactions: totalCount, isEmpty: totalCount === 0 },
  };
};

import { planAndExecuteChatQuery } from "./resolvers/chatQueryPlanner.js";

// ============ EXPORTS ============

export const executeTool = async (
  toolName,
  args,
  organizationId,
  role = "admin",
  previousMetadata = null,
  userQuery = "",
) => {
  try {
    const queryText = userQuery || args?._query || "";
    return await planAndExecuteChatQuery({
      queryText,
      args,
      organizationId,
      role,
      previousMetadata,
    });
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return createEmptyResult("An error occurred processing your request.");
  }
};

export const getResponseType = (toolName) => {
  const tableTools = ["query_purchases", "query_sales", "query_transactions"];
  const listTools = ["query_inventory", "query_organization"];
  const detailTools = ["get_details"];
  const insightTools = ["query_insights"];

  if (tableTools.includes(toolName)) return "table";
  if (listTools.includes(toolName)) return "product_list";
  if (detailTools.includes(toolName)) return "comprehensive";
  if (insightTools.includes(toolName)) return "analytics";
  return "text";
};

export const getToolsForRole = (allTools, role) => {
  if (role === "admin" || role === "super_admin") {
    return allTools;
  }
  return [];
};
