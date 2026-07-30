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

// ============ HELPER FUNCTIONS ============

const formatCurrency = (value) => {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (num === undefined || num === null || isNaN(num)) return "PKR 0.00";
  return `PKR ${num.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercentage = (value) => {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  return `${Math.round(value)}%`;
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

const getStatusEmoji = (status) => {
  const statusMap = {
    in_stock: "🟢",
    low_stock: "🟡",
    out_of_stock: "🔴",
    dead_stock: "⚫",
  };
  return statusMap[status] || "•";
};

const getStatusLabel = (status) => {
  const statusMap = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    dead_stock: "Dead Stock",
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
    switch (args.period) {
      case "today": {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d;
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
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const d = new Date(now.setDate(diff));
        d.setHours(0, 0, 0, 0);
        startDate = d;
        break;
      }
      case "last_week": {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(
          lastWeekStart.getDate() - lastWeekStart.getDay() - 6,
        );
        lastWeekStart.setHours(0, 0, 0, 0);
        startDate = lastWeekStart;
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        endDate = lastWeekEnd;
        break;
      }
      case "this_month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case "last_month": {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          0,
          23,
          59,
          59,
          999,
        );
        break;
      }
      case "this_year": {
        startDate = new Date(now.getFullYear(), 0, 1);
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

const getValidProductMongoMatch = () => ({
  costPrice: { $gte: 0 },
  sellingPrice: { $gte: 0 },
  quantity: { $gte: 0 },
  reorderThreshold: { $gte: 0 },
});

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

// ============ 1. INVENTORY TOOL ============

const handleInventory = async (args, organizationId) => {
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
      // Category not found - return empty result
      return createEmptyInventoryResult("No category found with that name.");
    }
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) {
      filter.supplierId = supp._id;
    } else {
      // Supplier not found - return empty result
      return createEmptyInventoryResult(
        `No supplier found with name "${args.supplier}".`,
      );
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
      return createEmptyInventoryResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  // Get active product IDs for dead stock detection
  let activeProductIds = [];
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
  activeProductIds = Array.from(idSet);

  // Handle stock status filtering correctly
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
        // Exclude dead stock from "in_stock" results
        filter._id = {
          $in: activeProductIds.length > 0 ? activeProductIds : [],
        };
        break;
      case "dead_stock":
        filter.quantity = { $gt: 0 };
        filter._id = { $nin: activeProductIds };
        break;
    }
  }

  // Handle grouping
  if (args.groupBy) {
    const groupedResults = await handleGroupByInventory(
      args,
      filter,
      organizationId,
    );
    return groupedResults;
  }

  // Handle pagination
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
  const products = validProducts.map((p) => {
    const profit = p.sellingPrice - p.costPrice;
    const margin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
    const inventoryValue = p.quantity * p.costPrice;
    const potentialRevenue = p.quantity * p.sellingPrice;
    const potentialProfit = p.quantity * profit;

    let statusKey = "in_stock";
    if (p.quantity === 0) {
      statusKey = "out_of_stock";
    } else if (p.quantity <= p.reorderThreshold) {
      statusKey = "low_stock";
    }

    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) {
      statusKey = "dead_stock";
    }

    const statusFull = getStatusWithEmoji(statusKey);
    const statusEmoji = getStatusEmoji(statusKey);
    const statusLabel = getStatusLabel(statusKey);

    return {
      _id: p._id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      potentialRevenue: Math.round(potentialRevenue * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      unit: p.unit,
      category: p.categoryId?.name || "N/A",
      supplier: p.supplierId?.name || "N/A",
      reorderLevel: p.reorderThreshold,
      status: statusFull,
      statusEmoji: statusEmoji,
      statusLabel: statusLabel,
      statusKey: statusKey,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  if (args.sortBy) {
    const sortField = args.sortBy;
    const isDesc = args.sortOrder === "desc";
    products.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? valB - valA : valA - valB;
    });
  }

  const invalidProductsList = [];
  let totalStock = 0;
  let totalInventoryValue = 0;
  let totalPotentialRevenue = 0;
  let totalPotentialProfit = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let deadStockCount = 0;
  let inStockCount = 0;

  // Calculate summary from all products (not just paginated ones)
  const allProductsForStats = await productModel.find(filter).lean();
  for (const p of allProductsForStats) {
    if (!isValidProduct(p)) {
      invalidProductsList.push({
        name: p.name || "Unknown",
        sku: p.sku || "N/A",
        reason: "Cost price, selling price, quantity, or reorder threshold is negative or invalid.",
      });
      continue;
    }
    const profit = p.sellingPrice - p.costPrice;
    totalStock += p.quantity;
    totalInventoryValue += p.quantity * p.costPrice;
    totalPotentialRevenue += p.quantity * p.sellingPrice;
    totalPotentialProfit += p.quantity * profit;

    let statusKey = "in_stock";
    if (p.quantity === 0) {
      statusKey = "out_of_stock";
    } else if (p.quantity <= p.reorderThreshold) {
      statusKey = "low_stock";
    }
    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) {
      statusKey = "dead_stock";
    }

    if (statusKey === "out_of_stock") outOfStockCount++;
    else if (statusKey === "low_stock") lowStockCount++;
    else if (statusKey === "dead_stock") deadStockCount++;
    else if (statusKey === "in_stock") inStockCount++;
  }

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange = totalCount > 0 ? `showing ${startItem}–${endItem} of ${totalCount}` : "showing 0 of 0";

  const summary = {
    totalProducts: totalCount,
    totalStock,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
    totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
    lowStockCount,
    outOfStockCount,
    deadStockCount,
    inStockCount,
    invalidProductsCount: invalidProductsList.length,
    invalidRecords: invalidProductsList.length > 0 ? invalidProductsList : null,
    statusBreakdown: {
      "🟢 In Stock": inStockCount,
      "🟡 Low Stock": lowStockCount,
      "🔴 Out of Stock": outOfStockCount,
      "⚫ Dead Stock": deadStockCount,
    },
    isEmpty: totalCount === 0,
  };

  return {
    products,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    showingRange,
    summary,
    filters: { limit: limitValue, page: pageValue, ...args },
  };
};

const createEmptyInventoryResult = (message) => {
  return {
    products: [],
    count: 0,
    page: 1,
    totalPages: 0,
    summary: {
      totalProducts: 0,
      totalStock: 0,
      totalInventoryValue: 0,
      totalPotentialRevenue: 0,
      totalPotentialProfit: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      deadStockCount: 0,
      inStockCount: 0,
      statusBreakdown: {
        "🟢 In Stock": 0,
        "🟡 Low Stock": 0,
        "🔴 Out of Stock": 0,
        "⚫ Dead Stock": 0,
      },
      isEmpty: true,
      message: message || "No data found matching your criteria.",
    },
  };
};

const handleGroupByInventory = async (args, baseFilter, organizationId) => {
  const filter = { ...baseFilter, ...getValidProductMongoMatch() };
  let groupField = "";
  let lookupStage = null;
  let projectStage = null;

  if (args.groupBy === "category") {
    groupField = "$categoryId";
    const pipeline = [
      { $match: buildFilter(organizationId, filter) },
      {
        $group: {
          _id: groupField,
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          totalSellingValue: {
            $sum: { $multiply: ["$quantity", "$sellingPrice"] },
          },
          totalPotentialProfit: {
            $sum: {
              $multiply: [
                "$quantity",
                { $subtract: ["$sellingPrice", "$costPrice"] },
              ],
            },
          },
          averageMargin: {
            $avg: {
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
            },
          },
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
          categoryName: { $arrayElemAt: ["$categoryDetails.name", 0] },
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        },
      },
      { $sort: { totalCostValue: -1 } },
    ];

    const groupedResults = await productModel.aggregate(pipeline);

    const totalProducts = groupedResults.reduce(
      (sum, g) => sum + g.productCount,
      0,
    );
    const totalCostValue = groupedResults.reduce(
      (sum, g) => sum + g.totalCostValue,
      0,
    );
    const totalSellingValue = groupedResults.reduce(
      (sum, g) => sum + g.totalSellingValue,
      0,
    );
    const totalProfit = groupedResults.reduce(
      (sum, g) => sum + g.totalPotentialProfit,
      0,
    );

    return {
      groupedResults,
      count: groupedResults.length,
      summary: {
        totalCategories: groupedResults.length,
        totalProducts,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        totalPotentialProfit: Math.round(totalProfit * 100) / 100,
        isEmpty: groupedResults.length === 0,
      },
    };
  } else if (args.groupBy === "supplier") {
    groupField = "$supplierId";
    const pipeline = [
      { $match: buildFilter(organizationId, filter) },
      {
        $group: {
          _id: groupField,
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          totalSellingValue: {
            $sum: { $multiply: ["$quantity", "$sellingPrice"] },
          },
          totalPotentialProfit: {
            $sum: {
              $multiply: [
                "$quantity",
                { $subtract: ["$sellingPrice", "$costPrice"] },
              ],
            },
          },
          averageMargin: {
            $avg: {
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
            },
          },
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
          supplierName: { $arrayElemAt: ["$supplierDetails.name", 0] },
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        },
      },
      { $sort: { totalCostValue: -1 } },
    ];

    const groupedResults = await productModel.aggregate(pipeline);

    const totalProducts = groupedResults.reduce(
      (sum, g) => sum + g.productCount,
      0,
    );
    const totalCostValue = groupedResults.reduce(
      (sum, g) => sum + g.totalCostValue,
      0,
    );
    const totalSellingValue = groupedResults.reduce(
      (sum, g) => sum + g.totalSellingValue,
      0,
    );

    return {
      groupedResults,
      count: groupedResults.length,
      summary: {
        totalSuppliers: groupedResults.length,
        totalProducts,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        isEmpty: groupedResults.length === 0,
      },
    };
  } else if (args.groupBy === "status") {
    const pipeline = [
      { $match: buildFilter(organizationId, filter) },
      {
        $addFields: {
          statusKey: {
            $cond: [
              { $eq: ["$quantity", 0] },
              "out_of_stock",
              {
                $cond: [
                  { $lte: ["$quantity", "$reorderThreshold"] },
                  "low_stock",
                  "in_stock",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$statusKey",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          totalSellingValue: {
            $sum: { $multiply: ["$quantity", "$sellingPrice"] },
          },
          totalPotentialProfit: {
            $sum: {
              $multiply: [
                "$quantity",
                { $subtract: ["$sellingPrice", "$costPrice"] },
              ],
            },
          },
          averageMargin: {
            $avg: {
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
            },
          },
        },
      },
      {
        $project: {
          status: "$_id",
          statusDisplay: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "in_stock"] }, then: "🟢 In Stock" },
                { case: { $eq: ["$_id", "low_stock"] }, then: "🟡 Low Stock" },
                {
                  case: { $eq: ["$_id", "out_of_stock"] },
                  then: "🔴 Out of Stock",
                },
                {
                  case: { $eq: ["$_id", "dead_stock"] },
                  then: "⚫ Dead Stock",
                },
              ],
              default: "$_id",
            },
          },
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        },
      },
      { $sort: { _id: 1 } },
    ];

    const groupedResults = await productModel.aggregate(pipeline);

    const totalProducts = groupedResults.reduce(
      (sum, g) => sum + g.productCount,
      0,
    );
    const totalCostValue = groupedResults.reduce(
      (sum, g) => sum + g.totalCostValue,
      0,
    );

    return {
      groupedResults,
      count: groupedResults.length,
      summary: {
        totalStatusGroups: groupedResults.length,
        totalProducts,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  return { groupedResults: [], count: 0, summary: { isEmpty: true } };
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
      return createEmptyPurchaseResult(
        `No supplier found with name "${args.supplier}".`,
      );
    }
  }

  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  if (args.minCost || args.maxCost) {
    filter.totalCost = {};
    if (args.minCost) filter.totalCost.$gte = args.minCost;
    if (args.maxCost) filter.totalCost.$lte = args.maxCost;
  }

  if (args.search) {
    filter.poNumber = new RegExp(escapeRegex(args.search), "i");
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.createdBy = { $in: userIds };
    } else {
      return createEmptyPurchaseResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    const groupField = args.groupBy === "supplier" ? "$supplierId" : "$status";

    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: groupField,
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalCost" },
          averageSpent: { $avg: "$totalCost" },
        },
      },
    ];

    if (args.groupBy === "supplier") {
      pipeline.push(
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
            supplierName: { $arrayElemAt: ["$supplierDetails.name", 0] },
            orderCount: 1,
            totalSpent: 1,
            averageSpent: 1,
          },
        },
        { $sort: { totalSpent: -1 } },
      );
    } else {
      pipeline.push({
        $project: {
          status: "$_id",
          orderCount: 1,
          totalSpent: 1,
          averageSpent: 1,
        },
      });
    }

    const groupedResults = await purchaseOrderModel.aggregate(pipeline);
    const totalOrders = groupedResults.reduce(
      (sum, g) => sum + g.orderCount,
      0,
    );
    const totalSpent = groupedResults.reduce((sum, g) => sum + g.totalSpent, 0);

    return {
      groupedResults,
      count: groupedResults.length,
      summary: {
        totalGroups: groupedResults.length,
        totalOrders,
        totalSpent: Math.round(totalSpent * 100) / 100,
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

  const totalCount = await purchaseOrderModel.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limitValue);

  const rawOrders = await purchaseOrderModel
    .find(filter)
    .populate("supplierId", "name contactPerson email leadTimeDays")
    .populate("createdBy", "name")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const orders = rawOrders.map((o) => ({
    _id: o._id,
    poNumber: o.poNumber,
    supplier: o.supplierId?.name || "N/A",
    itemsCount: o.items.length,
    totalCost: Math.round(o.totalCost * 100) / 100,
    status: o.status,
    createdBy: o.createdBy?.name || "N/A",
    leadTimeDays:
      o.supplierId?.leadTimeDays !== undefined
        ? o.supplierId.leadTimeDays
        : "N/A",
    createdAt: o.createdAt,
  }));

  if (args.sortBy) {
    const sortField =
      args.sortBy === "date"
        ? "createdAt"
        : args.sortBy === "leadTime"
          ? "leadTimeDays"
          : args.sortBy;
    const isDesc = args.sortOrder === "desc";
    orders.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === "N/A") return 1;
      if (valB === "N/A") return -1;

      if (sortField === "createdAt") {
        return isDesc
          ? new Date(valB) - new Date(valA)
          : new Date(valA) - new Date(valB);
      }
      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? valB - valA : valA - valB;
    });
  }

  const allOrdersForStats = await purchaseOrderModel
    .find(filter)
    .select("totalCost status")
    .lean();
  const totalCost = allOrdersForStats.reduce(
    (sum, o) => sum + (o.totalCost || 0),
    0,
  );

  const statusCounts = { pending: 0, approved: 0, rejected: 0, fulfilled: 0 };
  for (const o of allOrdersForStats) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  }

  const summary = {
    totalOrders: allOrdersForStats.length,
    totalCost: Math.round(totalCost * 100) / 100,
    averageOrderCost:
      allOrdersForStats.length > 0
        ? Math.round((totalCost / allOrdersForStats.length) * 100) / 100
        : 0,
    statusCounts,
    isEmpty: allOrdersForStats.length === 0,
  };

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange = totalCount > 0 ? `showing ${startItem}–${endItem} of ${totalCount}` : "showing 0 of 0";

  return {
    orders,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    showingRange,
    summary,
  };
};

const createEmptyPurchaseResult = (message) => {
  return {
    orders: [],
    count: 0,
    page: 1,
    totalPages: 0,
    summary: {
      totalOrders: 0,
      totalCost: 0,
      averageOrderCost: 0,
      statusCounts: { pending: 0, approved: 0, rejected: 0, fulfilled: 0 },
      isEmpty: true,
      message: message || "No purchase orders found matching your criteria.",
    },
  };
};

// ============ 3. SALES TOOL ============

const handleSales = async (args, organizationId) => {
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

  if (args.minAmount || args.maxAmount) {
    filter.total = {};
    if (args.minAmount) filter.total.$gte = args.minAmount;
    if (args.maxAmount) filter.total.$lte = args.maxAmount;
  }

  if (args.search) {
    const escapedSearch = escapeRegex(args.search);
    filter.$or = [
      { invoiceNumber: new RegExp(escapedSearch, "i") },
      { customerName: new RegExp(escapedSearch, "i") },
    ];
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.createdBy = { $in: userIds };
    } else {
      return createEmptySalesResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    let groupField = "";

    if (args.groupBy === "customer") {
      groupField = { $toLower: "$customerName" };
    } else if (args.groupBy === "status") {
      groupField = "$status";
    } else if (args.groupBy === "daily") {
      groupField = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    } else if (args.groupBy === "monthly") {
      groupField = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: groupField,
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageRevenue: { $avg: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const groupedResults = await invoiceModel.aggregate(pipeline);
    const totalInvoices = groupedResults.reduce(
      (sum, g) => sum + g.salesCount,
      0,
    );
    const totalRevenue = groupedResults.reduce(
      (sum, g) => sum + g.totalRevenue,
      0,
    );

    return {
      groupedResults,
      count: groupedResults.length,
      summary: {
        totalGroups: groupedResults.length,
        totalInvoices,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
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
    .populate("products.productId", "name sku costPrice sellingPrice")
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const invoices = rawInvoices.map((inv) => {
    let totalCost = 0;
    for (const item of inv.products) {
      const itemCost = item.productId?.costPrice || 0;
      totalCost += item.quantity * itemCost;
    }
    const profit = inv.total - totalCost;
    const margin = inv.total > 0 ? (profit / inv.total) * 100 : 0;

    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      subtotal: Math.round(inv.subtotal * 100) / 100,
      tax: Math.round(inv.tax * 100) / 100,
      discount: Math.round(inv.discount * 100) / 100,
      total: Math.round(inv.total * 100) / 100,
      costOfGoodsSold: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      status: inv.status,
      createdBy: inv.createdBy?.name || "N/A",
      createdAt: inv.createdAt,
    };
  });

  if (args.sortBy) {
    const sortField = args.sortBy === "date" ? "createdAt" : args.sortBy;
    const isDesc = args.sortOrder === "desc";
    invoices.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "createdAt") {
        return isDesc
          ? new Date(valB) - new Date(valA)
          : new Date(valA) - new Date(valB);
      }
      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? valB - valA : valA - valB;
    });
  }

  const allSalesForStats = await invoiceModel
    .find(filter)
    .populate({
      path: "products.productId",
      select: "name sku costPrice sellingPrice categoryId supplierId",
      populate: [
        { path: "categoryId", select: "name" },
        { path: "supplierId", select: "name" },
      ],
    })
    .lean();

  let totalSales = 0;
  let totalPaidSales = 0;
  let totalCostOfSales = 0;
  const statusCounts = { paid: 0, unpaid: 0, void: 0 };
  const customerMap = {};

  for (const inv of allSalesForStats) {
    if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    const invTotal = inv.total || 0;
    totalSales += invTotal;

    if (inv.status === "paid") {
      totalPaidSales += invTotal;
      for (const item of inv.products) {
        const itemCost = item.productId?.costPrice || 0;
        totalCostOfSales += item.quantity * itemCost;
      }

      if (inv.customerName) {
        const normalizedName = inv.customerName.trim().toLowerCase();
        const displayName = inv.customerName.trim();
        if (!customerMap[normalizedName]) {
          customerMap[normalizedName] = {
            name: displayName,
            count: 0,
            total: 0,
          };
        }
        customerMap[normalizedName].count++;
        customerMap[normalizedName].total += invTotal;
      }
    }
  }

  const totalProfit = totalPaidSales - totalCostOfSales;
  const grossMargin = totalPaidSales > 0 ? (totalProfit / totalPaidSales) * 100 : 0;

  const customerMetrics = Object.values(customerMap)
    .map((c) => ({
      customerName: c.name,
      orderCount: c.count,
      totalSpent: Math.round(c.total * 100) / 100,
      averageSpent:
        c.count > 0 ? Math.round((c.total / c.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  let customerProductsPurchased = [];
  if (args.customer) {
    const productMap = {};
    for (const inv of allSalesForStats) {
      if (
        inv.customerName &&
        inv.customerName.toLowerCase() === args.customer.toLowerCase()
      ) {
        for (const item of inv.products) {
          if (item.productId) {
            const pId =
              item.productId._id?.toString() || item.productId.toString();
            const pName =
              item.productId.name || item.name || "Product " + pId.slice(-4);
            const pSku = item.productId.sku || item.sku || "N/A";
            const qty = Number(item.quantity) || 0;
            const unitPrice = Number(
              item.sellingPrice ?? item.productId.sellingPrice ?? 0,
            );

            let itemSubtotal = 0;
            if (typeof item.subtotal === "number" && !isNaN(item.subtotal)) {
              itemSubtotal = item.subtotal;
            } else if (!isNaN(unitPrice)) {
              itemSubtotal = qty * unitPrice;
            }

            if (!productMap[pId]) {
              productMap[pId] = {
                productName: pName,
                sku: pSku,
                quantityPurchased: 0,
                totalSpent: 0,
              };
            }
            productMap[pId].quantityPurchased += qty;
            productMap[pId].totalSpent += itemSubtotal;
          }
        }
      }
    }
    customerProductsPurchased = Object.values(productMap).map((p) => ({
      productName: p.productName,
      sku: p.sku,
      quantityPurchased: p.quantityPurchased,
      totalSpent: p.totalSpent,
    }));
  }

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange = totalCount > 0 ? `showing ${startItem}–${endItem} of ${totalCount}` : "showing 0 of 0";

  const summary = {
    totalSales: Math.round(totalSales * 100) / 100,
    totalPaidSales: Math.round(totalPaidSales * 100) / 100,
    totalCostOfSales: Math.round(totalCostOfSales * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    totalInvoices: allSalesForStats.length,
    averageInvoiceValue:
      allSalesForStats.length > 0
        ? Math.round((totalSales / allSalesForStats.length) * 100) / 100
        : 0,
    statusCounts,
    customerMetrics,
    isEmpty: allSalesForStats.length === 0,
    ...(customerProductsPurchased.length > 0
      ? { customerProductsPurchased }
      : {}),
  };

  return {
    invoices,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    showingRange,
    summary,
    filters: { limit: limitValue, page: pageValue, ...args },
  };
};

const createEmptySalesResult = (message) => {
  return {
    invoices: [],
    count: 0,
    page: 1,
    totalPages: 0,
    summary: {
      totalSales: 0,
      totalCostOfSales: 0,
      totalProfit: 0,
      grossMargin: 0,
      totalInvoices: 0,
      averageInvoiceValue: 0,
      statusCounts: { paid: 0, unpaid: 0, void: 0 },
      customerMetrics: [],
      isEmpty: true,
      message: message || "No invoices found matching your criteria.",
    },
  };
};

// ============ 4. ORGANIZATION TOOL ============

const handleOrganization = async (args, organizationId) => {
  let searchFilter = {};

  if (organizationId) {
    const filter = { organizationId };
    if (args.search) {
      const escapedSearch = escapeRegex(args.search);
      filter.$or = [
        { name: new RegExp(escapedSearch, "i") },
        { email: new RegExp(escapedSearch, "i") },
      ];
    }
    if (args.role && args.role !== "all") {
      filter.role = args.role;
    }
    if (args.isActive !== undefined) {
      filter.isActive = args.isActive;
    }

    const limitValue = Math.min(args.limit || 50, 100);
    const pageValue = Math.max(args.page || 1, 1);
    const skipValue = (pageValue - 1) * limitValue;

    const totalCount = await userModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitValue);

    const users = await userModel
      .find(filter)
      .select("-password -tokenVersion -__v")
      .sort(
        args.sortBy
          ? { [args.sortBy]: args.sortOrder === "desc" ? -1 : 1 }
          : { createdAt: -1 },
      )
      .skip(skipValue)
      .limit(limitValue)
      .lean();

    let enrichedUsers = users;
    if (users.length > 0) {
      const userIds = users.map((u) => u._id);

      const invoiceMetrics = await invoiceModel.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            createdBy: { $in: userIds },
            status: "paid",
          },
        },
        {
          $group: {
            _id: "$createdBy",
            invoicesCreated: { $sum: 1 },
            revenueGenerated: { $sum: "$total" },
          },
        },
      ]);

      const metricsMap = {};
      invoiceMetrics.forEach((metric) => {
        metricsMap[metric._id.toString()] = {
          invoicesCreated: metric.invoicesCreated,
          revenueGenerated: Math.round(metric.revenueGenerated * 100) / 100,
        };
      });

      enrichedUsers = users.map((user) => ({
        ...user,
        invoicesCreated: metricsMap[user._id.toString()]?.invoicesCreated || 0,
        revenueGenerated:
          metricsMap[user._id.toString()]?.revenueGenerated || 0,
      }));
    }

    const activeUsers = await userModel.countDocuments({
      ...filter,
      isActive: true,
    });
    const stats = await userModel.aggregate([
      { $match: buildFilter(organizationId, filter) },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const roleBreakdown = { admin: 0, manager: 0, staff: 0 };
    for (const r of stats) {
      if (roleBreakdown[r._id] !== undefined) roleBreakdown[r._id] = r.count;
    }

    const summary = {
      totalUsers: totalCount,
      activeUsers,
      roleBreakdown,
      isEmpty: totalCount === 0,
    };

    return {
      users: enrichedUsers,
      count: totalCount,
      page: pageValue,
      totalPages,
      summary,
    };
  } else {
    if (args.search) {
      const escapedSearch = escapeRegex(args.search);
      searchFilter = { name: new RegExp(escapedSearch, "i") };
    }

    const limitValue = Math.min(args.limit || 20, 100);
    const pageValue = Math.max(args.page || 1, 1);
    const skipValue = (pageValue - 1) * limitValue;

    const totalCount = await organizationModel.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalCount / limitValue);

    const organizationsList = await organizationModel
      .find(searchFilter)
      .skip(skipValue)
      .limit(limitValue)
      .lean();

    const orgIds = organizationsList.map((o) => o._id);

    const [salesValues, userCounts, productCounts] = await Promise.all([
      invoiceModel.aggregate([
        { $match: { organizationId: { $in: orgIds }, status: "paid" } },
        { $group: { _id: "$organizationId", total: { $sum: "$total" } } },
      ]),
      userModel.aggregate([
        { $match: { organizationId: { $in: orgIds } } },
        { $group: { _id: "$organizationId", count: { $sum: 1 } } },
      ]),
      productModel.aggregate([
        { $match: { organizationId: { $in: orgIds }, isActive: true } },
        { $group: { _id: "$organizationId", count: { $sum: 1 } } },
      ]),
    ]);

    const salesMap = {};
    salesValues.forEach((s) => {
      salesMap[s._id.toString()] = Math.round(s.total * 100) / 100;
    });

    const userCountMap = {};
    userCounts.forEach((u) => {
      userCountMap[u._id.toString()] = u.count;
    });

    const productCountMap = {};
    productCounts.forEach((p) => {
      productCountMap[p._id.toString()] = p.count;
    });

    const organizations = organizationsList.map((org) => ({
      _id: org._id,
      name: org.name,
      contactEmail: org.contactEmail,
      status: org.status,
      usersCount: userCountMap[org._id.toString()] || 0,
      productsCount: productCountMap[org._id.toString()] || 0,
      salesValue: salesMap[org._id.toString()] || 0,
      createdAt: org.createdAt,
    }));

    const [totalOrgs, totalUsers, activeUsers] = await Promise.all([
      organizationModel.countDocuments(),
      userModel.countDocuments(),
      userModel.countDocuments({ isActive: true }),
    ]);

    const summary = {
      totalOrganizations: totalOrgs,
      totalUsers,
      activeUsers,
      isEmpty: organizations.length === 0,
    };

    return {
      organizations,
      count: totalCount,
      page: pageValue,
      totalPages,
      summary,
    };
  }
};

// ============ 5. INSIGHTS TOOL ============

const handleInsights = async (args, organizationId) => {
  const type = args.type || "dashboard";

  switch (type) {
    case "dashboard": {
      const { startDate, endDate } = parseDateRange({
        period: args.period || "this_month",
      });

      const [
        totalProducts,
        lowStock,
        outOfStock,
        totalSuppliers,
        totalUsers,
        pendingOrders,
        anomaliesCount,
        suggestionsCount,
        allProducts,
        allInvoices,
        categoriesCount,
        categoriesList,
        usersList,
        recentLogs,
        purchaseOrdersSummary,
      ] = await Promise.all([
        productModel.countDocuments(
          buildFindFilter(organizationId, { isActive: true }),
        ),
        productModel.countDocuments(
          buildFindFilter(organizationId, {
            isActive: true,
            $expr: { $lte: ["$quantity", "$reorderThreshold"] },
            quantity: { $gt: 0 },
          }),
        ),
        productModel.countDocuments(
          buildFindFilter(organizationId, {
            isActive: true,
            quantity: 0,
          }),
        ),
        supplierModel.countDocuments(buildFindFilter(organizationId)),
        userModel.countDocuments(
          buildFindFilter(organizationId, { isActive: true }),
        ),
        purchaseOrderModel.countDocuments(
          buildFindFilter(organizationId, { status: "pending" }),
        ),
        anomalyModel.countDocuments(
          buildFindFilter(organizationId, { isResolved: false }),
        ),
        reorderSuggestionModel.countDocuments(
          buildFindFilter(organizationId, { status: "pending" }),
        ),
        productModel
          .find(buildFindFilter(organizationId, { isActive: true }))
          .populate("categoryId", "name")
          .populate("supplierId", "name")
          .lean(),
        invoiceModel
          .find(buildFindFilter(organizationId, { status: "paid" }))
          .populate("products.productId", "name sku costPrice")
          .lean(),
        categoryModel.countDocuments(buildFindFilter(organizationId)),
        categoryModel.find(buildFindFilter(organizationId)).lean(),
        userModel
          .find(buildFindFilter(organizationId))
          .select("name email role isActive")
          .lean(),
        stockLogModel
          .find(buildFindFilter(organizationId))
          .populate("productId", "name sku")
          .populate("performedBy", "name")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        purchaseOrderModel.aggregate([
          { $match: buildFilter(organizationId) },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalCost: { $sum: "$totalCost" },
            },
          },
        ]),
      ]);

      let totalInventoryValue = 0;
      let totalPotentialRevenue = 0;
      let totalPotentialProfit = 0;
      const categoryStatsMap = {};
      const supplierStatsMap = {};

      let invalidProductsCount = 0;
      let deadStockCount = 0;
      const salesMap = {};

      for (const inv of allInvoices) {
        for (const item of inv.products) {
          if (item.productId) {
            const pid =
              item.productId._id?.toString() || item.productId.toString();
            if (!salesMap[pid]) {
              salesMap[pid] = { quantitySold: 0 };
            }
            salesMap[pid].quantitySold += item.quantity;
          }
        }
      }

      for (const p of allProducts) {
        if (!isValidProduct(p)) {
          invalidProductsCount++;
          continue;
        }

        const costVal = p.quantity * p.costPrice;
        const sellVal = p.quantity * p.sellingPrice;
        const potentialProf = sellVal - costVal;

        totalInventoryValue += costVal;
        totalPotentialRevenue += sellVal;
        totalPotentialProfit += potentialProf;

        const catId = p.categoryId?._id?.toString() || "N/A";
        const catName = p.categoryId?.name || "N/A";
        if (!categoryStatsMap[catId]) {
          categoryStatsMap[catId] = {
            name: catName,
            productCount: 0,
            totalStock: 0,
            valuation: 0,
          };
        }
        categoryStatsMap[catId].productCount++;
        categoryStatsMap[catId].totalStock += p.quantity;
        categoryStatsMap[catId].valuation += costVal;

        const suppId = p.supplierId?._id?.toString() || "N/A";
        const suppName = p.supplierId?.name || "N/A";
        if (!supplierStatsMap[suppId]) {
          supplierStatsMap[suppId] = {
            name: suppName,
            productCount: 0,
            totalStock: 0,
            valuation: 0,
          };
        }
        supplierStatsMap[suppId].productCount++;
        supplierStatsMap[suppId].totalStock += p.quantity;
        supplierStatsMap[suppId].valuation += costVal;

        if (p.quantity > 0 && !salesMap[p._id.toString()]) {
          deadStockCount++;
        }
      }

      let revenue = 0;
      let costOfGoodsSold = 0;
      const topSellingMap = {};

      for (const inv of allInvoices) {
        revenue += inv.total || 0;
        for (const item of inv.products) {
          const cost = item.productId?.costPrice || 0;
          costOfGoodsSold += item.quantity * cost;

          if (item.productId) {
            const pid =
              item.productId._id?.toString() || item.productId.toString();
            const pName = item.productId.name || "Unknown Product";
            if (!topSellingMap[pid]) {
              topSellingMap[pid] = { name: pName, quantitySold: 0, revenue: 0 };
            }
            topSellingMap[pid].quantitySold += item.quantity;
            topSellingMap[pid].revenue +=
              item.subtotal || item.quantity * item.sellingPrice || 0;
          }
        }
      }

      const actualProfit = revenue - costOfGoodsSold;
      const grossMargin = revenue > 0 ? (actualProfit / revenue) * 100 : 0;
      const topSellingProducts = Object.values(topSellingMap)
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5);

      const purchases = {
        pendingCount: 0,
        pendingCost: 0,
        approvedCount: 0,
        approvedCost: 0,
        fulfilledCount: 0,
        fulfilledCost: 0,
        rejectedCount: 0,
        rejectedCost: 0,
        totalCost: 0,
        totalCount: 0,
      };
      for (const po of purchaseOrdersSummary) {
        const status = po._id;
        const count = po.count;
        const cost = po.totalCost || 0;
        purchases.totalCount += count;
        purchases.totalCost += cost;
        if (status === "pending") {
          purchases.pendingCount = count;
          purchases.pendingCost = cost;
        } else if (status === "approved") {
          purchases.approvedCount = count;
          purchases.approvedCost = cost;
        } else if (status === "fulfilled") {
          purchases.fulfilledCount = count;
          purchases.fulfilledCost = cost;
        } else if (status === "rejected") {
          purchases.rejectedCount = count;
          purchases.rejectedCost = cost;
        }
      }

      const inventorySummary = {
        totalProducts,
        totalStock: allProducts.reduce((sum, p) => sum + p.quantity, 0),
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
        totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
        lowStock,
        outOfStock,
        deadStock: deadStockCount,
        invalidProducts: invalidProductsCount,
      };

      const dashboard = {
        inventorySummary,
        metrics: {
          totalSuppliers,
          totalUsers,
          pendingOrders,
          anomalies: anomaliesCount,
          suggestions: suggestionsCount,
          revenue: Math.round(revenue * 100) / 100,
          costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
          actualProfit: Math.round(actualProfit * 100) / 100,
          grossMargin: Math.round(grossMargin * 100) / 100,
          orders: allInvoices.length,
          categoriesCount,
        },
        categories: Object.values(categoryStatsMap),
        suppliers: Object.values(supplierStatsMap),
        topSellingProducts,
        team: usersList,
        recentActivity: recentLogs.map((l) => ({
          productName: l.productId?.name || "N/A",
          sku: l.productId?.sku || "N/A",
          type: l.type,
          reason: l.reason,
          quantity: l.quantity,
          performedBy: l.performedBy?.name || "N/A",
          createdAt: l.createdAt,
        })),
        purchases,
        period: args.period || "this_month",
        dateRange: { startDate, endDate },
        invalidProductsWarning:
          invalidProductsCount > 0
            ? `${invalidProductsCount} products have invalid pricing data`
            : null,
        isEmpty: allProducts.length === 0 && allInvoices.length === 0,
      };

      return { dashboard };
    }

    case "forecast": {
      const filter = buildFindFilter(organizationId);
      if (args.product) {
        const prod = await productModel.findOne(
          buildFindFilter(organizationId, {
            $or: [
              { name: new RegExp(escapeRegex(args.product), "i") },
              { sku: args.product },
            ],
          }),
        );
        if (prod) {
          filter.productId = prod._id;
        } else {
          return {
            forecast: [],
            count: 0,
            page: 1,
            totalPages: 0,
            summary: {
              isEmpty: true,
              message: `No product found with name "${args.product}".`,
            },
          };
        }
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const pageValue = Math.max(args.page || 1, 1);
      const skipValue = (pageValue - 1) * limitValue;

      const totalCount = await demandForecastModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitValue);

      const forecasts = await demandForecastModel
        .find(filter)
        .populate("productId", "name sku quantity sellingPrice")
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue)
        .lean();

      const enrichedForecasts = forecasts.map((f) => {
        const days =
          f.forecastPeriod === "7_days"
            ? 7
            : f.forecastPeriod === "30_days"
              ? 30
              : 90;
        const dailyDemand = f.predictedDemand / days;
        const qty = f.productId?.quantity || 0;
        const daysUntilStockout =
          dailyDemand > 0 ? Math.max(0, Math.floor(qty / dailyDemand)) : 9999;

        return {
          ...f,
          daysUntilStockout,
          status:
            daysUntilStockout < 7
              ? "URGENT"
              : daysUntilStockout < 14
                ? "WARNING"
                : "OK",
        };
      });

      return {
        forecast: enrichedForecasts,
        count: totalCount,
        page: pageValue,
        totalPages,
        summary: { isEmpty: totalCount === 0 },
      };
    }

    case "anomalies": {
      const filter = buildFindFilter(organizationId, { isResolved: false });
      if (args.severity) filter.severity = args.severity;
      if (args.product) {
        const prod = await productModel.findOne(
          buildFindFilter(organizationId, {
            name: new RegExp(escapeRegex(args.product), "i"),
          }),
        );
        if (prod) filter.productId = prod._id;
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const pageValue = Math.max(args.page || 1, 1);
      const skipValue = (pageValue - 1) * limitValue;

      const totalCount = await anomalyModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitValue);

      const anomalies = await anomalyModel
        .find(filter)
        .populate("productId", "name sku quantity")
        .sort({ severity: 1, createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue)
        .lean();

      const enrichedAnomalies = anomalies.map((a) => ({
        ...a,
        severityDisplay: getSeverityWithEmoji(a.severity),
      }));

      return {
        anomalies: enrichedAnomalies,
        count: totalCount,
        page: pageValue,
        totalPages,
        summary: { isEmpty: totalCount === 0 },
      };
    }

    case "suggestions": {
      const filter = buildFindFilter(organizationId, { status: "pending" });
      if (args.product) {
        const prod = await productModel.findOne(
          buildFindFilter(organizationId, {
            name: new RegExp(escapeRegex(args.product), "i"),
          }),
        );
        if (prod) filter.productId = prod._id;
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const pageValue = Math.max(args.page || 1, 1);
      const skipValue = (pageValue - 1) * limitValue;

      const totalCount = await reorderSuggestionModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitValue);

      const suggestions = await reorderSuggestionModel
        .find(filter)
        .populate("productId", "name sku quantity reorderThreshold supplierId")
        .sort({ suggestedReorderDate: 1 })
        .skip(skipValue)
        .limit(limitValue)
        .lean();

      const enrichedSuggestions = await Promise.all(
        suggestions.map(async (s) => {
          let supplierName = "N/A";
          if (s.productId?.supplierId) {
            const supp = await supplierModel
              .findById(s.productId.supplierId)
              .select("name");
            supplierName = supp?.name || "N/A";
          }
          return {
            ...s,
            supplierName,
            urgency:
              new Date(s.suggestedReorderDate) <= new Date()
                ? "URGENT"
                : "NORMAL",
            priority:
              new Date(s.suggestedReorderDate) <= new Date()
                ? "🔴 High"
                : "🟡 Medium",
          };
        }),
      );

      return {
        suggestions: enrichedSuggestions,
        count: totalCount,
        page: pageValue,
        totalPages,
        summary: { isEmpty: totalCount === 0 },
      };
    }

    case "abc_analysis": {
      const products = await productModel
        .find(buildFindFilter(organizationId, { isActive: true }))
        .select("name sku quantity costPrice")
        .lean();

      const validProducts = products.filter((p) => isValidProduct(p));

      const sorted = validProducts
        .map((p) => ({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          stock: p.quantity,
          cost: p.costPrice,
          value: p.quantity * p.costPrice,
        }))
        .sort((a, b) => b.value - a.value);

      const totalVal = sorted.reduce((sum, p) => sum + p.value, 0);
      let cumulativeVal = 0;

      const classification = sorted.map((p) => {
        cumulativeVal += p.value;
        const pct = totalVal > 0 ? cumulativeVal / totalVal : 0;
        let cls = "C";
        if (pct <= 0.7) cls = "A";
        else if (pct <= 0.9) cls = "B";
        return {
          ...p,
          cumulativePercentage: Math.round(pct * 10000) / 100,
          class: cls,
        };
      });

      const counts = { A: 0, B: 0, C: 0 };
      const values = { A: 0, B: 0, C: 0 };
      for (const p of classification) {
        counts[p.class]++;
        values[p.class] += p.value;
      }

      const summary = {
        totalValue: Math.round(totalVal * 100) / 100,
        totalProducts: classification.length,
        counts,
        values: {
          A: Math.round(values.A * 100) / 100,
          B: Math.round(values.B * 100) / 100,
          C: Math.round(values.C * 100) / 100,
        },
        isEmpty: classification.length === 0,
      };

      return {
        abcAnalysis: classification,
        summary,
        count: classification.length,
      };
    }

    case "dead_stock": {
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

      const soldProductIds = new Set();
      for (const sale of activeSales) {
        for (const p of sale.products) {
          if (p.productId) soldProductIds.add(p.productId.toString());
        }
      }

      const deadFilter = buildFindFilter(organizationId, {
        isActive: true,
        quantity: { $gt: 0 },
        _id: { $nin: Array.from(soldProductIds) },
      });

      const limitValue = Math.min(
        args.limit || CONSTANTS.DEFAULT_PAGE_LIMIT,
        CONSTANTS.MAX_PAGE_LIMIT,
      );
      const pageValue = Math.max(args.page || 1, 1);
      const skipValue = (pageValue - 1) * limitValue;

      const totalCount = await productModel.countDocuments(deadFilter);
      const totalPages = Math.ceil(totalCount / limitValue);

      const [deadStock, allDeadStockProds] = await Promise.all([
        productModel
          .find(deadFilter)
          .populate("categoryId", "name")
          .populate("supplierId", "name")
          .skip(skipValue)
          .limit(limitValue)
          .lean(),
        productModel.find(deadFilter).select("quantity costPrice").lean(),
      ]);

      const formatted = deadStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        costPrice: p.costPrice,
        value: Math.round(p.quantity * p.costPrice * 100) / 100,
        category: p.categoryId?.name || "N/A",
        supplier: p.supplierId?.name || "N/A",
        createdAt: p.createdAt,
        daysWithoutSale: 30,
      }));

      const totalValueAll = allDeadStockProds.reduce(
        (sum, p) => sum + (p.quantity || 0) * (p.costPrice || 0),
        0,
      );

      const startItem = totalCount > 0 ? skipValue + 1 : 0;
      const endItem = Math.min(skipValue + limitValue, totalCount);
      const showingRange = totalCount > 0 ? `showing ${startItem}–${endItem} of ${totalCount}` : "showing 0 of 0";

      const summary = {
        count: totalCount,
        totalValue: Math.round(totalValueAll * 100) / 100,
        totalProducts: totalCount,
        isEmpty: totalCount === 0,
      };

      return {
        deadStock: formatted,
        summary,
        count: totalCount,
        page: pageValue,
        totalPages,
        pageSize: limitValue,
        showingRange,
      };
    }

    case "insights_history": {
      const filter = buildFindFilter(organizationId);
      if (args.period) filter.period = args.period;

      const limitValue = Math.min(args.limit || 10, 50);
      const pageValue = Math.max(args.page || 1, 1);
      const skipValue = (pageValue - 1) * limitValue;

      const totalCount = await aiInsightsModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limitValue);

      const insights = await aiInsightsModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skipValue)
        .limit(limitValue)
        .lean();

      return {
        insights,
        count: totalCount,
        page: pageValue,
        totalPages,
        summary: { isEmpty: totalCount === 0 },
      };
    }

    default:
      return {
        message: "Invalid insight type requested",
        summary: { isEmpty: true },
      };
  }
};

// ============ 6. DETAILS TOOL ============

const handleGetDetails = async (args, organizationId) => {
  const { type, identifier } = args;

  if (!type || !identifier) {
    return {
      error: true,
      message: "Type and Identifier are required parameters.",
    };
  }

  const baseQuery = buildFindFilter(organizationId);
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

  switch (type) {
    case "product": {
      const q = isObjectId
        ? { _id: identifier }
        : {
          $or: [
            { sku: identifier },
            { name: new RegExp(escapeRegex(identifier), "i") },
          ],
        };

      const product = await productModel
        .findOne({ ...baseQuery, ...q, isActive: true })
        .populate("categoryId", "name")
        .populate("supplierId", "name contactPerson email phone leadTimeDays")
        .lean();

      if (!product)
        return {
          message: `Product "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      if (!isValidProduct(product)) {
        return {
          message: `Product "${identifier}" has invalid pricing data. Please update the product information.`,
          product: {
            name: product.name,
            sku: product.sku,
            issue: "Invalid pricing data detected",
          },
          summary: { isEmpty: true },
        };
      }

      const value = product.quantity * product.costPrice;
      const profit = product.sellingPrice - product.costPrice;
      const margin =
        product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

      const [recentStockLogs, recentSales, openPurchaseOrders, demandForecast] =
        await Promise.all([
          stockLogModel
            .find(buildFindFilter(organizationId, { productId: product._id }))
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          invoiceModel
            .find(
              buildFindFilter(organizationId, {
                "products.productId": product._id,
                status: "paid",
              }),
            )
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
          purchaseOrderModel
            .find(
              buildFindFilter(organizationId, {
                "items.productId": product._id,
                status: "pending",
              }),
            )
            .sort({ createdAt: -1 })
            .lean(),
          demandForecastModel
            .findOne(
              buildFindFilter(organizationId, { productId: product._id }),
            )
            .sort({ createdAt: -1 })
            .lean(),
        ]);

      const status =
        product.quantity === 0
          ? "out_of_stock"
          : product.quantity <= product.reorderThreshold
            ? "low_stock"
            : "in_stock";

      return {
        product: {
          general: {
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            category: product.categoryId?.name || "N/A",
            supplier: product.supplierId?.name || "N/A",
            status: getStatusWithEmoji(status),
          },
          pricing: {
            costPrice: formatCurrency(product.costPrice),
            sellingPrice: formatCurrency(product.sellingPrice),
            profit: formatCurrency(profit),
            margin: formatPercentage(margin),
          },
          inventory: {
            quantity: product.quantity,
            reorderLevel: product.reorderThreshold,
            value: formatCurrency(value),
          },
          forecast: demandForecast
            ? {
              predictedDemand: demandForecast.predictedDemand,
              period: demandForecast.forecastPeriod,
              confidence: `${Math.round(demandForecast.confidence * 100)}%`,
            }
            : null,
          recentStockLogs: recentStockLogs.map((l) => ({
            quantity: l.quantity,
            reason: l.reason,
            createdAt: l.createdAt,
          })),
          recentSales: recentSales.map((s) => ({
            invoiceNumber: s.invoiceNumber,
            total: formatCurrency(s.total),
            createdAt: s.createdAt,
          })),
          openPurchaseOrders: openPurchaseOrders.map((po) => ({
            poNumber: po.poNumber,
            status: po.status,
            createdAt: po.createdAt,
          })),
        },
        summary: { isEmpty: false },
      };
    }

    case "invoice": {
      const q = isObjectId
        ? { _id: identifier }
        : { invoiceNumber: new RegExp(`^${escapeRegex(identifier)}$`, "i") };

      const invoice = await invoiceModel
        .findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name email")
        .populate("voidedBy", "name email")
        .populate({
          path: "products.productId",
          select: "name sku unit costPrice sellingPrice categoryId supplierId",
          populate: [
            { path: "categoryId", select: "name" },
            { path: "supplierId", select: "name" },
          ],
        })
        .lean();

      if (!invoice)
        return {
          message: `Invoice "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      let totalCostOfGoodsSold = 0;
      const lineItems = invoice.products.map((item) => {
        const product = item.productId;
        const productName = product?.name || "Unknown Product";
        const sku = product?.sku || "N/A";
        const unitCost = product?.costPrice || 0;
        const sellingPrice = item.sellingPrice || product?.sellingPrice || 0;
        const qty = item.quantity || 0;
        const itemSubtotal = item.subtotal || qty * sellingPrice;
        const itemCostTotal = qty * unitCost;
        const itemProfit = itemSubtotal - itemCostTotal;
        const itemMargin =
          itemSubtotal > 0 ? (itemProfit / itemSubtotal) * 100 : 0;

        totalCostOfGoodsSold += itemCostTotal;

        return {
          productName,
          sku,
          quantity: qty,
          unitPrice: formatCurrency(sellingPrice),
          unitCost: formatCurrency(unitCost),
          subtotal: formatCurrency(itemSubtotal),
          profit: formatCurrency(itemProfit),
          margin: formatPercentage(itemMargin),
          category: product?.categoryId?.name || "N/A",
          supplier: product?.supplierId?.name || "N/A",
        };
      });

      const totalProfit = invoice.total - totalCostOfGoodsSold;
      const grossMargin =
        invoice.total > 0 ? (totalProfit / invoice.total) * 100 : 0;

      const recentStockLogs = await stockLogModel
        .find(
          buildFindFilter(organizationId, { relatedInvoiceId: invoice._id }),
        )
        .populate("productId", "name sku")
        .populate("performedBy", "name")
        .lean();

      return {
        invoice: {
          general: {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            status: invoice.status,
            createdAt: invoice.createdAt,
            createdBy: invoice.createdBy?.name || "N/A",
            voidedBy: invoice.voidedBy?.name || null,
          },
          financials: {
            subtotal: formatCurrency(invoice.subtotal),
            tax: formatCurrency(invoice.tax),
            discount: formatCurrency(invoice.discount),
            total: formatCurrency(invoice.total),
            costOfGoodsSold: formatCurrency(totalCostOfGoodsSold),
            profit: formatCurrency(totalProfit),
            margin: formatPercentage(grossMargin),
          },
          lineItems,
          stockLogs: recentStockLogs.map((l) => ({
            productName: l.productId?.name || "N/A",
            quantity: l.quantity,
            reason: l.reason,
            performedBy: l.performedBy?.name || "N/A",
            createdAt: l.createdAt,
          })),
        },
        summary: { isEmpty: false },
      };
    }

    case "supplier": {
      const q = isObjectId
        ? { _id: identifier }
        : { name: new RegExp(escapeRegex(identifier), "i") };

      const supplier = await supplierModel.findOne({ ...baseQuery, ...q }).lean();
      if (!supplier) {
        return {
          message: `Supplier "${identifier}" not found.`,
          summary: { isEmpty: true },
        };
      }

      const [products, purchaseOrders] = await Promise.all([
        productModel
          .find(buildFindFilter(organizationId, { supplierId: supplier._id, isActive: true }))
          .populate("categoryId", "name")
          .lean(),
        purchaseOrderModel
          .find(buildFindFilter(organizationId, { supplierId: supplier._id }))
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      const validProds = products.filter((p) => isValidProduct(p));
      const totalCostValue = validProds.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
      const totalSellingValue = validProds.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0);

      return {
        supplier: {
          info: {
            name: supplier.name,
            contactPerson: supplier.contactPerson || "N/A",
            email: supplier.email || "N/A",
            phone: supplier.phone || "N/A",
            address: supplier.address || "N/A",
            leadTimeDays: supplier.leadTimeDays ?? "N/A",
          },
          metrics: {
            productsCount: validProds.length,
            totalCostValue: formatCurrency(totalCostValue),
            totalSellingValue: formatCurrency(totalSellingValue),
            purchaseOrdersCount: purchaseOrders.length,
          },
          productsList: validProds.map((p) => ({
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            costPrice: formatCurrency(p.costPrice),
            sellingPrice: formatCurrency(p.sellingPrice),
            category: p.categoryId?.name || "N/A",
          })),
          recentPurchaseOrders: purchaseOrders.map((po) => ({
            poNumber: po.poNumber,
            totalCost: formatCurrency(po.totalCost),
            status: po.status,
            createdAt: po.createdAt,
          })),
        },
        summary: { isEmpty: false },
      };
    }

    case "category": {
      const q = isObjectId
        ? { _id: identifier }
        : { name: new RegExp(escapeRegex(identifier), "i") };

      const category = await categoryModel.findOne({ ...baseQuery, ...q }).lean();
      if (!category) {
        return {
          message: `Category "${identifier}" not found.`,
          summary: { isEmpty: true },
        };
      }

      const products = await productModel
        .find(buildFindFilter(organizationId, { categoryId: category._id, isActive: true }))
        .populate("supplierId", "name")
        .lean();

      const validProds = products.filter((p) => isValidProduct(p));
      const totalCostValue = validProds.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
      const totalSellingValue = validProds.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0);

      return {
        category: {
          info: {
            name: category.name,
            description: category.description || "N/A",
          },
          metrics: {
            productsCount: validProds.length,
            totalCostValue: formatCurrency(totalCostValue),
            totalSellingValue: formatCurrency(totalSellingValue),
          },
          productsList: validProds.map((p) => ({
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            costPrice: formatCurrency(p.costPrice),
            sellingPrice: formatCurrency(p.sellingPrice),
            supplier: p.supplierId?.name || "N/A",
          })),
        },
        summary: { isEmpty: false },
      };
    }

    case "purchase_order": {
      const q = isObjectId
        ? { _id: identifier }
        : { poNumber: new RegExp(`^${escapeRegex(identifier)}$`, "i") };

      const po = await purchaseOrderModel
        .findOne({ ...baseQuery, ...q })
        .populate("supplierId", "name contactPerson email phone leadTimeDays")
        .populate("createdBy", "name email")
        .populate("items.productId", "name sku unit costPrice sellingPrice")
        .lean();

      if (!po) {
        return {
          message: `Purchase Order "${identifier}" not found.`,
          summary: { isEmpty: true },
        };
      }

      const lineItems = po.items.map((item) => {
        const prod = item.productId;
        const qty = item.quantity || 0;
        const unitCost = item.costPrice || prod?.costPrice || 0;
        const totalCost = item.totalCost || qty * unitCost;

        return {
          productName: prod?.name || "Unknown Product",
          sku: prod?.sku || "N/A",
          quantity: qty,
          unitCost: formatCurrency(unitCost),
          totalCost: formatCurrency(totalCost),
        };
      });

      return {
        purchaseOrder: {
          general: {
            poNumber: po.poNumber,
            supplier: po.supplierId?.name || "N/A",
            supplierContact: po.supplierId?.contactPerson || "N/A",
            status: po.status,
            createdAt: po.createdAt,
            createdBy: po.createdBy?.name || "N/A",
          },
          financials: {
            totalCost: formatCurrency(po.totalCost),
          },
          lineItems,
        },
        summary: { isEmpty: false },
      };
    }

    case "user": {
      const q = isObjectId
        ? { _id: identifier }
        : {
          $or: [
            { email: new RegExp(`^${escapeRegex(identifier)}$`, "i") },
            { name: new RegExp(escapeRegex(identifier), "i") },
          ],
        };

      const targetUser = await userModel.findOne({ ...baseQuery, ...q }).lean();
      if (!targetUser) {
        return {
          message: `User "${identifier}" not found.`,
          summary: { isEmpty: true },
        };
      }

      const [invoices, purchaseOrders, stockLogs] = await Promise.all([
        invoiceModel.find(buildFindFilter(organizationId, { createdBy: targetUser._id })).lean(),
        purchaseOrderModel.find(buildFindFilter(organizationId, { createdBy: targetUser._id })).lean(),
        stockLogModel.find(buildFindFilter(organizationId, { performedBy: targetUser._id })).lean(),
      ]);

      const revenueGenerated = invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      return {
        user: {
          info: {
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            isActive: targetUser.isActive ? "Yes" : "No",
            createdAt: targetUser.createdAt,
          },
          metrics: {
            invoicesCreated: invoices.length,
            totalRevenueGenerated: formatCurrency(revenueGenerated),
            purchaseOrdersCreated: purchaseOrders.length,
            stockLogsCount: stockLogs.length,
          },
        },
        summary: { isEmpty: false },
      };
    }

    case "organization": {
      let org = null;
      if (organizationId) {
        org = await organizationModel.findById(organizationId).lean();
      } else if (isObjectId) {
        org = await organizationModel.findById(identifier).lean();
      } else {
        org = await organizationModel.findOne({ name: new RegExp(escapeRegex(identifier), "i") }).lean();
      }

      if (!org) {
        return {
          message: `Organization "${identifier}" not found.`,
          summary: { isEmpty: true },
        };
      }

      const targetOrgId = org._id;
      const [usersCount, productsCount, invoices] = await Promise.all([
        userModel.countDocuments({ organizationId: targetOrgId }),
        productModel.countDocuments({ organizationId: targetOrgId, isActive: true }),
        invoiceModel.find({ organizationId: targetOrgId, status: "paid" }).select("total").lean(),
      ]);

      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      return {
        organization: {
          info: {
            name: org.name,
            contactEmail: org.contactEmail || "N/A",
            address: org.address || "N/A",
            createdAt: org.createdAt,
          },
          metrics: {
            usersCount,
            productsCount,
            totalRevenue: formatCurrency(totalRevenue),
          },
        },
        summary: { isEmpty: false },
      };
    }

    default:
      return {
        isUnsupported: true,
        message: `Unsupported entity type: ${type}. Supported types: product, supplier, category, invoice, purchase_order, user, organization`,
        summary: { isEmpty: true },
      };
  }
};

// ============ 7. TRANSACTIONS TOOL ============

const handleTransactions = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  if (args.product) {
    const products = await productModel
      .find(
        buildFindFilter(organizationId, {
          $or: [
            { name: new RegExp(escapeRegex(args.product), "i") },
            { sku: args.product },
          ],
        }),
      )
      .select("_id");

    if (products.length > 0) {
      filter.productId = { $in: products.map((p) => p._id) };
    } else {
      return createEmptyTransactionResult(
        `No product found with name "${args.product}".`,
      );
    }
  }

  if (args.type && args.type !== "all") {
    filter.type = args.type;
  }

  if (args.reason && args.reason !== "all") {
    filter.reason = args.reason;
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.performedBy = { $in: userIds };
    } else {
      return createEmptyTransactionResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
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
    .populate("productId", "name sku costPrice sellingPrice")
    .populate("performedBy", "name email role")
    .populate("relatedInvoiceId", "invoiceNumber")
    .populate("relatedPurchaseOrderId", "poNumber")
    .sort({ createdAt: -1 })
    .skip(skipValue)
    .limit(limitValue)
    .lean();

  const transactions = rawLogs.map((l) => ({
    _id: l._id,
    productName: l.productId?.name || "N/A",
    productSku: l.productId?.sku || "N/A",
    type: l.type === "in" ? "📥 In" : "📤 Out",
    reason: l.reason,
    quantity: l.quantity,
    performedBy: l.performedBy?.name || "N/A",
    referenceNumber:
      l.relatedInvoiceId?.invoiceNumber ||
      l.relatedPurchaseOrderId?.poNumber ||
      "N/A",
    createdAt: l.createdAt,
  }));

  const allLogsForStats = await stockLogModel
    .find(filter)
    .select("type quantity")
    .lean();
  let totalIn = 0;
  let totalOut = 0;
  for (const log of allLogsForStats) {
    if (log.type === "in") totalIn += log.quantity;
    else if (log.type === "out") totalOut += log.quantity;
  }

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange = totalCount > 0 ? `showing ${startItem}–${endItem} of ${totalCount}` : "showing 0 of 0";

  const summary = {
    totalTransactions: allLogsForStats.length,
    totalIn,
    totalOut,
    isEmpty: allLogsForStats.length === 0,
  };

  return {
    transactions,
    count: totalCount,
    page: pageValue,
    totalPages,
    pageSize: limitValue,
    showingRange,
    summary,
    filters: { limit: limitValue, page: pageValue, ...args },
  };
};

const createEmptyTransactionResult = (message) => {
  return {
    transactions: [],
    count: 0,
    page: 1,
    totalPages: 0,
    summary: {
      totalTransactions: 0,
      totalIn: 0,
      totalOut: 0,
      isEmpty: true,
      message: message || "No transactions found matching your criteria.",
    },
  };
};

// ============ EXPORTS ============

export const executeTool = async (
  toolName,
  args,
  organizationId,
  role = "admin",
) => {
  try {
    switch (toolName) {
      case "query_inventory":
        return await handleInventory(args, organizationId);
      case "query_purchases":
        return await handlePurchases(args, organizationId);
      case "query_sales":
        return await handleSales(args, organizationId);
      case "query_organization":
        return await handleOrganization(args, organizationId);
      case "query_insights":
        return await handleInsights(args, organizationId);
      case "get_details":
        return await handleGetDetails(args, organizationId);
      case "query_transactions":
        return await handleTransactions(args, organizationId);
      default:
        return {
          message: "I don't understand that request. Please rephrase.",
          summary: { isEmpty: true },
        };
    }
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return {
      error: true,
      message: "An error occurred processing your request",
      summary: { isEmpty: true },
    };
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
  if (role !== "admin" && role !== "super_admin") {
    return [];
  }
  return allTools;
};
