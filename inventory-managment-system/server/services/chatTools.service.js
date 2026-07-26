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
import chatLogModel from "../models/chatLog.model.js";

// ============ HELPER FUNCTIONS ============

/**
 * Helper to build database query filters. If organizationId is not present
 * (e.g. for super_admin), the organization filter is omitted.
 */
const buildFilter = (organizationId, baseFilter = {}) => {
  if (organizationId) {
    return { ...baseFilter, organizationId: new mongoose.Types.ObjectId(organizationId) };
  }
  // Convert standard string IDs to ObjectIds in baseFilter if querying globally
  const filter = { ...baseFilter };
  if (filter.organizationId) {
    filter.organizationId = new mongoose.Types.ObjectId(filter.organizationId);
  }
  return filter;
};

/**
 * Helper to build database query filters for Mongoose find queries (no strict conversion to Types.ObjectId required)
 */
const buildFindFilter = (organizationId, baseFilter = {}) => {
  if (organizationId) {
    return { ...baseFilter, organizationId };
  }
  return baseFilter;
};

/**
 * Parse date ranges from various formats
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
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const d = new Date(now.setDate(diff));
        d.setHours(0, 0, 0, 0);
        startDate = d;
        break;
      }
      case "last_week": {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 6);
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
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
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

/**
 * Find category by name
 */
const findCategory = async (organizationId, name) => {
  if (!name) return null;
  return await categoryModel.findOne(
    buildFindFilter(organizationId, { name: new RegExp(name, "i") })
  );
};

/**
 * Find supplier by name
 */
const findSupplier = async (organizationId, name) => {
  if (!name) return null;
  return await supplierModel.findOne(
    buildFindFilter(organizationId, { name: new RegExp(name, "i") })
  );
};

/**
 * Find user IDs matching a name (for staff/creator filtering)
 */
const findUserIdsByName = async (organizationId, name) => {
  if (!name) return [];
  const query = { name: new RegExp(name, "i") };
  if (organizationId) {
    query.organizationId = organizationId;
  }
  const users = await userModel.find(query).select("_id");
  return users.map(u => u._id);
};

/**
 * Safe string to ObjectId conversion helper for aggregates
 */
const toObjectId = (id) => {
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

// ============ 1. INVENTORY TOOL ============

const handleInventory = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId, { isActive: true });

  // 1. Resolve Filters
  if (args.search) {
    filter.$or = [
      { name: new RegExp(args.search, "i") },
      { sku: new RegExp(args.search, "i") },
    ];
  }

  if (args.category) {
    const cat = await findCategory(organizationId, args.category);
    if (cat) filter.categoryId = cat._id;
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) filter.supplierId = supp._id;
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
        { $divide: [{ $subtract: ["$sellingPrice", "$costPrice"] }, "$sellingPrice"] },
        0
      ]
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
      return { products: [], count: 0, summary: { totalProducts: 0, totalStock: 0, totalInventoryValue: 0, totalPotentialRevenue: 0, totalPotentialProfit: 0, averageCost: 0, averageSellingPrice: 0, highestPrice: 0, lowestPrice: 0, lowStockCount: 0, outOfStockCount: 0, deadStockCount: 0, topProfitProducts: [], lowestProfitProducts: [], negativeMarginProducts: [] } };
    }
  }

  // 2. Handle Stock Status (incorporating Dead Stock query)
  let activeProductIds = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeSales = await invoiceModel.find(buildFindFilter(organizationId, {
    status: "paid",
    createdAt: { $gte: thirtyDaysAgo }
  })).select("products.productId");

  const idSet = new Set();
  for (const sale of activeSales) {
    for (const p of sale.products) {
      if (p.productId) idSet.add(p.productId.toString());
    }
  }
  activeProductIds = Array.from(idSet);

  if (args.stockStatus) {
    switch (args.stockStatus) {
      case "low_stock":
        filter.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
        break;
      case "out_of_stock":
        filter.quantity = 0;
        break;
      case "in_stock":
        filter.quantity = { $gt: 0 };
        break;
      case "dead_stock":
        filter.quantity = { $gt: 0 };
        filter._id = { $nin: activeProductIds };
        break;
    }
  }

  // 3. Handle GroupBy Aggregations
  if (args.groupBy) {
    let groupField = "";
    let lookupStage = null;
    let projectStage = null;

    if (args.groupBy === "category") {
      groupField = "$categoryId";
      lookupStage = {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "details"
        }
      };
      projectStage = {
        $project: {
          categoryName: { $arrayElemAt: ["$details.name", 0] },
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        }
      };
    } else if (args.groupBy === "supplier") {
      groupField = "$supplierId";
      lookupStage = {
        $lookup: {
          from: "suppliers",
          localField: "_id",
          foreignField: "_id",
          as: "details"
        }
      };
      projectStage = {
        $project: {
          supplierName: { $arrayElemAt: ["$details.name", 0] },
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        }
      };
    } else if (args.groupBy === "status") {
      groupField = {
        $cond: [
          { $eq: ["$quantity", 0] },
          "out_of_stock",
          { $cond: [{ $lte: ["$quantity", "$reorderThreshold"] }, "low_stock", "in_stock"] }
        ]
      };
      projectStage = {
        $project: {
          status: "$_id",
          productCount: 1,
          totalStock: 1,
          totalCostValue: 1,
          totalSellingValue: 1,
          totalPotentialProfit: 1,
          averageMargin: 1,
        }
      };
    }

    const matchFilter = buildFilter(organizationId, filter);

    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: groupField,
          productCount: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
          totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          totalSellingValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
          totalPotentialProfit: {
            $sum: { $multiply: ["$quantity", { $subtract: ["$sellingPrice", "$costPrice"] }] }
          },
          averageMargin: {
            $avg: {
              $cond: [
                { $gt: ["$sellingPrice", 0] },
                { $divide: [{ $subtract: ["$sellingPrice", "$costPrice"] }, "$sellingPrice"] },
                0
              ]
            }
          }
        }
      }
    ];

    if (lookupStage) pipeline.push(lookupStage);
    if (projectStage) pipeline.push(projectStage);

    const groupedResults = await productModel.aggregate(pipeline);
    return { groupedResults, count: groupedResults.length };
  }

  // 4. Regular Query with Full Summaries & Calculations
  const limitValue = Math.min(args.limit || 20, 100);
  const pageValue = Math.max(args.page || 1, 1);
  const skipValue = (pageValue - 1) * limitValue;

  const rawProducts = await productModel
    .find(filter)
    .populate("categoryId", "name")
    .populate("supplierId", "name contactPerson")
    .lean();

  const products = rawProducts.map((p) => {
    const profit = p.sellingPrice - p.costPrice;
    const margin = p.sellingPrice > 0 ? profit / p.sellingPrice : 0;
    const inventoryValue = p.quantity * p.costPrice;
    const potentialRevenue = p.quantity * p.sellingPrice;
    const potentialProfit = p.quantity * profit;
    const status = p.quantity === 0 ? "out_of_stock" : (p.quantity <= p.reorderThreshold ? "low_stock" : "in_stock");

    return {
      _id: p._id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 10000) / 100, // percentage
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      potentialRevenue: Math.round(potentialRevenue * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      unit: p.unit,
      category: p.categoryId?.name || "N/A",
      supplier: p.supplierId?.name || "N/A",
      reorderLevel: p.reorderThreshold,
      status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  // ABC Analysis calculations across the queried set
  let totalStock = 0;
  let totalInventoryValue = 0;
  let totalPotentialRevenue = 0;
  let totalPotentialProfit = 0;
  let maxPrice = 0;
  let minPrice = products[0]?.sellingPrice || 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let deadStockCount = 0;
  const productMargins = [];
  const negativeMarginProducts = [];

  for (const p of products) {
    totalStock += p.quantity;
    totalInventoryValue += p.inventoryValue;
    totalPotentialRevenue += p.potentialRevenue;
    totalPotentialProfit += p.potentialProfit;

    if (p.sellingPrice > maxPrice) maxPrice = p.sellingPrice;
    if (p.sellingPrice < minPrice) minPrice = p.sellingPrice;
    if (p.quantity === 0) outOfStockCount++;
    else if (p.quantity <= p.reorderLevel) lowStockCount++;

    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) {
      deadStockCount++;
    }

    productMargins.push({
      name: p.name,
      sku: p.sku,
      profit: p.profit,
      margin: p.margin,
      potentialProfit: p.potentialProfit
    });

    if (p.profit < 0) {
      negativeMarginProducts.push({
        name: p.name,
        sku: p.sku,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        profit: p.profit,
        margin: p.margin
      });
    }
  }

  // Assign ABC classifications in memory
  const sortedForAbc = [...products].sort((a, b) => b.inventoryValue - a.inventoryValue);
  let cumulativeValue = 0;
  const abcMap = {};
  for (const item of sortedForAbc) {
    cumulativeValue += item.inventoryValue;
    const percentage = totalInventoryValue > 0 ? cumulativeValue / totalInventoryValue : 0;
    if (percentage <= 0.70) abcMap[item._id.toString()] = "A";
    else if (percentage <= 0.90) abcMap[item._id.toString()] = "B";
    else abcMap[item._id.toString()] = "C";
  }

  const enrichedProducts = products.map(p => ({
    ...p,
    abcClassification: abcMap[p._id.toString()] || "C"
  }));

  // Sort in memory
  if (args.sortBy) {
    const sortField = args.sortBy;
    const isDesc = args.sortOrder === "desc";
    enrichedProducts.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? (valB - valA) : (valA - valB);
    });
  } else {
    enrichedProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const topProfitProducts = [...productMargins].sort((a, b) => b.potentialProfit - a.potentialProfit).slice(0, 5);
  const lowestProfitProducts = [...productMargins].sort((a, b) => a.potentialProfit - b.potentialProfit).slice(0, 5);

  const summary = {
    totalProducts: enrichedProducts.length,
    totalStock,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
    totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
    averageCost: enrichedProducts.length > 0
      ? Math.round((enrichedProducts.reduce((sum, p) => sum + p.costPrice, 0) / enrichedProducts.length) * 100) / 100
      : 0,
    averageSellingPrice: enrichedProducts.length > 0
      ? Math.round((enrichedProducts.reduce((sum, p) => sum + p.sellingPrice, 0) / enrichedProducts.length) * 100) / 100
      : 0,
    highestPrice: Math.round(maxPrice * 100) / 100,
    lowestPrice: Math.round(minPrice * 100) / 100,
    lowStockCount,
    outOfStockCount,
    deadStockCount,
    topProfitProducts,
    lowestProfitProducts,
    negativeMarginProducts
  };

  const paginated = enrichedProducts.slice(skipValue, skipValue + limitValue);
  return { products: paginated, count: enrichedProducts.length, summary };
};

// ============ 2. PURCHASE TOOL ============

const handlePurchases = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  // Predefined or manual date period
  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  if (args.supplier) {
    const supp = await findSupplier(organizationId, args.supplier);
    if (supp) filter.supplierId = supp._id;
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
    filter.poNumber = new RegExp(args.search, "i");
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.createdBy = { $in: userIds };
    } else {
      return { orders: [], count: 0, summary: { totalOrders: 0, totalCost: 0, averageOrderCost: 0, statusCounts: { pending: 0, approved: 0, rejected: 0, fulfilled: 0 }, vendorPerformance: [] } };
    }
  }

  // Handle Grouping for purchases
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
        }
      }
    ];

    if (args.groupBy === "supplier") {
      pipeline.push(
        {
          $lookup: {
            from: "suppliers",
            localField: "_id",
            foreignField: "_id",
            as: "supplierDetails"
          }
        },
        {
          $project: {
            supplierName: { $arrayElemAt: ["$supplierDetails.name", 0] },
            orderCount: 1,
            totalSpent: 1,
            averageSpent: 1,
          }
        }
      );
    } else {
      pipeline.push({
        $project: {
          status: "$_id",
          orderCount: 1,
          totalSpent: 1,
          averageSpent: 1,
        }
      });
    }

    const groupedResults = await purchaseOrderModel.aggregate(pipeline);
    return { groupedResults, count: groupedResults.length };
  }

  const limitValue = Math.min(args.limit || 20, 100);
  const rawOrders = await purchaseOrderModel
    .find(filter)
    .populate("supplierId", "name contactPerson email leadTimeDays")
    .populate("createdBy", "name")
    .lean();

  const orders = rawOrders.map(o => ({
    _id: o._id,
    poNumber: o.poNumber,
    supplier: o.supplierId?.name || "N/A",
    itemsCount: o.items.length,
    totalCost: Math.round(o.totalCost * 100) / 100,
    status: o.status,
    createdBy: o.createdBy?.name || "N/A",
    leadTimeDays: o.supplierId?.leadTimeDays !== undefined ? o.supplierId.leadTimeDays : "N/A",
    createdAt: o.createdAt,
  }));

  // Sort in memory (specifically for populated lead time fields)
  if (args.sortBy) {
    const sortField = args.sortBy === "date" ? "createdAt" : (args.sortBy === "leadTime" ? "leadTimeDays" : args.sortBy);
    const isDesc = args.sortOrder === "desc";
    orders.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === "N/A") return 1;
      if (valB === "N/A") return -1;

      if (sortField === "createdAt") {
        return isDesc ? new Date(valB) - new Date(valA) : new Date(valA) - new Date(valB);
      }
      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? (valB - valA) : (valA - valB);
    });
  } else {
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Summary statistics
  const allOrdersForStats = await purchaseOrderModel.find(filter).select("totalCost status").lean();
  const totalCost = allOrdersForStats.reduce((sum, o) => sum + (o.totalCost || 0), 0);

  const statusCounts = { pending: 0, approved: 0, rejected: 0, fulfilled: 0 };
  for (const o of allOrdersForStats) {
    if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
  }

  // Vendor lead time analysis
  const supplierAggregate = await purchaseOrderModel.aggregate([
    { $match: buildFilter(organizationId, filter) },
    {
      $group: {
        _id: "$supplierId",
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalCost" },
      }
    },
    {
      $lookup: {
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplierDetails"
      }
    },
    {
      $project: {
        supplierName: { $arrayElemAt: ["$supplierDetails.name", 0] },
        leadTimeDays: { $arrayElemAt: ["$supplierDetails.leadTimeDays", 0] },
        totalOrders: 1,
        totalSpent: 1,
      }
    }
  ]);

  const vendorPerformance = supplierAggregate.map(s => ({
    supplierName: s.supplierName || "Unknown",
    totalOrders: s.totalOrders,
    totalSpent: Math.round(s.totalSpent * 100) / 100,
    averageLeadTime: s.leadTimeDays || "N/A"
  }));

  const summary = {
    totalOrders: allOrdersForStats.length,
    totalCost: Math.round(totalCost * 100) / 100,
    averageOrderCost: allOrdersForStats.length > 0 ? Math.round((totalCost / allOrdersForStats.length) * 100) / 100 : 0,
    statusCounts,
    vendorPerformance
  };

  const paginatedOrders = orders.slice(0, limitValue);
  return { orders: paginatedOrders, count: orders.length, summary };
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
    filter.customerName = new RegExp(args.customer, "i");
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
    filter.$or = [
      { invoiceNumber: new RegExp(args.search, "i") },
      { customerName: new RegExp(args.search, "i") }
    ];
  }

  if (args.creatorName) {
    const userIds = await findUserIdsByName(organizationId, args.creatorName);
    if (userIds.length > 0) {
      filter.createdBy = { $in: userIds };
    } else {
      return { invoices: [], count: 0, summary: { totalSales: 0, totalInvoices: 0, averageInvoiceValue: 0, statusCounts: { paid: 0, unpaid: 0, void: 0 }, customerMetrics: [] } };
    }
  }

  // Handle sales groupings (daily/monthly/customer/status)
  if (args.groupBy) {
    const matchFilter = buildFilter(organizationId, filter);
    let groupField = "";

    if (args.groupBy === "customer") {
      groupField = "$customerName";
    } else if (args.groupBy === "status") {
      groupField = "$status";
    } else if (args.groupBy === "daily") {
      groupField = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
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
          averageRevenue: { $avg: "$total" }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const groupedResults = await invoiceModel.aggregate(pipeline);
    return { groupedResults, count: groupedResults.length };
  }

  const limitValue = Math.min(args.limit || 20, 100);
  const rawInvoices = await invoiceModel
    .find(filter)
    .populate("createdBy", "name")
    .populate("products.productId", "name sku costPrice sellingPrice")
    .lean();

  const invoices = rawInvoices.map(inv => {
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
      createdAt: inv.createdAt
    };
  });

  // Sort in memory
  if (args.sortBy) {
    const sortField = args.sortBy === "date" ? "createdAt" : args.sortBy;
    const isDesc = args.sortOrder === "desc";
    invoices.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "createdAt") {
        return isDesc ? new Date(valB) - new Date(valA) : new Date(valA) - new Date(valB);
      }
      if (typeof valA === "string") {
        return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return isDesc ? (valB - valA) : (valA - valB);
    });
  } else {
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Fetch summaries
  const allSalesForStats = await invoiceModel
    .find(filter)
    .populate("products.productId", "costPrice")
    .lean();

  let totalSales = 0;
  let totalCostOfSales = 0;
  const statusCounts = { paid: 0, unpaid: 0, void: 0 };
  for (const inv of allSalesForStats) {
    if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
    if (inv.status === "paid") {
      totalSales += (inv.total || 0);
      for (const item of inv.products) {
        const itemCost = item.productId?.costPrice || 0;
        totalCostOfSales += item.quantity * itemCost;
      }
    }
  }

  const totalProfit = totalSales - totalCostOfSales;
  const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Customer spend aggregates
  const customerAggregate = await invoiceModel.aggregate([
    { $match: buildFilter(organizationId, filter) },
    {
      $group: {
        _id: "$customerName",
        orderCount: { $sum: 1 },
        totalSpent: { $sum: "$total" }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  const customerMetrics = customerAggregate.map(c => ({
    customerName: c._id,
    orderCount: c.orderCount,
    totalSpent: Math.round(c.totalSpent * 100) / 100,
    averageSpent: c.orderCount > 0 ? Math.round((c.totalSpent / c.orderCount) * 100) / 100 : 0
  }));

  const summary = {
    totalSales: Math.round(totalSales * 100) / 100,
    totalCostOfSales: Math.round(totalCostOfSales * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
    totalInvoices: allSalesForStats.length,
    averageInvoiceValue: allSalesForStats.length > 0 ? Math.round((totalSales / allSalesForStats.length) * 100) / 100 : 0,
    statusCounts,
    customerMetrics
  };

  const paginatedInvoices = invoices.slice(0, limitValue);
  return { invoices: paginatedInvoices, count: invoices.length, summary };
};

// ============ 4. ORGANIZATION TOOL ============

const handleOrganization = async (args, organizationId) => {
  let searchFilter = {};

  // Enforce Tenant Boundaries
  if (organizationId) {
    // Org Admin: fetch users only belonging to their own organization
    const filter = { organizationId };
    if (args.search) {
      filter.$or = [
        { name: new RegExp(args.search, "i") },
        { email: new RegExp(args.search, "i") }
      ];
    }
    if (args.role && args.role !== "all") {
      filter.role = args.role;
    }
    if (args.isActive !== undefined) {
      filter.isActive = args.isActive;
    }

    const limitValue = Math.min(args.limit || 50, 100);
    const users = await userModel
      .find(filter)
      .select("-password -tokenVersion -__v")
      .sort(args.sortBy ? { [args.sortBy]: args.sortOrder === "desc" ? -1 : 1 } : { createdAt: -1 })
      .limit(limitValue)
      .lean();

    const activeUsers = await userModel.countDocuments({ ...filter, isActive: true });
    const stats = await userModel.aggregate([
      { $match: buildFilter(organizationId, filter) },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const roleBreakdown = { admin: 0, manager: 0, staff: 0 };
    for (const r of stats) {
      if (roleBreakdown[r._id] !== undefined) roleBreakdown[r._id] = r.count;
    }

    const summary = {
      totalUsers: users.length,
      activeUsers,
      roleBreakdown
    };

    return { users, count: users.length, summary };
  } else {
    // Super Admin: platform-wide queries across organizations and users
    if (args.search) {
      searchFilter = { name: new RegExp(args.search, "i") };
    }

    const limitValue = Math.min(args.limit || 20, 100);
    const organizationsList = await organizationModel.find(searchFilter).limit(limitValue).lean();
    const organizations = await Promise.all(organizationsList.map(async (org) => {
      const usersCount = await userModel.countDocuments({ organizationId: org._id });
      const productsCount = await productModel.countDocuments({ organizationId: org._id });
      const salesValueResult = await invoiceModel.aggregate([
        { $match: { organizationId: org._id, status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]);
      const salesValue = salesValueResult[0]?.total || 0;

      return {
        _id: org._id,
        name: org.name,
        contactEmail: org.contactEmail,
        status: org.status,
        usersCount,
        productsCount,
        salesValue: Math.round(salesValue * 100) / 100,
        createdAt: org.createdAt
      };
    }));

    const totalOrgs = await organizationModel.countDocuments();
    const totalUsers = await userModel.countDocuments();
    const activeUsers = await userModel.countDocuments({ isActive: true });

    const summary = {
      totalOrganizations: totalOrgs,
      totalUsers,
      activeUsers
    };

    return { organizations, count: organizations.length, summary };
  }
};

// ============ 5. INSIGHT TOOL ============

const handleInsights = async (args, organizationId) => {
  const type = args.type || "dashboard";

  switch (type) {
    case "dashboard": {
      // Return dashboard KPIs
      const { startDate, endDate } = parseDateRange({ period: args.period || "this_month" });

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
        productModel.countDocuments(buildFindFilter(organizationId, { isActive: true })),
        productModel.countDocuments(buildFindFilter(organizationId, {
          isActive: true,
          $expr: { $lte: ["$quantity", "$reorderThreshold"] },
        })),
        productModel.countDocuments(buildFindFilter(organizationId, {
          isActive: true,
          quantity: 0,
        })),
        supplierModel.countDocuments(buildFindFilter(organizationId)),
        userModel.countDocuments(buildFindFilter(organizationId, { isActive: true })),
        purchaseOrderModel.countDocuments(buildFindFilter(organizationId, { status: "pending" })),
        anomalyModel.countDocuments(buildFindFilter(organizationId, { isResolved: false })),
        reorderSuggestionModel.countDocuments(buildFindFilter(organizationId, { status: "pending" })),

        productModel.find(buildFindFilter(organizationId, { isActive: true })).populate("categoryId", "name").populate("supplierId", "name").lean(),
        invoiceModel.find(buildFindFilter(organizationId, { status: "paid" })).populate("products.productId", "name sku costPrice").lean(),
        categoryModel.countDocuments(buildFindFilter(organizationId)),
        categoryModel.find(buildFindFilter(organizationId)).lean(),
        userModel.find(buildFindFilter(organizationId)).select("name email role isActive").lean(),
        stockLogModel.find(buildFindFilter(organizationId)).populate("productId", "name sku").populate("performedBy", "name").sort({ createdAt: -1 }).limit(5).lean(),
        purchaseOrderModel.aggregate([
          { $match: buildFilter(organizationId) },
          { $group: { _id: "$status", count: { $sum: 1 }, totalCost: { $sum: "$totalCost" } } }
        ])
      ]);

      // Calculate valuation, potential profit/revenue
      let totalInventoryValue = 0;
      let totalPotentialRevenue = 0;
      let totalPotentialProfit = 0;
      const categoryStatsMap = {};
      const supplierStatsMap = {};

      for (const p of allProducts) {
        const costVal = p.quantity * p.costPrice;
        const sellVal = p.quantity * p.sellingPrice;
        const potentialProf = sellVal - costVal;

        totalInventoryValue += costVal;
        totalPotentialRevenue += sellVal;
        totalPotentialProfit += potentialProf;

        const catId = p.categoryId?._id?.toString() || "N/A";
        const catName = p.categoryId?.name || "N/A";
        if (!categoryStatsMap[catId]) {
          categoryStatsMap[catId] = { name: catName, productCount: 0, totalStock: 0, valuation: 0 };
        }
        categoryStatsMap[catId].productCount++;
        categoryStatsMap[catId].totalStock += p.quantity;
        categoryStatsMap[catId].valuation += costVal;

        const suppId = p.supplierId?._id?.toString() || "N/A";
        const suppName = p.supplierId?.name || "N/A";
        if (!supplierStatsMap[suppId]) {
          supplierStatsMap[suppId] = { name: suppName, productCount: 0, totalStock: 0, valuation: 0 };
        }
        supplierStatsMap[suppId].productCount++;
        supplierStatsMap[suppId].totalStock += p.quantity;
        supplierStatsMap[suppId].valuation += costVal;
      }

      // Calculate actual revenue and profit metrics
      let revenue = 0;
      let costOfGoodsSold = 0;
      const salesMap = {};

      for (const inv of allInvoices) {
        revenue += inv.total;
        for (const item of inv.products) {
          const cost = item.productId?.costPrice || 0;
          costOfGoodsSold += item.quantity * cost;

          if (item.productId) {
            const pid = item.productId._id?.toString() || item.productId.toString();
            const pName = item.productId.name || "Unknown Product";
            if (!salesMap[pid]) {
              salesMap[pid] = { name: pName, quantitySold: 0, revenue: 0 };
            }
            salesMap[pid].quantitySold += item.quantity;
            salesMap[pid].revenue += item.subtotal;
          }
        }
      }

      const actualProfit = revenue - costOfGoodsSold;
      const grossMargin = revenue > 0 ? (actualProfit / revenue) * 100 : 0;
      const topSellingProducts = Object.values(salesMap).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

      // Purchases status breakdown
      const purchases = {
        pendingCount: 0, pendingCost: 0,
        approvedCount: 0, approvedCost: 0,
        fulfilledCount: 0, fulfilledCost: 0,
        rejectedCount: 0, rejectedCost: 0,
        totalCost: 0, totalCount: 0
      };
      for (const po of purchaseOrdersSummary) {
        const status = po._id;
        const count = po.count;
        const cost = po.totalCost;
        purchases.totalCount += count;
        purchases.totalCost += cost;
        if (status === "pending") { purchases.pendingCount = count; purchases.pendingCost = cost; }
        else if (status === "approved") { purchases.approvedCount = count; purchases.approvedCost = cost; }
        else if (status === "fulfilled") { purchases.fulfilledCount = count; purchases.fulfilledCost = cost; }
        else if (status === "rejected") { purchases.rejectedCount = count; purchases.rejectedCost = cost; }
      }

      const dashboard = {
        metrics: {
          totalProducts,
          lowStock,
          outOfStock,
          totalSuppliers,
          totalUsers,
          pendingOrders,
          anomalies: anomaliesCount,
          suggestions: suggestionsCount,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
          totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
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
        recentActivity: recentLogs.map(l => ({
          productName: l.productId?.name || "N/A",
          sku: l.productId?.sku || "N/A",
          type: l.type,
          reason: l.reason,
          quantity: l.quantity,
          performedBy: l.performedBy?.name || "N/A",
          createdAt: l.createdAt
        })),
        purchases,
        period: args.period || "this_month",
        dateRange: { startDate, endDate }
      };

      return { dashboard };
    }

    case "forecast": {
      const filter = buildFindFilter(organizationId);
      if (args.product) {
        const prod = await productModel.findOne(buildFindFilter(organizationId, {
          $or: [{ name: new RegExp(args.product, "i") }, { sku: args.product }]
        }));
        if (prod) filter.productId = prod._id;
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const forecasts = await demandForecastModel
        .find(filter)
        .populate("productId", "name sku quantity sellingPrice")
        .sort({ createdAt: -1 })
        .limit(limitValue)
        .lean();

      const enrichedForecasts = forecasts.map(f => {
        const days = f.forecastPeriod === "7_days" ? 7 : (f.forecastPeriod === "30_days" ? 30 : 90);
        const dailyDemand = f.predictedDemand / days;
        const qty = f.productId?.quantity || 0;
        const daysUntilStockout = dailyDemand > 0 ? Math.max(0, Math.floor(qty / dailyDemand)) : 9999;

        return {
          ...f,
          daysUntilStockout,
          status: daysUntilStockout < 7 ? "URGENT" : (daysUntilStockout < 14 ? "WARNING" : "OK")
        };
      });

      return { forecast: enrichedForecasts, count: enrichedForecasts.length };
    }

    case "anomalies": {
      const filter = buildFindFilter(organizationId, { isResolved: false });
      if (args.severity) filter.severity = args.severity;
      if (args.product) {
        const prod = await productModel.findOne(buildFindFilter(organizationId, { name: new RegExp(args.product, "i") }));
        if (prod) filter.productId = prod._id;
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const anomalies = await anomalyModel
        .find(filter)
        .populate("productId", "name sku quantity")
        .sort({ severity: 1, createdAt: -1 })
        .limit(limitValue)
        .lean();

      return { anomalies, count: anomalies.length };
    }

    case "suggestions": {
      const filter = buildFindFilter(organizationId, { status: "pending" });
      if (args.product) {
        const prod = await productModel.findOne(buildFindFilter(organizationId, { name: new RegExp(args.product, "i") }));
        if (prod) filter.productId = prod._id;
      }

      const limitValue = Math.min(args.limit || 20, 100);
      const suggestions = await reorderSuggestionModel
        .find(filter)
        .populate("productId", "name sku quantity reorderThreshold supplierId")
        .sort({ suggestedReorderDate: 1 })
        .limit(limitValue)
        .lean();

      const enrichedSuggestions = await Promise.all(suggestions.map(async (s) => {
        let supplierName = "N/A";
        if (s.productId?.supplierId) {
          const supp = await supplierModel.findById(s.productId.supplierId).select("name");
          supplierName = supp?.name || "N/A";
        }
        return {
          ...s,
          supplierName,
          urgency: new Date(s.suggestedReorderDate) <= new Date() ? "URGENT" : "NORMAL"
        };
      }));

      return { suggestions: enrichedSuggestions, count: enrichedSuggestions.length };
    }

    case "abc_analysis": {
      const products = await productModel.find(buildFindFilter(organizationId, { isActive: true })).select("name sku quantity costPrice").lean();
      const sorted = products.map(p => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        stock: p.quantity,
        cost: p.costPrice,
        value: p.quantity * p.costPrice
      })).sort((a, b) => b.value - a.value);

      const totalVal = sorted.reduce((sum, p) => sum + p.value, 0);
      let cumulativeVal = 0;

      const classification = sorted.map(p => {
        cumulativeVal += p.value;
        const pct = totalVal > 0 ? cumulativeVal / totalVal : 0;
        let cls = "C";
        if (pct <= 0.70) cls = "A";
        else if (pct <= 0.90) cls = "B";
        return { ...p, cumulativePercentage: Math.round(pct * 10000) / 100, class: cls };
      });

      const counts = { A: 0, B: 0, C: 0 };
      const values = { A: 0, B: 0, C: 0 };
      for (const p of classification) {
        counts[p.class]++;
        values[p.class] += p.value;
      }

      const summary = {
        totalValue: Math.round(totalVal * 100) / 100,
        counts,
        values: {
          A: Math.round(values.A * 100) / 100,
          B: Math.round(values.B * 100) / 100,
          C: Math.round(values.C * 100) / 100,
        }
      };

      return { abcAnalysis: classification, summary };
    }

    case "dead_stock": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeSales = await invoiceModel.find(buildFindFilter(organizationId, {
        status: "paid",
        createdAt: { $gte: thirtyDaysAgo }
      })).select("products.productId");

      const soldProductIds = new Set();
      for (const sale of activeSales) {
        for (const p of sale.products) {
          if (p.productId) soldProductIds.add(p.productId.toString());
        }
      }

      const deadFilter = buildFindFilter(organizationId, {
        isActive: true,
        quantity: { $gt: 0 },
        _id: { $nin: Array.from(soldProductIds) }
      });

      const limitValue = Math.min(args.limit || 20, 100);
      const deadStock = await productModel
        .find(deadFilter)
        .populate("categoryId", "name")
        .populate("supplierId", "name")
        .limit(limitValue)
        .lean();

      const formatted = deadStock.map(p => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        costPrice: p.costPrice,
        value: Math.round(p.quantity * p.costPrice * 100) / 100,
        category: p.categoryId?.name || "N/A",
        supplier: p.supplierId?.name || "N/A",
        createdAt: p.createdAt
      }));

      const summary = {
        count: formatted.length,
        totalValue: Math.round(formatted.reduce((sum, p) => sum + p.value, 0) * 100) / 100
      };

      return { deadStock: formatted, summary };
    }

    case "insights_history": {
      const filter = buildFindFilter(organizationId);
      if (args.period) filter.period = args.period;

      const limitValue = Math.min(args.limit || 10, 50);
      const insights = await aiInsightsModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limitValue)
        .lean();

      return { insights, count: insights.length };
    }
  }
};

// ============ 6. LOOKUP TOOL ============

const handleGetDetails = async (args, organizationId) => {
  const { type, identifier } = args;

  if (!type || !identifier) {
    return { error: true, message: "Type and Identifier are required parameters." };
  }

  const baseQuery = buildFindFilter(organizationId);
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

  switch (type) {
    case "product": {
      const q = isObjectId
        ? { _id: identifier }
        : { $or: [{ sku: identifier }, { name: new RegExp(identifier, "i") }] };

      const product = await productModel.findOne({ ...baseQuery, ...q, isActive: true })
        .populate("categoryId", "name")
        .populate("supplierId", "name contactPerson email phone leadTimeDays")
        .lean();

      if (!product) return { message: `Product "${identifier}" not found` };

      const value = product.quantity * product.costPrice;
      const profit = product.sellingPrice - product.costPrice;
      const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

      const [
        recentStockLogs,
        recentSales,
        openPurchaseOrders,
        demandForecast
      ] = await Promise.all([
        stockLogModel.find(buildFindFilter(organizationId, { productId: product._id })).sort({ createdAt: -1 }).limit(5).lean(),
        invoiceModel.find(buildFindFilter(organizationId, { "products.productId": product._id, status: "paid" })).sort({ createdAt: -1 }).limit(5).lean(),
        purchaseOrderModel.find(buildFindFilter(organizationId, { "items.productId": product._id, status: "pending" })).sort({ createdAt: -1 }).lean(),
        demandForecastModel.findOne(buildFindFilter(organizationId, { productId: product._id })).sort({ createdAt: -1 }).lean()
      ]);

      return {
        product: {
          general: {
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            category: product.categoryId?.name || "N/A",
            supplier: product.supplierId?.name || "N/A",
            status: product.quantity === 0 ? "OUT_OF_STOCK" : (product.quantity <= product.reorderThreshold ? "LOW_STOCK" : "IN_STOCK")
          },
          pricing: {
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            profit: Math.round(profit * 100) / 100,
            margin: Math.round(margin * 100) / 100,
          },
          inventory: {
            quantity: product.quantity,
            reorderLevel: product.reorderThreshold,
            value: Math.round(value * 100) / 100,
          },
          forecast: demandForecast ? {
            predictedDemand: demandForecast.predictedDemand,
            period: demandForecast.forecastPeriod,
            confidence: demandForecast.confidence,
          } : null,
          recentStockLogs: recentStockLogs.map(l => ({
            quantity: l.quantity,
            reason: l.reason,
            createdAt: l.createdAt
          })),
          recentSales: recentSales.map(s => ({
            invoiceNumber: s.invoiceNumber,
            total: s.total,
            createdAt: s.createdAt
          })),
          openPurchaseOrders: openPurchaseOrders.map(po => ({
            poNumber: po.poNumber,
            status: po.status,
            createdAt: po.createdAt
          }))
        }
      };
    }

    case "supplier": {
      const q = isObjectId ? { _id: identifier } : { name: new RegExp(identifier, "i") };
      const supplier = await supplierModel.findOne({ ...baseQuery, ...q }).lean();
      if (!supplier) return { message: `Supplier "${identifier}" not found` };

      const [products, recentPOs] = await Promise.all([
        productModel.find(buildFindFilter(organizationId, { supplierId: supplier._id, isActive: true })).select("name sku quantity costPrice sellingPrice").limit(10).lean(),
        purchaseOrderModel.find(buildFindFilter(organizationId, { supplierId: supplier._id })).sort({ createdAt: -1 }).limit(5).lean()
      ]);

      const formattedProducts = products.map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.quantity,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        profit: Math.round((p.sellingPrice - p.costPrice) * 100) / 100,
        margin: p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 10000) / 100 : 0
      }));

      return {
        supplier: {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          leadTimeDays: supplier.leadTimeDays,
          productsCount: formattedProducts.length,
          suppliedProducts: formattedProducts,
          recentPurchaseOrders: recentPOs.map(po => ({
            poNumber: po.poNumber,
            totalCost: po.totalCost,
            status: po.status,
            createdAt: po.createdAt
          }))
        }
      };
    }

    case "category": {
      const q = isObjectId ? { _id: identifier } : { name: new RegExp(identifier, "i") };
      const category = await categoryModel.findOne({ ...baseQuery, ...q }).lean();
      if (!category) return { message: `Category "${identifier}" not found` };

      const products = await productModel.find(buildFindFilter(organizationId, { categoryId: category._id, isActive: true })).select("name sku quantity costPrice sellingPrice").lean();
      const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
      const valuation = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);

      const formattedProducts = products.slice(0, 10).map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.quantity,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        valuation: p.quantity * p.costPrice
      }));

      return {
        category: {
          name: category.name,
          slug: category.categorySlug,
          productCount: products.length,
          totalStock,
          valuation: Math.round(valuation * 100) / 100,
          sampleProducts: formattedProducts
        }
      };
    }

    case "invoice": {
      const q = isObjectId ? { _id: identifier } : { invoiceNumber: identifier };
      const invoice = await invoiceModel.findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name")
        .populate("products.productId", "name sku costPrice sellingPrice")
        .lean();

      if (!invoice) return { message: `Invoice "${identifier}" not found` };

      let totalCost = 0;
      const enrichedProducts = invoice.products.map(p => {
        const cost = p.productId?.costPrice || 0;
        totalCost += p.quantity * cost;
        return {
          name: p.productId?.name || "N/A",
          sku: p.productId?.sku || "N/A",
          quantity: p.quantity,
          sellingPrice: p.sellingPrice,
          costPrice: cost,
          profit: p.sellingPrice - cost,
          subtotal: p.subtotal
        };
      });

      const profit = invoice.total - totalCost;
      const margin = invoice.total > 0 ? (profit / invoice.total) * 100 : 0;

      return {
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          discount: invoice.discount,
          total: invoice.total,
          costOfGoodsSold: Math.round(totalCost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          margin: Math.round(margin * 100) / 100,
          status: invoice.status,
          createdBy: invoice.createdBy?.name || "N/A",
          createdAt: invoice.createdAt,
          products: enrichedProducts
        }
      };
    }

    case "purchase_order": {
      const q = isObjectId ? { _id: identifier } : { poNumber: identifier };
      const po = await purchaseOrderModel.findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name")
        .populate("approvedBy", "name")
        .populate("supplierId", "name contactPerson email phone")
        .populate("items.productId", "name sku costPrice")
        .lean();

      if (!po) return { message: `Purchase Order "${identifier}" not found` };

      const enrichedItems = po.items.map(item => ({
        name: item.productId?.name || "N/A",
        sku: item.productId?.sku || "N/A",
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: item.quantity * item.unitCost
      }));

      return {
        purchase_order: {
          _id: po._id,
          poNumber: po.poNumber,
          supplier: po.supplierId?.name || "N/A",
          supplierContact: po.supplierId ? {
            person: po.supplierId.contactPerson,
            email: po.supplierId.email,
            phone: po.supplierId.phone
          } : null,
          totalCost: po.totalCost,
          status: po.status,
          createdBy: po.createdBy?.name || "N/A",
          approvedBy: po.approvedBy?.name || "N/A",
          generatedFromAI: po.generatedFromAI,
          createdAt: po.createdAt,
          items: enrichedItems
        }
      };
    }

    case "user": {
      const q = isObjectId ? { _id: identifier } : { $or: [{ name: new RegExp(identifier, "i") }, { email: identifier }] };
      const user = await userModel.findOne({ ...baseQuery, ...q }).select("-password -tokenVersion").lean();
      if (!user) return { message: `User "${identifier}" not found` };

      const [recentInvoices, recentPOs, recentLogs] = await Promise.all([
        invoiceModel.find(buildFindFilter(organizationId, { createdBy: user._id })).sort({ createdAt: -1 }).limit(5).lean(),
        purchaseOrderModel.find(buildFindFilter(organizationId, { createdBy: user._id })).sort({ createdAt: -1 }).limit(5).lean(),
        stockLogModel.find(buildFindFilter(organizationId, { performedBy: user._id })).populate("productId", "name sku").sort({ createdAt: -1 }).limit(5).lean()
      ]);

      return {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          activitySummary: {
            invoicesCreated: recentInvoices.length,
            purchaseOrdersCreated: recentPOs.length,
            stockLogsPerformed: recentLogs.length
          },
          recentInvoices: recentInvoices.map(s => ({
            invoiceNumber: s.invoiceNumber,
            customerName: s.customerName,
            total: s.total,
            status: s.status,
            createdAt: s.createdAt
          })),
          recentPurchaseOrders: recentPOs.map(po => ({
            poNumber: po.poNumber,
            totalCost: po.totalCost,
            status: po.status,
            createdAt: po.createdAt
          })),
          recentStockAdjustments: recentLogs.map(l => ({
            productName: l.productId?.name || "N/A",
            type: l.type,
            reason: l.reason,
            quantity: l.quantity,
            createdAt: l.createdAt
          }))
        }
      };
    }

    case "organization": {
      const q = isObjectId ? { _id: identifier } : { name: new RegExp(identifier, "i") };
      const org = await organizationModel.findOne(q).lean();
      if (!org) return { message: `Organization "${identifier}" not found` };

      const [usersCount, productsCount, invoiceTotals] = await Promise.all([
        userModel.countDocuments({ organizationId: org._id }),
        productModel.countDocuments({ organizationId: org._id, isActive: true }),
        invoiceModel.aggregate([
          { $match: { organizationId: org._id, status: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } }
        ])
      ]);

      return {
        organization: {
          name: org.name,
          contactEmail: org.contactEmail,
          address: org.address,
          phone: org.phone,
          status: org.status,
          usersCount,
          productsCount,
          totalRevenue: Math.round((invoiceTotals[0]?.total || 0) * 100) / 100,
          createdAt: org.createdAt
        }
      };
    }
  }
};

// ============ 7. TRANSACTIONS TOOL ============

const handleTransactions = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  if (args.product) {
    const products = await productModel.find(buildFindFilter(organizationId, {
      $or: [{ name: new RegExp(args.product, "i") }, { sku: args.product }]
    })).select("_id");

    if (products.length > 0) {
      filter.productId = { $in: products.map(p => p._id) };
    } else {
      return { transactions: [], count: 0, summary: { totalTransactions: 0, totalIn: 0, totalOut: 0 } };
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
      return { transactions: [], count: 0, summary: { totalTransactions: 0, totalIn: 0, totalOut: 0 } };
    }
  }

  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  const limitValue = Math.min(args.limit || 50, 100);
  const rawLogs = await stockLogModel
    .find(filter)
    .populate("productId", "name sku costPrice sellingPrice")
    .populate("performedBy", "name email role")
    .populate("relatedInvoiceId", "invoiceNumber")
    .populate("relatedPurchaseOrderId", "poNumber")
    .sort({ createdAt: -1 })
    .limit(limitValue)
    .lean();

  const transactions = rawLogs.map(l => ({
    _id: l._id,
    productName: l.productId?.name || "N/A",
    productSku: l.productId?.sku || "N/A",
    type: l.type,
    reason: l.reason,
    quantity: l.quantity,
    performedBy: l.performedBy?.name || "N/A",
    referenceNumber: l.relatedInvoiceId?.invoiceNumber || l.relatedPurchaseOrderId?.poNumber || "N/A",
    createdAt: l.createdAt
  }));

  // Summary statistics
  const allLogsForStats = await stockLogModel.find(filter).select("type quantity").lean();
  let totalIn = 0;
  let totalOut = 0;
  for (const log of allLogsForStats) {
    if (log.type === "in") totalIn += log.quantity;
    else if (log.type === "out") totalOut += log.quantity;
  }

  const summary = {
    totalTransactions: allLogsForStats.length,
    totalIn,
    totalOut,
  };

  return { transactions, count: transactions.length, summary };
};

// ============ ROUTER & EXECUTION ============

export const executeTool = async (toolName, args, organizationId) => {
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
        return { message: "I don't understand that request. Please rephrase." };
    }
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return {
      error: true,
      message: "An error occurred processing your request",
      details: error.message,
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
  // Gatekeeper: Chatbot is restricted to Administrators (Admin and Super Admin)
  if (role !== "admin" && role !== "super_admin") {
    return []; // No tools available for staff or managers (refused by middleware too)
  }
  return allTools;
};
