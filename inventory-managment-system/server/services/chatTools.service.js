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

  if (args.startDate && args.endDate) {
    return {
      startDate: new Date(args.startDate),
      endDate: new Date(args.endDate),
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
    // Margin is calculated as (sellingPrice - costPrice) / sellingPrice
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

  if (args.addedPeriod) {
    const { startDate, endDate } = parseDateRange({ period: args.addedPeriod });
    if (startDate) {
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }
  }

  // 2. Handle Stock Status (incorporating Dead Stock query)
  let activeProductIds = [];
  if (args.stockStatus === "dead_stock" || !args.stockStatus) {
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
  }

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

  const totalProducts = await productModel.countDocuments(filter);
  const rawProducts = await productModel
    .find(filter)
    .populate("categoryId", "name")
    .populate("supplierId", "name contactPerson")
    .skip(skipValue)
    .limit(limitValue)
    .sort(args.sortBy ? { [args.sortBy]: args.sortOrder === "desc" ? -1 : 1 } : { createdAt: -1 })
    .lean();

  // Process required fields and calculations
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
      margin: Math.round(margin * 10000) / 100, // percentage representation
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
  const allProductsForStats = await productModel.find(filter).select("quantity costPrice sellingPrice reorderThreshold").lean();

  let totalStock = 0;
  let totalInventoryValue = 0;
  let totalPotentialRevenue = 0;
  let totalPotentialProfit = 0;
  let maxPrice = 0;
  let minPrice = allProductsForStats[0]?.sellingPrice || 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let deadStockCount = 0;

  const sortedForAbc = allProductsForStats.map((p) => {
    const val = p.quantity * p.costPrice;
    totalStock += p.quantity;
    totalInventoryValue += val;
    totalPotentialRevenue += p.quantity * p.sellingPrice;
    totalPotentialProfit += p.quantity * (p.sellingPrice - p.costPrice);
    if (p.sellingPrice > maxPrice) maxPrice = p.sellingPrice;
    if (p.sellingPrice < minPrice) minPrice = p.sellingPrice;
    if (p.quantity === 0) outOfStockCount++;
    else if (p.quantity <= p.reorderThreshold) lowStockCount++;

    // Check if dead stock
    if (p.quantity > 0 && !activeProductIds.includes(p._id.toString())) {
      deadStockCount++;
    }

    return { id: p._id.toString(), value: val };
  }).sort((a, b) => b.value - a.value);

  // Assign ABC classifications
  let cumulativeValue = 0;
  const abcMap = {};
  for (const item of sortedForAbc) {
    cumulativeValue += item.value;
    const percentage = totalInventoryValue > 0 ? cumulativeValue / totalInventoryValue : 0;
    if (percentage <= 0.70) abcMap[item.id] = "A";
    else if (percentage <= 0.90) abcMap[item.id] = "B";
    else abcMap[item.id] = "C";
  }

  // Enrich returned items with ABC tags
  const enrichedProducts = products.map(p => ({
    ...p,
    abcClassification: abcMap[p._id.toString()] || "C"
  }));

  const summary = {
    totalProducts,
    totalStock,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    totalPotentialRevenue: Math.round(totalPotentialRevenue * 100) / 100,
    totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
    averageCost: allProductsForStats.length > 0
      ? Math.round((allProductsForStats.reduce((sum, p) => sum + p.costPrice, 0) / allProductsForStats.length) * 100) / 100
      : 0,
    averageSellingPrice: allProductsForStats.length > 0
      ? Math.round((allProductsForStats.reduce((sum, p) => sum + p.sellingPrice, 0) / allProductsForStats.length) * 100) / 100
      : 0,
    highestPrice: Math.round(maxPrice * 100) / 100,
    lowestPrice: Math.round(minPrice * 100) / 100,
    lowStockCount,
    outOfStockCount,
    deadStockCount,
  };

  return { products: enrichedProducts, count: enrichedProducts.length, summary };
};

// ============ 2. PURCHASE TOOL ============

const handlePurchases = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  // Predefined or manual date period
  const { startDate, endDate } = parseDateRange(args);
  if (startDate) {
    filter.createdAt = { $gte: startDate, $lte: endDate };
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
    .sort(args.sortBy ? { [args.sortBy === "date" ? "createdAt" : args.sortBy]: args.sortOrder === "desc" ? -1 : 1 } : { createdAt: -1 })
    .limit(limitValue)
    .lean();

  const orders = rawOrders.map(o => ({
    _id: o._id,
    poNumber: o.poNumber,
    supplier: o.supplierId?.name || "N/A",
    itemsCount: o.items.length,
    totalCost: Math.round(o.totalCost * 100) / 100,
    status: o.status,
    createdBy: o.createdBy?.name || "N/A",
    leadTimeDays: o.supplierId?.leadTimeDays || "N/A",
    createdAt: o.createdAt,
  }));

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

  return { orders, count: orders.length, summary };
};

// ============ 3. SALES TOOL ============

const handleSales = async (args, organizationId) => {
  const filter = buildFindFilter(organizationId);

  const { startDate, endDate } = parseDateRange(args);
  if (startDate) {
    filter.createdAt = { $gte: startDate, $lte: endDate };
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
    .sort(args.sortBy ? { [args.sortBy === "date" ? "createdAt" : args.sortBy]: args.sortOrder === "desc" ? -1 : 1 } : { createdAt: -1 })
    .limit(limitValue)
    .lean();

  const invoices = rawInvoices.map(inv => ({
    _id: inv._id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    subtotal: Math.round(inv.subtotal * 100) / 100,
    tax: Math.round(inv.tax * 100) / 100,
    discount: Math.round(inv.discount * 100) / 100,
    total: Math.round(inv.total * 100) / 100,
    status: inv.status,
    createdBy: inv.createdBy?.name || "N/A",
    createdAt: inv.createdAt
  }));

  // Fetch summaries
  const allSalesForStats = await invoiceModel.find(filter).select("total status").lean();
  const totalSales = allSalesForStats.reduce((sum, inv) => sum + (inv.total || 0), 0);

  const statusCounts = { paid: 0, unpaid: 0, void: 0 };
  for (const inv of allSalesForStats) {
    if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++;
  }

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
    totalInvoices: allSalesForStats.length,
    averageInvoiceValue: allSalesForStats.length > 0 ? Math.round((totalSales / allSalesForStats.length) * 100) / 100 : 0,
    statusCounts,
    customerMetrics
  };

  return { invoices, count: invoices.length, summary };
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

        productModel.find(buildFindFilter(organizationId, { isActive: true })).select("quantity costPrice sellingPrice").lean(),
        invoiceModel.find(buildFindFilter(organizationId, {
          status: "paid",
          createdAt: { $gte: startDate, $lte: endDate },
        })).select("total")
      ]);

      const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
      const revenue = allInvoices.reduce((sum, inv) => sum + inv.total, 0);

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
          revenue: Math.round(revenue * 100) / 100,
          orders: allInvoices.length,
        },
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
      // Standard ABC Classification analysis on all inventory
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
      // Products with stock but no sales in the last 30 days
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

      // Calculate details
      const value = product.quantity * product.costPrice;
      const profit = product.sellingPrice - product.costPrice;
      const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;

      // Parallel reads to build the context
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

      const [productsCount, recentPOs] = await Promise.all([
        productModel.countDocuments(buildFindFilter(organizationId, { supplierId: supplier._id, isActive: true })),
        purchaseOrderModel.find(buildFindFilter(organizationId, { supplierId: supplier._id })).sort({ createdAt: -1 }).limit(5).lean()
      ]);

      return {
        supplier: {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          leadTimeDays: supplier.leadTimeDays,
          productsCount,
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

      const products = await productModel.find(buildFindFilter(organizationId, { categoryId: category._id, isActive: true })).select("quantity costPrice").lean();
      const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
      const valuation = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);

      return {
        category: {
          name: category.name,
          slug: category.categorySlug,
          productCount: products.length,
          totalStock,
          valuation: Math.round(valuation * 100) / 100
        }
      };
    }

    case "invoice": {
      const q = isObjectId ? { _id: identifier } : { invoiceNumber: identifier };
      const invoice = await invoiceModel.findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name")
        .populate("products.productId", "name sku")
        .lean();

      if (!invoice) return { message: `Invoice "${identifier}" not found` };

      return { invoice };
    }

    case "purchase_order": {
      const q = isObjectId ? { _id: identifier } : { poNumber: identifier };
      const po = await purchaseOrderModel.findOne({ ...baseQuery, ...q })
        .populate("createdBy", "name")
        .populate("supplierId", "name")
        .populate("items.productId", "name sku")
        .lean();

      if (!po) return { message: `Purchase Order "${identifier}" not found` };

      return { purchase_order: po };
    }

    case "user": {
      const q = isObjectId ? { _id: identifier } : { $or: [{ name: new RegExp(identifier, "i") }, { email: identifier }] };
      const user = await userModel.findOne({ ...baseQuery, ...q }).select("-password -tokenVersion").lean();
      if (!user) return { message: `User "${identifier}" not found` };

      const recentHistory = await chatLogModel.find(buildFindFilter(organizationId, { userId: user._id })).sort({ createdAt: -1 }).limit(5).lean();

      return {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          recentActivity: recentHistory.map(h => ({
            query: h.query,
            intent: h.intent,
            createdAt: h.createdAt
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
  const tableTools = ["query_purchases", "query_sales"];
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
  // Consolidate the permissions to fit our 6 generic tools
  if (role === "staff") {
    // Staff can only view inventory
    return allTools.filter(t => t.name === "query_inventory" || t.name === "get_details");
  }
  if (role === "manager") {
    // Managers can view inventory, purchases, sales, and insights, but no team/organization management
    return allTools.filter(t => t.name !== "query_organization");
  }
  return allTools;
};
