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

// ============ DYNAMIC FIELD EXTRACTION HELPERS ============

const getValueByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

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
  const pctVal = value > 1 ? value : value * 100;
  return `${Math.round(pctVal)}%`;
};

const extractDynamicFields = (docs, options = {}) => {
  if (!docs || !Array.isArray(docs) || docs.length === 0) {
    return { fields: [], data: [] };
  }

  const {
    excludeFields = [
      "_id",
      "__v",
      "organizationId",
      "password",
      "tokenVersion",
      "updatedAt",
    ],
    maxFields = 15,
    preferredFields = [],
    flattenNested = true,
  } = options;

  const fieldSet = new Set();
  const fieldTypes = {};
  const fieldSamples = {};

  docs.forEach((doc) => {
    const flatten = (obj, prefix = "") => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          typeof obj[0] === "object" &&
          !Array.isArray(obj[0])
        ) {
          flatten(obj[0], prefix);
        } else if (obj.length > 0) {
          const key = prefix || "itemsCount";
          fieldSet.add(key);
          fieldTypes[key] = "number";
          fieldSamples[key] = obj.length;
        }
        return;
      }

      const keys = Object.keys(obj);
      for (const key of keys) {
        if (key === "_id" && prefix) continue;

        const fullPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (excludeFields.includes(key) || excludeFields.includes(fullPath)) {
          continue;
        }

        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          if (flattenNested) {
            flatten(value, key);
          } else {
            fieldSet.add(fullPath);
            fieldTypes[fullPath] = "object";
            fieldSamples[fullPath] = "Object";
          }
        } else {
          if (Array.isArray(value)) {
            const countKey = prefix ? `${prefix}Count` : `${key}Count`;
            fieldSet.add(countKey);
            fieldTypes[countKey] = "number";
            fieldSamples[countKey] = value.length;
            continue;
          }

          fieldSet.add(fullPath);
          if (value instanceof Date) {
            fieldTypes[fullPath] = "date";
          } else if (typeof value === "number") {
            fieldTypes[fullPath] = "number";
          } else if (typeof value === "boolean") {
            fieldTypes[fullPath] = "boolean";
          } else {
            fieldTypes[fullPath] = "string";
          }
          fieldSamples[fullPath] = value;
        }
      }
    };

    flatten(doc);
  });

  let fields = Array.from(fieldSet);

  if (preferredFields.length > 0) {
    fields.sort((a, b) => {
      const aPreferred = preferredFields.some((pf) => a.includes(pf));
      const bPreferred = preferredFields.some((pf) => b.includes(pf));
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return a.localeCompare(b);
    });
  }

  if (fields.length > maxFields) {
    const preferred = fields.filter((f) =>
      preferredFields.some((pf) => f.includes(pf)),
    );
    const rest = fields.filter(
      (f) => !preferredFields.some((pf) => f.includes(pf)),
    );
    fields = [...preferred, ...rest.slice(0, maxFields - preferred.length)];
  }

  const fieldLabels = fields.map((field) => {
    const parts = field.split(".");
    const lastPart = parts[parts.length - 1];
    const label = lastPart
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    const type = fieldTypes[field] || "string";
    const sample = fieldSamples[field];

    let format = undefined;
    if (type === "number") {
      const keyLower = field.toLowerCase();
      if (
        keyLower.includes("price") ||
        keyLower.includes("cost") ||
        keyLower.includes("revenue") ||
        keyLower.includes("total") ||
        keyLower.includes("amount") ||
        keyLower.includes("value") ||
        keyLower.includes("profit") ||
        keyLower.includes("subtotal") ||
        keyLower.includes("valuation")
      ) {
        format = "currency";
      } else if (
        keyLower.includes("margin") ||
        keyLower.includes("percentage")
      ) {
        format = "percentage";
      }
    }
    if (type === "date") format = "date";
    if (type === "boolean") format = "boolean";

    return {
      key: field,
      label: label,
      type: type,
      format: format,
      isNested: field.includes("."),
      sortable: type !== "object" && type !== "array",
      sample: sample,
    };
  });

  const formattedData = docs.map((doc) => {
    const row = {};
    fields.forEach((field) => {
      const rawValue = getValueByPath(doc, field);
      if (Array.isArray(rawValue)) {
        row[field] = rawValue.length;
        return;
      }
      row[field] = rawValue !== undefined && rawValue !== null ? rawValue : "—";
    });
    return row;
  });

  return { fields: fieldLabels, data: formattedData };
};

// ============ STATUS HELPERS ============

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

// ============ FILTER HELPERS ============

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
      return createEmptyResult("No category found with that name.");
    }
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) {
      filter.supplierId = supp._id;
    } else {
      return createEmptyResult(
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
      return createEmptyResult(
        `No users found with name "${args.creatorName}".`,
      );
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
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      inventoryValue: Math.round(p.quantity * p.costPrice * 100) / 100,
      potentialRevenue: Math.round(p.quantity * p.sellingPrice * 100) / 100,
      unit: p.unit,
      category: p.categoryId?.name || "N/A",
      supplier: p.supplierId?.name || "N/A",
      reorderLevel: p.reorderThreshold,
      status: getStatusWithEmoji(statusKey),
      statusKey: statusKey,
      createdAt: p.createdAt,
    };
  });

  const lowerQuery = (args._query || "").toLowerCase();
  const isDetailed =
    lowerQuery.includes("detail") ||
    lowerQuery.includes("complete") ||
    lowerQuery.includes("all field") ||
    lowerQuery.includes("every field") ||
    lowerQuery.includes("full info");

  const { fields, data: formattedData } = extractDynamicFields(
    enhancedProducts,
    {
      preferredFields: [
        "name",
        "sku",
        "quantity",
        "sellingPrice",
        "status",
        "category",
        "supplier",
        "profit",
        "margin",
      ],
      maxFields: isDetailed ? 15 : 8,
      excludeFields: ["_id", "__v", "organizationId", "updatedAt", "statusKey"],
      flattenNested: true,
    },
  );

  let displayFields = fields;
  if (!isDetailed && fields.length > 6) {
    const essentialFields = [
      "name",
      "sku",
      "quantity",
      "sellingPrice",
      "status",
    ];
    displayFields = fields.filter((f) =>
      essentialFields.some((ef) => f.key.includes(ef)),
    );
    if (displayFields.length < 3) {
      displayFields = fields.slice(0, 6);
    }
  }

  const allProductsForStats = await productModel.find(filter).lean();
  let totalStock = 0;
  let totalInventoryValue = 0;
  let totalPotentialRevenue = 0;
  let totalPotentialProfit = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let deadStockCount = 0;
  let inStockCount = 0;
  let invalidProductsCount = 0;

  for (const p of allProductsForStats) {
    if (!isValidProduct(p)) {
      invalidProductsCount++;
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
    invalidProductsCount: invalidProductsCount,
    statusBreakdown: {
      "🟢 In Stock": inStockCount,
      "🟡 Low Stock": lowStockCount,
      "🔴 Out of Stock": outOfStockCount,
      "⚫ Dead Stock": deadStockCount,
    },
    isEmpty: totalCount === 0,
  };

  return {
    data: formattedData,
    fields: displayFields,
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
    ]);

    const groupedResults = await productModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: [
        "categoryName",
        "productCount",
        "totalCostValue",
        "totalSellingValue",
      ],
      maxFields: 10,
      flattenNested: true,
    });

    const totalProducts = groupedResults.reduce(
      (sum, g) => sum + g.productCount,
      0,
    );
    const totalCostValue = groupedResults.reduce(
      (sum, g) => sum + g.totalCostValue,
      0,
    );

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Categories",
      summary: {
        totalCategories: groupedResults.length,
        totalProducts: totalProducts,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
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
    ]);

    const groupedResults = await productModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: [
        "supplierName",
        "productCount",
        "totalCostValue",
        "totalSellingValue",
      ],
      maxFields: 10,
      flattenNested: true,
    });

    const totalProducts = groupedResults.reduce(
      (sum, g) => sum + g.productCount,
      0,
    );

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Suppliers",
      summary: {
        totalSuppliers: groupedResults.length,
        totalProducts: totalProducts,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  if (args.groupBy === "status") {
    pipeline = pipeline.concat([
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
    ]);

    const groupedResults = await productModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: [
        "statusDisplay",
        "productCount",
        "totalCostValue",
        "totalSellingValue",
      ],
      maxFields: 10,
      flattenNested: true,
    });

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Stock Status",
      summary: {
        totalStatusGroups: groupedResults.length,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  return { data: [], fields: [], count: 0, summary: { isEmpty: true } };
};

const createEmptyResult = (message) => {
  return {
    data: [],
    fields: [],
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
      return createEmptyResult(
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
      return createEmptyResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    const groupField = args.groupBy === "supplier" ? "$supplierId" : "$status";

    let pipeline = [
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
      pipeline = pipeline.concat([
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
      ]);
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
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: ["supplierName", "status", "orderCount", "totalSpent"],
      maxFields: 8,
      flattenNested: true,
    });

    const totalOrders = groupedResults.reduce(
      (sum, g) => sum + g.orderCount,
      0,
    );
    const totalSpent = groupedResults.reduce((sum, g) => sum + g.totalSpent, 0);

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Purchase Orders",
      summary: {
        totalGroups: groupedResults.length,
        totalOrders: totalOrders,
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

  const enhancedOrders = rawOrders.map((o) => ({
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

  const { fields, data: formattedData } = extractDynamicFields(enhancedOrders, {
    preferredFields: [
      "poNumber",
      "supplier",
      "totalCost",
      "status",
      "createdBy",
    ],
    maxFields: 10,
    excludeFields: ["_id", "__v", "organizationId"],
    flattenNested: true,
  });

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

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange =
    totalCount > 0
      ? `showing ${startItem}–${endItem} of ${totalCount}`
      : "showing 0 of 0";

  const summary = {
    totalOrders: allOrdersForStats.length,
    totalCost: Math.round(totalCost * 100) / 100,
    averageOrderCost:
      allOrdersForStats.length > 0
        ? Math.round((totalCost / allOrdersForStats.length) * 100) / 100
        : 0,
    statusCounts: statusCounts,
    isEmpty: allOrdersForStats.length === 0,
  };

  return {
    data: formattedData,
    fields: fields,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    pageSize: limitValue,
    showingRange: showingRange,
    tableTitle: "Purchase Orders",
    summary: summary,
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
      return createEmptyResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    let pipeline = [{ $match: matchFilter }];

    if (args.groupBy === "customer") {
      pipeline.push({
        $group: {
          _id: { $toLower: "$customerName" },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageRevenue: { $avg: "$total" },
        },
      });
    } else if (args.groupBy === "status") {
      pipeline.push({
        $group: {
          _id: "$status",
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageRevenue: { $avg: "$total" },
        },
      });
    } else if (args.groupBy === "daily") {
      pipeline.push({
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageRevenue: { $avg: "$total" },
        },
      });
    } else if (args.groupBy === "monthly") {
      pipeline.push({
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          salesCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          averageRevenue: { $avg: "$total" },
        },
      });
    } else if (args.groupBy === "role") {
      pipeline = pipeline.concat([
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorDetails",
          },
        },
        {
          $unwind: {
            path: "$creatorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: { $ifNull: ["$creatorDetails.role", "unknown"] },
            salesCount: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
            averageRevenue: { $avg: "$total" },
            userSet: { $addToSet: "$createdBy" },
          },
        },
        {
          $project: {
            role: "$_id",
            roleDisplay: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", "admin"] }, then: "Admin" },
                  { case: { $eq: ["$_id", "manager"] }, then: "Manager" },
                  { case: { $eq: ["$_id", "staff"] }, then: "Staff" },
                  {
                    case: { $eq: ["$_id", "super_admin"] },
                    then: "Super Admin",
                  },
                ],
                default: "$_id",
              },
            },
            salesCount: 1,
            totalRevenue: 1,
            averageRevenue: 1,
            uniqueCreatorsCount: { $size: "$userSet" },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);
    }

    pipeline.push({ $sort: { _id: 1 } });

    const groupedResults = await invoiceModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: ["_id", "salesCount", "totalRevenue", "roleDisplay"],
      maxFields: 8,
      flattenNested: true,
    });

    const totalInvoices = groupedResults.reduce(
      (sum, g) => sum + g.salesCount,
      0,
    );
    const totalRevenue = groupedResults.reduce(
      (sum, g) => sum + g.totalRevenue,
      0,
    );

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Sales Summary",
      summary: {
        totalGroups: groupedResults.length,
        totalInvoices: totalInvoices,
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

  const enhancedInvoices = rawInvoices.map((inv) => {
    let totalCost = 0;
    for (const item of inv.products) {
      const itemCost = item.productId?.costPrice || 0;
      totalCost += item.quantity * itemCost;
    }
    const profit = inv.total - totalCost;
    const margin = inv.total > 0 ? (profit / inv.total) * 100 : 0;

    return {
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      subtotal: Math.round(inv.subtotal * 100) / 100,
      tax: Math.round(inv.tax * 100) / 100,
      discount: inv.discount || 0,
      total: Math.round(inv.total * 100) / 100,
      costOfGoodsSold: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      status: inv.status,
      createdBy: inv.createdBy?.name || "N/A",
      createdAt: inv.createdAt,
    };
  });

  const { fields, data: formattedData } = extractDynamicFields(
    enhancedInvoices,
    {
      preferredFields: [
        "invoiceNumber",
        "customerName",
        "total",
        "subtotal",
        "profit",
        "margin",
        "status",
        "createdBy",
      ],
      maxFields: 10,
      excludeFields: ["_id", "__v", "organizationId", "products"],
      flattenNested: true,
    },
  );

  const allSalesForStats = await invoiceModel
    .find(filter)
    .populate("products.productId", "costPrice")
    .lean();

  let totalSales = 0;
  let totalCostOfSales = 0;
  const statusCounts = { paid: 0, unpaid: 0, void: 0 };
  const customerMap = {};

  for (const inv of allSalesForStats) {
    if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    const invTotal = inv.total || 0;
    totalSales += invTotal;

    if (inv.status === "paid") {
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

  const totalProfit = totalSales - totalCostOfSales;
  const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

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

  const startItem = totalCount > 0 ? skipValue + 1 : 0;
  const endItem = Math.min(skipValue + limitValue, totalCount);
  const showingRange =
    totalCount > 0
      ? `showing ${startItem}–${endItem} of ${totalCount}`
      : "showing 0 of 0";

  const summary = {
    totalSales: Math.round(totalSales * 100) / 100,
    totalCostOfSales: Math.round(totalCostOfSales * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    totalInvoices: allSalesForStats.length,
    averageInvoiceValue:
      allSalesForStats.length > 0
        ? Math.round((totalSales / allSalesForStats.length) * 100) / 100
        : 0,
    statusCounts: statusCounts,
    customerMetrics: customerMetrics,
    isEmpty: allSalesForStats.length === 0,
  };

  return {
    data: formattedData,
    fields: fields,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    pageSize: limitValue,
    showingRange: showingRange,
    tableTitle: "Invoices",
    summary: summary,
  };
};

// ============ 4. ORGANIZATION TOOL ============

const handleOrganization = async (args, organizationId) => {
  if (!organizationId) {
    const searchFilter = args.search
      ? { name: new RegExp(escapeRegex(args.search), "i") }
      : {};
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

    const enhancedOrgs = organizationsList.map((org) => ({
      name: org.name,
      contactEmail: org.contactEmail,
      status: org.status,
      usersCount: userCountMap[org._id.toString()] || 0,
      productsCount: productCountMap[org._id.toString()] || 0,
      salesValue: salesMap[org._id.toString()] || 0,
      createdAt: org.createdAt,
    }));

    const { fields, data } = extractDynamicFields(enhancedOrgs, {
      preferredFields: [
        "name",
        "contactEmail",
        "usersCount",
        "productsCount",
        "salesValue",
        "status",
      ],
      maxFields: 8,
      flattenNested: true,
    });

    const summary = {
      totalOrganizations: totalCount,
      isEmpty: organizationsList.length === 0,
    };

    return {
      data: data,
      fields: fields,
      count: totalCount,
      page: pageValue,
      totalPages: totalPages,
      tableTitle: "Organizations",
      summary: summary,
    };
  }

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

  if (args.groupBy === "role") {
    const matchFilter = buildFilter(organizationId, filter);
    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "invoices",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", "$$userId"] },
                    { $eq: ["$status", "paid"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                revenue: { $sum: "$total" },
              },
            },
          ],
          as: "invoiceStats",
        },
      },
      {
        $group: {
          _id: "$role",
          userCount: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          invoicesCreated: {
            $sum: {
              $ifNull: [{ $arrayElemAt: ["$invoiceStats.count", 0] }, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $ifNull: [{ $arrayElemAt: ["$invoiceStats.revenue", 0] }, 0],
            },
          },
        },
      },
      {
        $project: {
          role: "$_id",
          roleDisplay: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "admin"] }, then: "Admin" },
                { case: { $eq: ["$_id", "manager"] }, then: "Manager" },
                { case: { $eq: ["$_id", "staff"] }, then: "Staff" },
                { case: { $eq: ["$_id", "super_admin"] }, then: "Super Admin" },
              ],
              default: "$_id",
            },
          },
          userCount: 1,
          activeCount: 1,
          invoicesCreated: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { userCount: -1 } },
    ];

    const groupedResults = await userModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: [
        "roleDisplay",
        "userCount",
        "activeCount",
        "invoicesCreated",
        "totalRevenue",
      ],
      maxFields: 8,
      flattenNested: true,
    });

    const totalUsers = groupedResults.reduce((sum, g) => sum + g.userCount, 0);

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Roles",
      summary: {
        totalRoles: groupedResults.length,
        totalUsers: totalUsers,
        isEmpty: groupedResults.length === 0,
      },
    };
  }

  const limitValue = Math.min(args.limit || 50, 100);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const [
    orgDoc,
    totalCount,
    users,
    categoriesList,
    suppliersList,
    productsCount,
    allPaidInvoices,
  ] = await Promise.all([
    organizationModel.findById(organizationId).lean(),
    userModel.countDocuments(filter),
    userModel
      .find(filter)
      .select("-password -tokenVersion -__v")
      .sort(
        args.sortBy
          ? { [args.sortBy]: args.sortOrder === "desc" ? -1 : 1 }
          : { createdAt: -1 },
      )
      .skip(skipValue)
      .limit(limitValue)
      .lean(),
    categoryModel.find(buildFindFilter(organizationId)).lean(),
    supplierModel.find(buildFindFilter(organizationId)).lean(),
    productModel.countDocuments(
      buildFindFilter(organizationId, { isActive: true }),
    ),
    invoiceModel
      .find(buildFindFilter(organizationId, { status: "paid" }))
      .select("total createdBy")
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / limitValue);
  let totalOrganizationRevenue = 0;
  const userMetricsMap = {};

  allPaidInvoices.forEach((inv) => {
    const rev = inv.total || 0;
    totalOrganizationRevenue += rev;
    if (inv.createdBy) {
      const creatorId = inv.createdBy.toString();
      if (!userMetricsMap[creatorId]) {
        userMetricsMap[creatorId] = { invoicesCreated: 0, revenueGenerated: 0 };
      }
      userMetricsMap[creatorId].invoicesCreated += 1;
      userMetricsMap[creatorId].revenueGenerated += rev;
    }
  });

  const enrichedUsers = users.map((user) => ({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive ? "Yes" : "No",
    invoicesCreated: userMetricsMap[user._id.toString()]?.invoicesCreated || 0,
    revenueGenerated:
      Math.round(
        (userMetricsMap[user._id.toString()]?.revenueGenerated || 0) * 100,
      ) / 100,
    createdAt: user.createdAt,
  }));

  const enrichedCategories = categoriesList.map((c) => ({
    name: c.name,
    description: c.description || "N/A",
    productCount: 0,
    totalValuation: 0,
  }));

  const enrichedSuppliers = suppliersList.map((s) => ({
    name: s.name,
    contactPerson: s.contactPerson || "N/A",
    email: s.email || "N/A",
    phone: s.phone || "N/A",
    productCount: 0,
    totalValuation: 0,
  }));

  const productsInOrg = await productModel
    .find(buildFindFilter(organizationId, { isActive: true }))
    .select("categoryId supplierId quantity costPrice")
    .lean();

  const catMap = {};
  enrichedCategories.forEach((c) => {
    catMap[c.name] = c;
  });
  const suppMap = {};
  enrichedSuppliers.forEach((s) => {
    suppMap[s.name] = s;
  });

  await Promise.all(
    productsInOrg.map(async (p) => {
      const val = (p.quantity || 0) * (p.costPrice || 0);
      if (p.categoryId) {
        const cat = await categoryModel.findById(p.categoryId).lean();
        if (cat && catMap[cat.name]) {
          catMap[cat.name].productCount += 1;
          catMap[cat.name].totalValuation += val;
        }
      }
      if (p.supplierId) {
        const supp = await supplierModel.findById(p.supplierId).lean();
        if (supp && suppMap[supp.name]) {
          suppMap[supp.name].productCount += 1;
          suppMap[supp.name].totalValuation += val;
        }
      }
    }),
  );

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
    organizationName: orgDoc?.name || "Organization",
    totalUsers: totalCount,
    activeUsers: activeUsers,
    roleBreakdown: roleBreakdown,
    categoriesCount: categoriesList.length,
    suppliersCount: suppliersList.length,
    productsCount: productsCount,
    totalRevenue: Math.round(totalOrganizationRevenue * 100) / 100,
    isEmpty:
      totalCount === 0 &&
      categoriesList.length === 0 &&
      suppliersList.length === 0,
  };

  if (args.target === "users") {
    const { fields, data } = extractDynamicFields(enrichedUsers, {
      preferredFields: [
        "name",
        "email",
        "role",
        "isActive",
        "invoicesCreated",
        "revenueGenerated",
      ],
      maxFields: 8,
      flattenNested: true,
    });
    return {
      target: "users",
      data: data,
      fields: fields,
      count: totalCount,
      page: pageValue,
      totalPages: totalPages,
      tableTitle: "Team Members",
      summary: summary,
    };
  }

  if (args.target === "categories") {
    const { fields, data } = extractDynamicFields(Object.values(catMap), {
      preferredFields: ["name", "productCount", "totalValuation"],
      maxFields: 6,
      flattenNested: true,
    });
    return {
      target: "categories",
      data: data,
      fields: fields,
      count: Object.values(catMap).length,
      tableTitle: "Categories",
      summary: summary,
    };
  }

  if (args.target === "suppliers") {
    const { fields, data } = extractDynamicFields(Object.values(suppMap), {
      preferredFields: [
        "name",
        "contactPerson",
        "productCount",
        "totalValuation",
      ],
      maxFields: 6,
      flattenNested: true,
    });
    return {
      target: "suppliers",
      data: data,
      fields: fields,
      count: Object.values(suppMap).length,
      tableTitle: "Suppliers",
      summary: summary,
    };
  }

  const usersFields = extractDynamicFields(enrichedUsers, {
    preferredFields: ["name", "email", "role", "isActive"],
    maxFields: 6,
    flattenNested: true,
  });

  const catsFields = extractDynamicFields(Object.values(catMap), {
    preferredFields: ["name", "productCount", "totalValuation"],
    maxFields: 5,
    flattenNested: true,
  });

  const suppsFields = extractDynamicFields(Object.values(suppMap), {
    preferredFields: [
      "name",
      "contactPerson",
      "productCount",
      "totalValuation",
    ],
    maxFields: 5,
    flattenNested: true,
  });

  return {
    target: "overview",
    organizationInfo: {
      name: orgDoc?.name || "Organization",
      contactEmail: orgDoc?.contactEmail || "N/A",
      address: orgDoc?.address || "N/A",
      createdAt: orgDoc?.createdAt,
    },
    summary: summary,
    metrics: {
      totalUsers: totalCount,
      activeUsers: activeUsers,
      categoriesCount: categoriesList.length,
      suppliersCount: suppliersList.length,
      productsCount: productsCount,
      totalRevenue: Math.round(totalOrganizationRevenue * 100) / 100,
    },
    categories: catsFields.data,
    categoriesFields: catsFields.fields,
    suppliers: suppsFields.data,
    suppliersFields: suppsFields.fields,
    users: usersFields.data,
    usersFields: usersFields.fields,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    tableTitle: "Organization Overview",
  };
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
          buildFindFilter(organizationId, { isActive: true, quantity: 0 }),
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
        totalProducts: totalProducts,
        totalStock: allProducts.reduce((sum, p) => sum + p.quantity, 0),
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
        totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
        lowStock: lowStock,
        outOfStock: outOfStock,
        deadStock: deadStockCount,
        invalidProducts: invalidProductsCount,
      };

      const dashboard = {
        inventorySummary: inventorySummary,
        metrics: {
          totalSuppliers: totalSuppliers,
          totalUsers: totalUsers,
          pendingOrders: pendingOrders,
          anomalies: anomaliesCount,
          suggestions: suggestionsCount,
          revenue: Math.round(revenue * 100) / 100,
          costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
          actualProfit: Math.round(actualProfit * 100) / 100,
          grossMargin: Math.round(grossMargin * 100) / 100,
          orders: allInvoices.length,
          categoriesCount: categoriesCount,
        },
        categories: Object.values(categoryStatsMap),
        suppliers: Object.values(supplierStatsMap),
        topSellingProducts: topSellingProducts,
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
        purchases: purchases,
        period: args.period || "this_month",
        dateRange: { startDate, endDate },
        invalidProductsWarning:
          invalidProductsCount > 0
            ? `${invalidProductsCount} products have invalid pricing data`
            : null,
        isEmpty: allProducts.length === 0 && allInvoices.length === 0,
      };

      return { dashboard: dashboard, isDashboard: true };
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
            data: [],
            fields: [],
            count: 0,
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

      const enhancedForecasts = forecasts.map((f) => {
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
          productName: f.productId?.name || "N/A",
          predictedDemand: f.predictedDemand,
          forecastPeriod: f.forecastPeriod,
          daysUntilStockout: daysUntilStockout,
          confidence: f.confidence,
          status:
            daysUntilStockout < 7
              ? "URGENT"
              : daysUntilStockout < 14
                ? "WARNING"
                : "OK",
        };
      });

      const { fields, data } = extractDynamicFields(enhancedForecasts, {
        preferredFields: [
          "productName",
          "predictedDemand",
          "forecastPeriod",
          "daysUntilStockout",
          "status",
        ],
        maxFields: 8,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: totalCount,
        page: pageValue,
        totalPages: totalPages,
        tableTitle: "Demand Forecast",
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

      const enhancedAnomalies = anomalies.map((a) => ({
        productName: a.productId?.name || "N/A",
        type: a.type,
        description: a.description || "N/A",
        severity: getSeverityWithEmoji(a.severity),
        isResolved: a.isResolved ? "Yes" : "No",
        createdAt: a.createdAt,
      }));

      const { fields, data } = extractDynamicFields(enhancedAnomalies, {
        preferredFields: ["productName", "type", "severity", "description"],
        maxFields: 8,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: totalCount,
        page: pageValue,
        totalPages: totalPages,
        tableTitle: "Anomalies",
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

      const enhancedSuggestions = await Promise.all(
        suggestions.map(async (s) => {
          let supplierName = "N/A";
          if (s.productId?.supplierId) {
            const supp = await supplierModel
              .findById(s.productId.supplierId)
              .select("name");
            supplierName = supp?.name || "N/A";
          }
          return {
            productName: s.productId?.name || "N/A",
            suggestedQuantity: s.suggestedQuantity,
            suggestedReorderDate: s.suggestedReorderDate,
            supplierName: supplierName,
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

      const { fields, data } = extractDynamicFields(enhancedSuggestions, {
        preferredFields: [
          "productName",
          "suggestedQuantity",
          "supplierName",
          "urgency",
          "priority",
        ],
        maxFields: 8,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: totalCount,
        page: pageValue,
        totalPages: totalPages,
        tableTitle: "Reorder Suggestions",
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

      const { fields, data } = extractDynamicFields(classification, {
        preferredFields: [
          "name",
          "sku",
          "stock",
          "value",
          "class",
          "cumulativePercentage",
        ],
        maxFields: 8,
        flattenNested: true,
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
        counts: counts,
        values: {
          A: Math.round(values.A * 100) / 100,
          B: Math.round(values.B * 100) / 100,
          C: Math.round(values.C * 100) / 100,
        },
        isEmpty: classification.length === 0,
      };

      return {
        data: data,
        fields: fields,
        count: classification.length,
        tableTitle: "ABC Analysis",
        summary: summary,
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

      const deadStock = await productModel
        .find(deadFilter)
        .populate("categoryId", "name")
        .populate("supplierId", "name")
        .skip(skipValue)
        .limit(limitValue)
        .lean();

      const enhancedDeadStock = deadStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        costPrice: p.costPrice,
        value: Math.round(p.quantity * p.costPrice * 100) / 100,
        category: p.categoryId?.name || "N/A",
        supplier: p.supplierId?.name || "N/A",
        daysWithoutSale: 30,
      }));

      const { fields, data } = extractDynamicFields(enhancedDeadStock, {
        preferredFields: [
          "name",
          "sku",
          "quantity",
          "value",
          "category",
          "supplier",
        ],
        maxFields: 8,
        flattenNested: true,
      });

      const allDeadStockProds = await productModel
        .find(deadFilter)
        .select("quantity costPrice")
        .lean();
      const totalValueAll = allDeadStockProds.reduce(
        (sum, p) => sum + (p.quantity || 0) * (p.costPrice || 0),
        0,
      );

      const startItem = totalCount > 0 ? skipValue + 1 : 0;
      const endItem = Math.min(skipValue + limitValue, totalCount);
      const showingRange =
        totalCount > 0
          ? `showing ${startItem}–${endItem} of ${totalCount}`
          : "showing 0 of 0";

      const summary = {
        count: totalCount,
        totalValue: Math.round(totalValueAll * 100) / 100,
        isEmpty: totalCount === 0,
      };

      return {
        data: data,
        fields: fields,
        count: totalCount,
        page: pageValue,
        totalPages: totalPages,
        pageSize: limitValue,
        showingRange: showingRange,
        tableTitle: "Dead Stock",
        summary: summary,
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

      const enhancedInsights = insights.map((i) => ({
        period: i.period,
        summaryText: i.summaryText || "N/A",
        totalRevenue: i.keyMetrics?.totalRevenue || 0,
        totalOrders: i.keyMetrics?.totalOrders || 0,
        createdAt: i.createdAt,
      }));

      const { fields, data } = extractDynamicFields(enhancedInsights, {
        preferredFields: [
          "period",
          "summaryText",
          "totalRevenue",
          "totalOrders",
          "createdAt",
        ],
        maxFields: 8,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: totalCount,
        page: pageValue,
        totalPages: totalPages,
        tableTitle: "Insights History",
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
          message: `Product "${identifier}" has invalid pricing data.`,
          summary: { isEmpty: true },
        };
      }

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

      const productData = {
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        category: product.categoryId?.name || "N/A",
        supplier: product.supplierId?.name || "N/A",
        status: getStatusWithEmoji(status),
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        profit: profit,
        margin: margin,
        quantity: product.quantity,
        reorderLevel: product.reorderThreshold,
        inventoryValue: product.quantity * product.costPrice,
        forecastPredictedDemand: demandForecast?.predictedDemand || null,
        forecastPeriod: demandForecast?.forecastPeriod || null,
        forecastConfidence: demandForecast?.confidence
          ? Math.round(demandForecast.confidence * 100)
          : null,
        recentStockLogsCount: recentStockLogs.length,
        recentSalesCount: recentSales.length,
        openPurchaseOrdersCount: openPurchaseOrders.length,
      };

      const { fields, data } = extractDynamicFields([productData], {
        preferredFields: [
          "name",
          "sku",
          "category",
          "supplier",
          "status",
          "costPrice",
          "sellingPrice",
          "profit",
          "margin",
          "quantity",
          "inventoryValue",
        ],
        maxFields: 15,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Product Details",
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
          unitPrice: sellingPrice,
          unitCost: unitCost,
          subtotal: itemSubtotal,
          profit: itemProfit,
          margin: itemMargin,
          category: product?.categoryId?.name || "N/A",
          supplier: product?.supplierId?.name || "N/A",
        };
      });

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        status: invoice.status,
        createdAt: invoice.createdAt,
        createdBy: invoice.createdBy?.name || "N/A",
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount || 0,
        total: invoice.total,
        costOfGoodsSold: totalCostOfGoodsSold,
        profit: invoice.total - totalCostOfGoodsSold,
        margin:
          invoice.total > 0
            ? ((invoice.total - totalCostOfGoodsSold) / invoice.total) * 100
            : 0,
        lineItemsCount: lineItems.length,
      };

      const { fields, data } = extractDynamicFields([invoiceData], {
        preferredFields: [
          "invoiceNumber",
          "customerName",
          "status",
          "total",
          "subtotal",
          "profit",
          "margin",
          "createdBy",
          "lineItemsCount",
        ],
        maxFields: 15,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Invoice Details",
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

      if (!po)
        return {
          message: `Purchase Order "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      const lineItems = po.items.map((item) => {
        const prod = item.productId;
        const qty = item.quantity || 0;
        const unitCost = item.unitCost || prod?.costPrice || 0;
        const totalCost = qty * unitCost;
        return {
          productName: prod?.name || "Unknown Product",
          sku: prod?.sku || "N/A",
          quantity: qty,
          unitCost: unitCost,
          totalCost: totalCost,
        };
      });

      const poData = {
        poNumber: po.poNumber,
        supplier: po.supplierId?.name || "N/A",
        supplierContact: po.supplierId?.contactPerson || "N/A",
        status: po.status,
        createdAt: po.createdAt,
        createdBy: po.createdBy?.name || "N/A",
        totalCost: po.totalCost,
        lineItemsCount: lineItems.length,
      };

      const { fields, data } = extractDynamicFields([poData], {
        preferredFields: [
          "poNumber",
          "supplier",
          "status",
          "totalCost",
          "createdBy",
          "lineItemsCount",
        ],
        maxFields: 12,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Purchase Order Details",
        summary: { isEmpty: false },
      };
    }

    case "supplier": {
      const q = isObjectId
        ? { _id: identifier }
        : { name: new RegExp(escapeRegex(identifier), "i") };
      const supplier = await supplierModel
        .findOne({ ...baseQuery, ...q })
        .lean();
      if (!supplier)
        return {
          message: `Supplier "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      const [products, purchaseOrders] = await Promise.all([
        productModel
          .find(
            buildFindFilter(organizationId, {
              supplierId: supplier._id,
              isActive: true,
            }),
          )
          .populate("categoryId", "name")
          .lean(),
        purchaseOrderModel
          .find(buildFindFilter(organizationId, { supplierId: supplier._id }))
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      const validProds = products.filter((p) => isValidProduct(p));
      const totalCostValue = validProds.reduce(
        (sum, p) => sum + p.quantity * p.costPrice,
        0,
      );
      const totalSellingValue = validProds.reduce(
        (sum, p) => sum + p.quantity * p.sellingPrice,
        0,
      );

      const supplierData = {
        name: supplier.name,
        contactPerson: supplier.contactPerson || "N/A",
        email: supplier.email || "N/A",
        phone: supplier.phone || "N/A",
        address: supplier.address || "N/A",
        leadTimeDays: supplier.leadTimeDays ?? "N/A",
        productsCount: validProds.length,
        totalCostValue: totalCostValue,
        totalSellingValue: totalSellingValue,
        purchaseOrdersCount: purchaseOrders.length,
      };

      const { fields, data } = extractDynamicFields([supplierData], {
        preferredFields: [
          "name",
          "contactPerson",
          "email",
          "phone",
          "productsCount",
          "totalCostValue",
          "leadTimeDays",
        ],
        maxFields: 12,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Supplier Details",
        summary: { isEmpty: false },
      };
    }

    case "category": {
      const q = isObjectId
        ? { _id: identifier }
        : { name: new RegExp(escapeRegex(identifier), "i") };
      const category = await categoryModel
        .findOne({ ...baseQuery, ...q })
        .lean();
      if (!category)
        return {
          message: `Category "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      const products = await productModel
        .find(
          buildFindFilter(organizationId, {
            categoryId: category._id,
            isActive: true,
          }),
        )
        .populate("supplierId", "name")
        .lean();

      const validProds = products.filter((p) => isValidProduct(p));
      const totalCostValue = validProds.reduce(
        (sum, p) => sum + p.quantity * p.costPrice,
        0,
      );
      const totalSellingValue = validProds.reduce(
        (sum, p) => sum + p.quantity * p.sellingPrice,
        0,
      );

      const categoryData = {
        name: category.name,
        productsCount: validProds.length,
        totalCostValue: totalCostValue,
        totalSellingValue: totalSellingValue,
      };

      const { fields, data } = extractDynamicFields([categoryData], {
        preferredFields: [
          "name",
          "productsCount",
          "totalCostValue",
          "totalSellingValue",
        ],
        maxFields: 10,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Category Details",
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
      if (!targetUser)
        return {
          message: `User "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      const [invoices, purchaseOrders, stockLogs] = await Promise.all([
        invoiceModel
          .find(buildFindFilter(organizationId, { createdBy: targetUser._id }))
          .lean(),
        purchaseOrderModel
          .find(buildFindFilter(organizationId, { createdBy: targetUser._id }))
          .lean(),
        stockLogModel
          .find(
            buildFindFilter(organizationId, { performedBy: targetUser._id }),
          )
          .lean(),
      ]);

      const revenueGenerated = invoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const userData = {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive ? "Yes" : "No",
        createdAt: targetUser.createdAt,
        invoicesCreated: invoices.length,
        totalRevenueGenerated: revenueGenerated,
        purchaseOrdersCreated: purchaseOrders.length,
        stockLogsCount: stockLogs.length,
      };

      const { fields, data } = extractDynamicFields([userData], {
        preferredFields: [
          "name",
          "email",
          "role",
          "isActive",
          "invoicesCreated",
          "totalRevenueGenerated",
        ],
        maxFields: 10,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "User Details",
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
        org = await organizationModel
          .findOne({ name: new RegExp(escapeRegex(identifier), "i") })
          .lean();
      }

      if (!org)
        return {
          message: `Organization "${identifier}" not found`,
          summary: { isEmpty: true },
        };

      const targetOrgId = org._id;
      const [users, categories, suppliers, productsCount, invoices] =
        await Promise.all([
          userModel
            .find({ organizationId: targetOrgId })
            .select("name email role isActive")
            .lean(),
          categoryModel
            .find({ organizationId: targetOrgId })
            .select("name description")
            .lean(),
          supplierModel
            .find({ organizationId: targetOrgId })
            .select("name contactPerson email phone")
            .lean(),
          productModel.countDocuments({
            organizationId: targetOrgId,
            isActive: true,
          }),
          invoiceModel
            .find({ organizationId: targetOrgId, status: "paid" })
            .select("total")
            .lean(),
        ]);

      const totalRevenue = invoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0,
      );

      const orgData = {
        name: org.name,
        contactEmail: org.contactEmail || "N/A",
        address: org.address || "N/A",
        createdAt: org.createdAt,
        usersCount: users.length,
        categoriesCount: categories.length,
        suppliersCount: suppliers.length,
        productsCount: productsCount,
        totalRevenue: totalRevenue,
        taxRate: org.invoiceSettings?.taxRate || 0,
        defaultDiscount: org.invoiceSettings?.defaultDiscount || 0,
        invoicePrefix: org.invoiceSettings?.invoicePrefix || "INV",
        nextInvoiceNumber: org.invoiceSettings?.nextInvoiceNumber || 1,
      };

      const { fields, data } = extractDynamicFields([orgData], {
        preferredFields: [
          "name",
          "contactEmail",
          "usersCount",
          "productsCount",
          "totalRevenue",
          "taxRate",
          "defaultDiscount",
        ],
        maxFields: 12,
        flattenNested: true,
      });

      return {
        data: data,
        fields: fields,
        count: 1,
        tableTitle: "Organization Details",
        summary: { isEmpty: false },
      };
    }

    default:
      return {
        isUnsupported: true,
        message: `Unsupported entity type: ${type}`,
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
      return createEmptyResult(`No product found with name "${args.product}".`);
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
      return createEmptyResult(
        `No users found with name "${args.creatorName}".`,
      );
    }
  }

  if (args.role && args.role !== "all") {
    const userQuery = buildFindFilter(organizationId, { role: args.role });
    const usersWithRole = await userModel.find(userQuery).select("_id").lean();
    const roleUserIds = usersWithRole.map((u) => u._id);
    if (filter.performedBy) {
      if (filter.performedBy.$in) {
        filter.performedBy.$in = filter.performedBy.$in.filter((id) =>
          roleUserIds.some((rId) => rId.toString() === id.toString()),
        );
      }
    } else {
      filter.performedBy = { $in: roleUserIds };
    }
  }

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    let pipeline = [{ $match: matchFilter }];

    if (args.groupBy === "role") {
      pipeline = pipeline.concat([
        {
          $lookup: {
            from: "users",
            localField: "performedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$userDetails.role", "unknown"] },
            transactionCount: { $sum: 1 },
            totalQuantityIn: {
              $sum: { $cond: [{ $eq: ["$type", "in"] }, "$quantity", 0] },
            },
            totalQuantityOut: {
              $sum: { $cond: [{ $eq: ["$type", "out"] }, "$quantity", 0] },
            },
            totalQuantity: { $sum: "$quantity" },
            usersSet: { $addToSet: "$performedBy" },
          },
        },
        {
          $project: {
            role: "$_id",
            roleDisplay: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", "admin"] }, then: "Admin" },
                  { case: { $eq: ["$_id", "manager"] }, then: "Manager" },
                  { case: { $eq: ["$_id", "staff"] }, then: "Staff" },
                  {
                    case: { $eq: ["$_id", "super_admin"] },
                    then: "Super Admin",
                  },
                ],
                default: "$_id",
              },
            },
            transactionCount: 1,
            totalQuantityIn: 1,
            totalQuantityOut: 1,
            totalQuantity: 1,
            uniqueUsersCount: { $size: "$usersSet" },
          },
        },
        { $sort: { transactionCount: -1 } },
      ]);
    } else if (args.groupBy === "user") {
      pipeline = pipeline.concat([
        {
          $lookup: {
            from: "users",
            localField: "performedBy",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$performedBy",
            userName: { $first: { $ifNull: ["$userDetails.name", "Unknown"] } },
            userRole: { $first: { $ifNull: ["$userDetails.role", "N/A"] } },
            transactionCount: { $sum: 1 },
            totalQuantityIn: {
              $sum: { $cond: [{ $eq: ["$type", "in"] }, "$quantity", 0] },
            },
            totalQuantityOut: {
              $sum: { $cond: [{ $eq: ["$type", "out"] }, "$quantity", 0] },
            },
            totalQuantity: { $sum: "$quantity" },
          },
        },
        { $sort: { transactionCount: -1 } },
      ]);
    } else if (args.groupBy === "type") {
      pipeline = pipeline.concat([
        {
          $group: {
            _id: "$type",
            transactionCount: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
          },
        },
        {
          $project: {
            type: "$_id",
            typeDisplay: {
              $cond: [{ $eq: ["$_id", "in"] }, "📥 In", "📤 Out"],
            },
            transactionCount: 1,
            totalQuantity: 1,
          },
        },
        { $sort: { transactionCount: -1 } },
      ]);
    } else if (args.groupBy === "reason") {
      pipeline = pipeline.concat([
        {
          $group: {
            _id: "$reason",
            transactionCount: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
          },
        },
        {
          $project: {
            reason: "$_id",
            transactionCount: 1,
            totalQuantity: 1,
          },
        },
        { $sort: { transactionCount: -1 } },
      ]);
    }

    const groupedResults = await stockLogModel.aggregate(pipeline);
    const { fields, data } = extractDynamicFields(groupedResults, {
      preferredFields: [
        "roleDisplay",
        "userName",
        "typeDisplay",
        "reason",
        "transactionCount",
        "totalQuantity",
      ],
      maxFields: 8,
      flattenNested: true,
    });

    const totalTransactions = groupedResults.reduce(
      (sum, g) => sum + g.transactionCount,
      0,
    );

    return {
      data: data,
      fields: fields,
      count: groupedResults.length,
      tableTitle: "Transaction Summary",
      summary: {
        totalGroups: groupedResults.length,
        totalTransactions: totalTransactions,
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

  const enhancedLogs = rawLogs.map((l) => ({
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

  const { fields, data } = extractDynamicFields(enhancedLogs, {
    preferredFields: [
      "productName",
      "type",
      "reason",
      "quantity",
      "performedBy",
      "createdAt",
    ],
    maxFields: 10,
    flattenNested: true,
  });

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
  const showingRange =
    totalCount > 0
      ? `showing ${startItem}–${endItem} of ${totalCount}`
      : "showing 0 of 0";

  const summary = {
    totalTransactions: allLogsForStats.length,
    totalIn: totalIn,
    totalOut: totalOut,
    isEmpty: allLogsForStats.length === 0,
  };

  return {
    data: data,
    fields: fields,
    count: totalCount,
    page: pageValue,
    totalPages: totalPages,
    pageSize: limitValue,
    showingRange: showingRange,
    tableTitle: "Stock Transactions",
    summary: summary,
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
    const enhancedArgs = { ...args, _query: args._query || "" };

    switch (toolName) {
      case "query_inventory":
        return await handleInventory(enhancedArgs, organizationId);
      case "query_purchases":
        return await handlePurchases(enhancedArgs, organizationId);
      case "query_sales":
        return await handleSales(enhancedArgs, organizationId);
      case "query_organization":
        return await handleOrganization(enhancedArgs, organizationId);
      case "query_insights":
        return await handleInsights(enhancedArgs, organizationId);
      case "get_details":
        return await handleGetDetails(enhancedArgs, organizationId);
      case "query_transactions":
        return await handleTransactions(enhancedArgs, organizationId);
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
  if (role === "admin" || role === "super_admin") {
    return allTools;
  }
  return [];
};
