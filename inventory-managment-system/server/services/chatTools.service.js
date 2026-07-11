// services/chatTools.service.js
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

// ============ HELPER FUNCTIONS ============

/**
 * Parse date ranges from various formats
 */
const parseDateRange = (args) => {
  const now = new Date();
  let startDate = null;
  let endDate = new Date();

  // If specific dates provided
  if (args.startDate && args.endDate) {
    return {
      startDate: new Date(args.startDate),
      endDate: new Date(args.endDate),
    };
  }

  // If period specified
  if (args.period) {
    const periods = {
      today: () => {
        const d = new Date(now.setHours(0, 0, 0, 0));
        return { startDate: d, endDate: new Date() };
      },
      yesterday: () => {
        const d = new Date(now.setDate(now.getDate() - 1));
        d.setHours(0, 0, 0, 0);
        const e = new Date(d);
        e.setHours(23, 59, 59, 999);
        return { startDate: d, endDate: e };
      },
      this_week: () => {
        const d = new Date(now.setDate(now.getDate() - now.getDay()));
        d.setHours(0, 0, 0, 0);
        return { startDate: d, endDate: new Date() };
      },
      last_week: () => {
        const d = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        d.setHours(0, 0, 0, 0);
        const e = new Date(d);
        e.setDate(e.getDate() + 6);
        e.setHours(23, 59, 59, 999);
        return { startDate: d, endDate: e };
      },
      this_month: () => {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: d, endDate: new Date() };
      },
      last_month: () => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        e.setHours(23, 59, 59, 999);
        return { startDate: d, endDate: e };
      },
      this_year: () => {
        const d = new Date(now.getFullYear(), 0, 1);
        return { startDate: d, endDate: new Date() };
      },
    };

    if (periods[args.period]) {
      return periods[args.period]();
    }
  }

  // Default: last 30 days
  return {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
};

/**
 * Build sort object for Mongoose
 */
const buildSort = (sortBy, sortOrder = "asc") => {
  if (!sortBy) return { createdAt: -1 };

  const sortMap = {
    name: "name",
    price: "sellingPrice",
    stock: "quantity",
    sku: "sku",
    date: "createdAt",
    amount: "total",
    customer: "customerName",
    leadTime: "leadTimeDays",
  };

  const field = sortMap[sortBy] || "name";
  return { [field]: sortOrder === "desc" ? -1 : 1 };
};

/**
 * Apply limit to query
 */
const applyLimit = (query, limit) => {
  const maxLimit = Math.min(limit || 20, 100);
  return query.limit(maxLimit);
};

/**
 * Find category by name
 */
const findCategory = async (organizationId, name) => {
  if (!name) return null;
  return await categoryModel.findOne({
    organizationId,
    name: new RegExp(name, "i"),
  });
};

/**
 * Find supplier by name
 */
const findSupplier = async (organizationId, name) => {
  if (!name) return null;
  return await supplierModel.findOne({
    organizationId,
    name: new RegExp(name, "i"),
  });
};

// ============ MAIN HANDLER ============

export const executeTool = async (toolName, args, organizationId) => {
  try {
    switch (toolName) {
      case "query_products":
        return await handleProducts(args, organizationId);
      case "query_suppliers":
        return await handleSuppliers(args, organizationId);
      case "query_sales":
        return await handleSales(args, organizationId);
      case "query_orders":
        return await handleOrders(args, organizationId);
      case "query_analytics":
        return await handleAnalytics(args, organizationId);
      case "query_team":
        return await handleTeam(args, organizationId);
      case "query_insights":
        return await handleInsights(args, organizationId);
      case "get_dashboard":
        return await handleDashboard(args, organizationId);
      case "get_comprehensive_info":
        return await handleComprehensive(args, organizationId);
      case "get_full_overview": // <-- ADD THIS
        return await handleFullOverview(args, organizationId);
      case "generate_report":
        return await generateReport(args, organizationId);
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

// ============ REPORT GENERATOR ============

const generateReport = async (args, organizationId) => {
  // Reuse the enhanced dashboard logic
  const dashboardData = await handleDashboard(args, organizationId);

  // Format as a structured report
  return {
    report: {
      generated: new Date().toISOString(),
      period: dashboardData.periodLabel,
      dateRange: dashboardData.dateRange,
      executiveSummary: {
        revenue: dashboardData.metrics.revenue,
        orders: dashboardData.metrics.orders,
        products: dashboardData.metrics.totalProducts,
        anomalies: dashboardData.metrics.anomalies,
      },
      keyMetrics: dashboardData.metrics,
      topProducts: dashboardData.topProducts,
      anomalies: dashboardData.anomalies,
      recentOrders: dashboardData.recentOrders,
    },
    summary: dashboardData.metrics,
    ...dashboardData,
  };
};

// ============ PRODUCT HANDLER ============

const handleProducts = async (args, organizationId) => {
  const filter = { organizationId, isActive: true };

  // Search filter
  if (args.search) {
    filter.$or = [
      { name: new RegExp(args.search, "i") },
      { sku: new RegExp(args.search, "i") },
    ];
  }

  // Category filter
  if (args.category) {
    const category = await findCategory(organizationId, args.category);
    if (category) filter.categoryId = category._id;
  }

  // Supplier filter
  if (args.supplier) {
    const supplier = await findSupplier(organizationId, args.supplier);
    if (supplier) filter.supplierId = supplier._id;
  }

  // Price range
  if (args.minPrice || args.maxPrice) {
    filter.sellingPrice = {};
    if (args.minPrice) filter.sellingPrice.$gte = args.minPrice;
    if (args.maxPrice) filter.sellingPrice.$lte = args.maxPrice;
  }

  // Stock status
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
      // "all" = no filter needed
    }
  }

  // Build query
  let query = productModel
    .find(filter)
    .populate("categoryId", "name")
    .populate("supplierId", "name contactPerson")
    .select(
      "name sku quantity sellingPrice costPrice imageUrl unit reorderThreshold",
    );

  // Apply sorting
  if (args.sortBy) {
    query = query.sort(buildSort(args.sortBy, args.sortOrder));
  }

  // Apply limit
  query = applyLimit(query, args.limit);

  const products = await query;

  // Calculate summary stats
  const totalValue = products.reduce(
    (sum, p) => sum + p.quantity * p.sellingPrice,
    0,
  );
  const avgPrice =
    products.length > 0
      ? products.reduce((sum, p) => sum + p.sellingPrice, 0) / products.length
      : 0;

  return {
    products,
    count: products.length,
    summary: {
      totalValue: Math.round(totalValue * 100) / 100,
      averagePrice: Math.round(avgPrice * 100) / 100,
      totalItems: products.reduce((sum, p) => sum + p.quantity, 0),
    },
  };
};

// ============ SUPPLIER HANDLER ============

const handleSuppliers = async (args, organizationId) => {
  const filter = { organizationId };

  // Search
  if (args.search) {
    filter.$or = [
      { name: new RegExp(args.search, "i") },
      { contactPerson: new RegExp(args.search, "i") },
      { email: new RegExp(args.search, "i") },
    ];
  }

  // Lead time range
  if (args.minLeadTime || args.maxLeadTime) {
    filter.leadTimeDays = {};
    if (args.minLeadTime) filter.leadTimeDays.$gte = args.minLeadTime;
    if (args.maxLeadTime) filter.leadTimeDays.$lte = args.maxLeadTime;
  }

  let query = supplierModel
    .find(filter)
    .select("name contactPerson email phone leadTimeDays address");

  if (args.sortBy) {
    query = query.sort(buildSort(args.sortBy, args.sortOrder));
  }

  query = applyLimit(query, args.limit);

  const suppliers = await query;

  // Get product count for each supplier
  for (const supplier of suppliers) {
    supplier._doc.productCount = await productModel.countDocuments({
      organizationId,
      supplierId: supplier._id,
      isActive: true,
    });
  }

  return { suppliers, count: suppliers.length };
};

// ============ SALES HANDLER ============

const handleSales = async (args, organizationId) => {
  const { startDate, endDate } = parseDateRange(args);
  const filter = { organizationId };

  // Status filter
  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  // Customer filter
  if (args.customer) {
    filter.customerName = new RegExp(args.customer, "i");
  }

  // Date range
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  // Amount range
  if (args.minAmount || args.maxAmount) {
    filter.total = {};
    if (args.minAmount) filter.total.$gte = args.minAmount;
    if (args.maxAmount) filter.total.$lte = args.maxAmount;
  }

  let query = invoiceModel
    .find(filter)
    .populate("createdBy", "name email")
    .select("invoiceNumber customerName total status createdAt");

  if (args.sortBy) {
    query = query.sort(buildSort(args.sortBy, args.sortOrder));
  } else {
    query = query.sort({ createdAt: -1 });
  }

  query = applyLimit(query, args.limit || 20);

  const invoices = await query;

  // Calculate summary
  const summary = {
    totalRevenue:
      Math.round(invoices.reduce((sum, inv) => sum + inv.total, 0) * 100) / 100,
    totalOrders: invoices.length,
    averageOrder:
      invoices.length > 0
        ? Math.round(
            (invoices.reduce((sum, inv) => sum + inv.total, 0) /
              invoices.length) *
              100,
          ) / 100
        : 0,
  };

  // Get product details if requested
  let topProducts = null;
  if (args.includeProducts && invoices.length > 0) {
    const productMap = {};
    for (const inv of invoices) {
      const fullInvoice = await invoiceModel.findById(inv._id);
      for (const p of fullInvoice.products) {
        const key = p.productId.toString();
        if (!productMap[key]) {
          productMap[key] = { quantity: 0, revenue: 0 };
        }
        productMap[key].quantity += p.quantity;
        productMap[key].revenue += p.subtotal;
      }
    }

    const sorted = Object.entries(productMap)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10);

    topProducts = await Promise.all(
      sorted.map(async ([id, data]) => {
        const product = await productModel.findById(id).select("name imageUrl");
        return {
          name: product?.name || "Unknown",
          imageUrl: product?.imageUrl,
          quantity: data.quantity,
          revenue: Math.round(data.revenue * 100) / 100,
        };
      }),
    );
  }

  // Customer analytics if customer specified
  let customerAnalytics = null;
  if (args.customer) {
    const customerInvoices = await invoiceModel.find({
      organizationId,
      customerName: new RegExp(args.customer, "i"),
      status: "paid",
    });

    customerAnalytics = {
      customerName: args.customer,
      totalSpent:
        Math.round(
          customerInvoices.reduce((sum, inv) => sum + inv.total, 0) * 100,
        ) / 100,
      totalOrders: customerInvoices.length,
      firstPurchase:
        customerInvoices.length > 0
          ? customerInvoices[customerInvoices.length - 1]?.createdAt
          : null,
      lastPurchase:
        customerInvoices.length > 0 ? customerInvoices[0]?.createdAt : null,
    };
  }

  return {
    invoices,
    summary,
    topProducts,
    customerAnalytics,
    count: invoices.length,
    dateRange: { startDate, endDate },
  };
};

// ============ ORDERS HANDLER ============

const handleOrders = async (args, organizationId) => {
  const filter = { organizationId };

  // Status filter
  if (args.status && args.status !== "all") {
    filter.status = args.status;
  }

  // Supplier filter
  if (args.supplier) {
    const supplier = await findSupplier(organizationId, args.supplier);
    if (supplier) filter.supplierId = supplier._id;
  }

  // Date range
  const { startDate, endDate } = parseDateRange(args);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  let query = purchaseOrderModel
    .find(filter)
    .populate("supplierId", "name contactPerson email")
    .populate("createdBy", "name")
    .populate("approvedBy", "name")
    .select("poNumber totalCost status createdAt items");

  if (args.sortBy) {
    query = query.sort(buildSort(args.sortBy, args.sortOrder));
  } else {
    query = query.sort({ createdAt: -1 });
  }

  query = applyLimit(query, args.limit || 20);

  const orders = await query;

  return {
    orders,
    count: orders.length,
    totalCost:
      Math.round(orders.reduce((sum, o) => sum + o.totalCost, 0) * 100) / 100,
  };
};

// ============ FULL OVERVIEW HANDLER ============

const handleFullOverview = async (args, organizationId) => {
  const limit = args.limit || 20;
  const includeProducts = args.includeProducts !== false;
  const includeCategories = args.includeCategories !== false;
  const includeSuppliers = args.includeSuppliers !== false;

  // Get all data in parallel for performance
  const [
    products,
    categories,
    suppliers,
    totalUsers,
    totalProductsCount,
    totalCategoriesCount,
    totalSuppliersCount,
    lowStockCount,
    outOfStockCount,
    pendingOrders,
    anomalies,
    suggestions,
  ] = await Promise.all([
    // Products (with limit)
    includeProducts
      ? productModel
          .find({ organizationId, isActive: true })
          .populate("categoryId", "name")
          .populate("supplierId", "name contactPerson")
          .select("name sku quantity sellingPrice unit")
          .limit(limit)
          .lean()
      : [],
    // Categories
    includeCategories
      ? categoryModel
          .find({ organizationId })
          .select("name categorySlug")
          .limit(limit)
          .lean()
      : [],
    // Suppliers
    includeSuppliers
      ? supplierModel
          .find({ organizationId })
          .select("name contactPerson email phone leadTimeDays")
          .limit(limit)
          .lean()
      : [],
    // Counts
    userModel.countDocuments({ organizationId, isActive: true }),
    productModel.countDocuments({ organizationId, isActive: true }),
    categoryModel.countDocuments({ organizationId }),
    supplierModel.countDocuments({ organizationId }),
    productModel.countDocuments({
      organizationId,
      isActive: true,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    }),
    productModel.countDocuments({
      organizationId,
      isActive: true,
      quantity: 0,
    }),
    purchaseOrderModel.countDocuments({ organizationId, status: "pending" }),
    anomalyModel.countDocuments({ organizationId, isResolved: false }),
    reorderSuggestionModel.countDocuments({
      organizationId,
      status: "pending",
    }),
  ]);

  // Calculate revenue
  const invoices = await invoiceModel.find({
    organizationId,
    status: "paid",
  });
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalOrders = invoices.length;

  // Build the response
  const result = {
    summary: {
      totalProducts: totalProductsCount,
      totalCategories: totalCategoriesCount,
      totalSuppliers: totalSuppliersCount,
      totalUsers,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      pendingOrders,
      anomalies,
      reorderSuggestions: suggestions,
      revenue: Math.round(totalRevenue * 100) / 100,
      orders: totalOrders,
    },
  };

  if (includeProducts) {
    result.products = products;
    result.productCount = products.length;
  }

  if (includeCategories) {
    result.categories = categories;
    result.categoryCount = categories.length;
  }

  if (includeSuppliers) {
    result.suppliers = suppliers;
    result.supplierCount = suppliers.length;
  }

  return result;
};

// ============ ANALYTICS HANDLER ============

const handleAnalytics = async (args, organizationId) => {
  const { type } = args;

  switch (type) {
    case "forecast":
      return await handleForecast(args, organizationId);
    case "anomalies":
      return await handleAnomalies(args, organizationId);
    case "suggestions":
      return await handleSuggestions(args, organizationId);
    case "inventory_value":
      return await handleInventoryValue(args, organizationId);
    case "customer_analytics":
      return await handleCustomerAnalytics(args, organizationId);
    default:
      return { message: `Unknown analytics type: ${type}` };
  }
};

const handleForecast = async (args, organizationId) => {
  const filter = { organizationId };

  // Product filter
  if (args.product) {
    const product = await productModel.findOne({
      organizationId,
      $or: [{ name: new RegExp(args.product, "i") }, { sku: args.product }],
    });
    if (product) {
      filter.productId = product._id;
    } else {
      return { message: `Product "${args.product}" not found` };
    }
  }

  if (args.forecastPeriod) filter.forecastPeriod = args.forecastPeriod;
  if (args.minConfidence) filter.confidence = { $gte: args.minConfidence };

  let query = demandForecastModel
    .find(filter)
    .populate("productId", "name sku quantity sellingPrice")
    .sort({ createdAt: -1 });

  query = applyLimit(query, args.limit || 20);

  const forecasts = await query;

  // Calculate days until stockout
  for (const f of forecasts) {
    const product = f.productId;
    const daysInPeriod =
      {
        "7_days": 7,
        "30_days": 30,
        "90_days": 90,
      }[f.forecastPeriod] || 30;

    const dailyDemand = f.predictedDemand / daysInPeriod;
    f._doc.daysUntilStockout = Math.max(
      0,
      Math.floor(product.quantity / dailyDemand),
    );
    f._doc.status =
      f._doc.daysUntilStockout < 7
        ? "URGENT"
        : f._doc.daysUntilStockout < 14
          ? "WARNING"
          : "OK";
  }

  return {
    forecasts,
    count: forecasts.length,
    summary: {
      urgent: forecasts.filter((f) => f._doc.daysUntilStockout < 7).length,
      warning: forecasts.filter(
        (f) => f._doc.daysUntilStockout >= 7 && f._doc.daysUntilStockout < 14,
      ).length,
      ok: forecasts.filter((f) => f._doc.daysUntilStockout >= 14).length,
    },
  };
};

const handleAnomalies = async (args, organizationId) => {
  const filter = { organizationId, isResolved: false };

  if (args.severity) filter.severity = args.severity;
  if (args.anomalyType) filter.type = args.anomalyType;

  // Product filter
  if (args.product) {
    const product = await productModel.findOne({
      organizationId,
      name: new RegExp(args.product, "i"),
    });
    if (product) filter.productId = product._id;
  }

  let query = anomalyModel
    .find(filter)
    .populate("productId", "name sku quantity sellingPrice imageUrl")
    .sort({ severity: 1, createdAt: -1 });

  query = applyLimit(query, args.limit || 20);

  const anomalies = await query;

  // Summary
  const summary = {
    total: anomalies.length,
    bySeverity: {
      high: anomalies.filter((a) => a.severity === "high").length,
      medium: anomalies.filter((a) => a.severity === "medium").length,
      low: anomalies.filter((a) => a.severity === "low").length,
    },
    byType: {},
  };

  for (const a of anomalies) {
    summary.byType[a.type] = (summary.byType[a.type] || 0) + 1;
  }

  return { anomalies, summary };
};

const handleSuggestions = async (args, organizationId) => {
  const filter = { organizationId, status: "pending" };

  // Product filter
  if (args.product) {
    const product = await productModel.findOne({
      organizationId,
      name: new RegExp(args.product, "i"),
    });
    if (product) filter.productId = product._id;
  }

  let query = reorderSuggestionModel
    .find(filter)
    .populate("productId", "name sku quantity sellingPrice imageUrl")
    .sort({ suggestedReorderDate: 1 });

  query = applyLimit(query, args.limit || 20);

  const suggestions = await query;

  // Calculate urgency
  const now = new Date();
  for (const s of suggestions) {
    const daysUntil = Math.ceil(
      (s.suggestedReorderDate - now) / (1000 * 60 * 60 * 24),
    );
    s._doc.urgency =
      daysUntil < 7 ? "URGENT" : daysUntil < 14 ? "SOON" : "NORMAL";
  }

  return {
    suggestions,
    count: suggestions.length,
    urgentCount: suggestions.filter((s) => s._doc.urgency === "URGENT").length,
  };
};

const handleInventoryValue = async (args, organizationId) => {
  const products = await productModel
    .find({
      organizationId,
      isActive: true,
    })
    .select("name quantity sellingPrice costPrice categoryId");

  const total = {
    sellingValue:
      Math.round(
        products.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0) * 100,
      ) / 100,
    costValue:
      Math.round(
        products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0) * 100,
      ) / 100,
    profit:
      Math.round(
        products.reduce(
          (sum, p) => sum + p.quantity * (p.sellingPrice - p.costPrice),
          0,
        ) * 100,
      ) / 100,
  };

  // Group by category if requested
  let byCategory = null;
  if (args.category) {
    const category = await findCategory(organizationId, args.category);
    if (category) {
      const catProducts = products.filter(
        (p) => p.categoryId.toString() === category._id.toString(),
      );
      byCategory = {
        category: category.name,
        totalProducts: catProducts.length,
        value:
          Math.round(
            catProducts.reduce(
              (sum, p) => sum + p.quantity * p.sellingPrice,
              0,
            ) * 100,
          ) / 100,
      };
    }
  }

  return {
    inventoryValue: total,
    productCount: products.length,
    byCategory,
  };
};

const handleCustomerAnalytics = async (args, organizationId) => {
  if (!args.customer) {
    return { message: "Please provide a customer name" };
  }

  const invoices = await invoiceModel
    .find({
      organizationId,
      customerName: new RegExp(args.customer, "i"),
      status: "paid",
    })
    .sort({ createdAt: -1 });

  if (invoices.length === 0) {
    return { message: `No purchase history found for "${args.customer}"` };
  }

  // Get product purchase details
  const productMap = {};
  for (const inv of invoices) {
    const fullInvoice = await invoiceModel.findById(inv._id);
    for (const p of fullInvoice.products) {
      const key = p.productId.toString();
      if (!productMap[key]) {
        productMap[key] = { quantity: 0, revenue: 0 };
      }
      productMap[key].quantity += p.quantity;
      productMap[key].revenue += p.subtotal;
    }
  }

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5)
    .map(async ([id, data]) => {
      const product = await productModel.findById(id).select("name imageUrl");
      return {
        productName: product?.name || "Unknown",
        imageUrl: product?.imageUrl,
        quantity: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
      };
    });

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.total, 0);

  return {
    customerName: args.customer,
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalOrders: invoices.length,
    averageOrder:
      invoices.length > 0
        ? Math.round((totalSpent / invoices.length) * 100) / 100
        : 0,
    firstPurchase: invoices[invoices.length - 1]?.createdAt,
    lastPurchase: invoices[0]?.createdAt,
    topProducts: await Promise.all(topProducts),
  };
};

// ============ TEAM HANDLER ============

const handleTeam = async (args, organizationId) => {
  const filter = { organizationId };

  // Search
  if (args.search) {
    filter.$or = [
      { name: new RegExp(args.search, "i") },
      { email: new RegExp(args.search, "i") },
    ];
  }

  // Role filter
  if (args.role && args.role !== "all") {
    filter.role = args.role;
  }

  // Active status
  if (args.isActive !== undefined) {
    filter.isActive = args.isActive;
  }

  let query = userModel
    .find(filter)
    .select("name email role isActive imageUrl createdAt");

  query = applyLimit(query, args.limit || 50);

  const users = await query;

  // Get role stats
  const stats = await userModel.aggregate([
    { $match: { organizationId } },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
      },
    },
  ]);

  const roleStats = stats.reduce(
    (acc, s) => ({
      ...acc,
      [s._id]: { total: s.count, active: s.active },
    }),
    {},
  );

  // Get detailed info if requested
  let details = null;
  if (args.includeDetails && users.length === 1) {
    const user = users[0];
    const activity = await chatLogModel
      .find({ organizationId, userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("query createdAt");

    details = { recentActivity: activity };
  }

  return {
    users,
    count: users.length,
    stats: roleStats,
    details,
  };
};

// ============ INSIGHTS HANDLER ============

const handleInsights = async (args, organizationId) => {
  const filter = { organizationId };
  if (args.period) filter.period = args.period;

  if (args.type === "history") {
    const insights = await aiInsightsModel
      .find(filter)
      .populate("keyMetrics.topSellingProductId", "name")
      .populate("keyMetrics.decliningProductId", "name")
      .sort({ createdAt: -1 })
      .limit(args.limit || 10);

    return { insights, count: insights.length };
  }

  // Latest insight
  const insight = await aiInsightsModel
    .findOne(filter)
    .populate("keyMetrics.topSellingProductId", "name")
    .populate("keyMetrics.decliningProductId", "name")
    .sort({ createdAt: -1 });

  if (!insight) {
    return { message: `No ${args.period || "weekly"} insights available yet` };
  }

  return { insight };
};

// ============ DASHBOARD HANDLER ============

// const handleDashboard = async (args, organizationId) => {
//   const { startDate, endDate } = parseDateRange({
//     period: args.period || "this_month",
//   });

//   // Get all metrics in parallel
//   const [
//     totalProducts,
//     lowStock,
//     outOfStock,
//     totalSuppliers,
//     totalUsers,
//     pendingOrders,
//     anomalies,
//     suggestions,
//   ] = await Promise.all([
//     productModel.countDocuments({ organizationId, isActive: true }),
//     productModel.countDocuments({
//       organizationId,
//       isActive: true,
//       $expr: { $lte: ["$quantity", "$reorderThreshold"] },
//     }),
//     productModel.countDocuments({
//       organizationId,
//       isActive: true,
//       quantity: 0,
//     }),
//     supplierModel.countDocuments({ organizationId }),
//     userModel.countDocuments({ organizationId, isActive: true }),
//     purchaseOrderModel.countDocuments({ organizationId, status: "pending" }),
//     anomalyModel.countDocuments({ organizationId, isResolved: false }),
//     reorderSuggestionModel.countDocuments({
//       organizationId,
//       status: "pending",
//     }),
//   ]);

//   // Sales summary
//   const invoices = await invoiceModel.find({
//     organizationId,
//     status: "paid",
//     createdAt: { $gte: startDate, $lte: endDate },
//   });

//   const revenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
//   const orders = invoices.length;

//   // Low stock products (top 5)
//   const lowStockProducts = await productModel
//     .find({
//       organizationId,
//       isActive: true,
//       $expr: { $lte: ["$quantity", "$reorderThreshold"] },
//     })
//     .select("name sku quantity sellingPrice")
//     .sort({ quantity: 1 })
//     .limit(5);

//   // Recent anomalies (top 3)
//   const recentAnomalies = await anomalyModel
//     .find({
//       organizationId,
//       isResolved: false,
//     })
//     .populate("productId", "name")
//     .sort({ severity: 1, createdAt: -1 })
//     .limit(3);

//   return {
//     period: args.period || "this_month",
//     dateRange: { startDate, endDate },
//     metrics: {
//       totalProducts,
//       lowStock,
//       outOfStock,
//       totalSuppliers,
//       totalUsers,
//       pendingOrders,
//       anomalies,
//       suggestions,
//       revenue: Math.round(revenue * 100) / 100,
//       orders,
//     },
//     alerts: {
//       lowStockProducts,
//       recentAnomalies,
//       urgentSuggestions: suggestions,
//     },
//   };
// };

// ============ DASHBOARD HANDLER (ENHANCED) ============

const handleDashboard = async (args, organizationId) => {
  const { startDate, endDate } = parseDateRange({
    period: args.period || "this_month",
  });

  // Get all metrics in parallel
  const [
    totalProducts,
    lowStock,
    outOfStock,
    totalSuppliers,
    totalUsers,
    pendingOrders,
    anomalies,
    suggestions,
    allProducts,
    allInvoices,
    allAnomalies,
    allPurchaseOrders,
  ] = await Promise.all([
    productModel.countDocuments({ organizationId, isActive: true }),
    productModel.countDocuments({
      organizationId,
      isActive: true,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    }),
    productModel.countDocuments({
      organizationId,
      isActive: true,
      quantity: 0,
    }),
    supplierModel.countDocuments({ organizationId }),
    userModel.countDocuments({ organizationId, isActive: true }),
    purchaseOrderModel.countDocuments({ organizationId, status: "pending" }),
    anomalyModel.countDocuments({ organizationId, isResolved: false }),
    reorderSuggestionModel.countDocuments({
      organizationId,
      status: "pending",
    }),
    // Get actual data for reports
    productModel
      .find({ organizationId, isActive: true })
      .select("name sku quantity sellingPrice")
      .lean(),
    invoiceModel
      .find({
        organizationId,
        status: "paid",
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate("products.productId"),
    anomalyModel
      .find({
        organizationId,
        isResolved: false,
      })
      .populate("productId", "name sku"),
    purchaseOrderModel
      .find({
        organizationId,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate("supplierId", "name"),
  ]);

  // Calculate revenue
  const revenue = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const orders = allInvoices.length;

  // Calculate period label
  const periodLabel =
    args.period === "this_week"
      ? "Weekly"
      : args.period === "this_month"
        ? "Monthly"
        : args.period === "today"
          ? "Daily"
          : "Period";

  // Calculate product sales data
  const productSales = {};
  for (const inv of allInvoices) {
    for (const item of inv.products) {
      const productId = item.productId?._id || item.productId;
      if (productId) {
        if (!productSales[productId]) {
          productSales[productId] = { quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.subtotal || 0;
      }
    }
  }

  // Find top selling products
  const sortedProducts = Object.entries(productSales)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);

  const topProducts = await Promise.all(
    sortedProducts.map(async ([productId, data]) => {
      const product = await productModel
        .findById(productId)
        .select("name sku sellingPrice quantity");
      return {
        name: product?.name || "Unknown",
        sku: product?.sku || "N/A",
        quantitySold: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
        currentStock: product?.quantity || 0,
      };
    }),
  );

  // Find products with no sales
  const productIdsWithSales = new Set(Object.keys(productSales));
  const productsWithNoSales = allProducts
    .filter((p) => !productIdsWithSales.has(p._id.toString()))
    .map((p) => ({ name: p.name, sku: p.sku, quantity: p.quantity }))
    .slice(0, 5);

  // Calculate growth (compare to previous period)
  const prevStartDate = new Date(startDate);
  if (args.period === "this_week") {
    prevStartDate.setDate(prevStartDate.getDate() - 7);
  } else if (args.period === "this_month") {
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
  } else {
    prevStartDate.setDate(prevStartDate.getDate() - 30);
  }

  const prevInvoices = await invoiceModel.find({
    organizationId,
    status: "paid",
    createdAt: { $gte: prevStartDate, $lt: startDate },
  });
  const prevRevenue = prevInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const revenueGrowth =
    prevRevenue > 0
      ? (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
      : 0;

  // Build comprehensive response
  return {
    period: args.period || "this_month",
    periodLabel,
    dateRange: { startDate, endDate },
    metrics: {
      totalProducts,
      lowStock,
      outOfStock,
      totalSuppliers,
      totalUsers,
      pendingOrders,
      anomalies: anomalies.length,
      suggestions: suggestions || 0,
      revenue: Math.round(revenue * 100) / 100,
      orders,
      revenueGrowth: parseFloat(revenueGrowth),
    },
    topProducts,
    productsWithNoSales,
    anomalies: allAnomalies.slice(0, 5).map((a) => ({
      type: a.type,
      severity: a.severity,
      product: a.productId?.name || "Unknown",
      description: a.description,
    })),
    recentOrders: allPurchaseOrders.slice(0, 5).map((po) => ({
      poNumber: po.poNumber,
      supplier: po.supplierId?.name || "Unknown",
      totalCost: po.totalCost,
      status: po.status,
    })),
    // Raw data for frontend
    raw: {
      products: allProducts,
      invoices: allInvoices,
      anomalies: allAnomalies,
      purchaseOrders: allPurchaseOrders,
    },
  };
};
// ============ COMPREHENSIVE INFO HANDLER ============

const handleComprehensive = async (args, organizationId) => {
  const { name, type } = args;

  if (!name || !type) {
    return { message: "Please provide both name and type" };
  }

  switch (type) {
    case "product": {
      const product = await productModel
        .findOne({
          organizationId,
          name: new RegExp(name, "i"),
        })
        .populate("categoryId", "name")
        .populate("supplierId", "name contactPerson email phone leadTimeDays");

      if (!product) {
        return { message: `Product "${name}" not found` };
      }

      // Get sales data
      const invoices = await invoiceModel.find({
        organizationId,
        "products.productId": product._id,
        status: "paid",
      });

      const totalSold = invoices.reduce((sum, inv) => {
        const item = inv.products.find(
          (p) => p.productId.toString() === product._id.toString(),
        );
        return sum + (item ? item.quantity : 0);
      }, 0);

      const totalRevenue = invoices.reduce((sum, inv) => {
        const item = inv.products.find(
          (p) => p.productId.toString() === product._id.toString(),
        );
        return sum + (item ? item.subtotal : 0);
      }, 0);

      // Get forecast
      const forecast = await demandForecastModel
        .findOne({
          organizationId,
          productId: product._id,
        })
        .sort({ createdAt: -1 });

      // Get stock history
      const stockHistory = await stockLogModel
        .find({
          organizationId,
          productId: product._id,
        })
        .populate("performedBy", "name")
        .sort({ createdAt: -1 })
        .limit(10);

      // Get anomalies
      const anomalies = await anomalyModel.find({
        organizationId,
        productId: product._id,
        isResolved: false,
      });

      return {
        product,
        salesSummary: {
          totalSold,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          transactionCount: invoices.length,
        },
        forecast,
        stockHistory,
        anomalies: {
          count: anomalies.length,
          list: anomalies,
        },
      };
    }

    case "supplier": {
      const supplier = await supplierModel.findOne({
        organizationId,
        name: new RegExp(name, "i"),
      });

      if (!supplier) {
        return { message: `Supplier "${name}" not found` };
      }

      const products = await productModel
        .find({
          organizationId,
          supplierId: supplier._id,
          isActive: true,
        })
        .select("name sku quantity sellingPrice");

      const orders = await purchaseOrderModel
        .find({
          organizationId,
          supplierId: supplier._id,
        })
        .sort({ createdAt: -1 })
        .limit(10);

      return {
        supplier,
        productCount: products.length,
        products,
        recentOrders: orders,
      };
    }

    case "customer": {
      const invoices = await invoiceModel
        .find({
          organizationId,
          customerName: new RegExp(name, "i"),
        })
        .sort({ createdAt: -1 })
        .limit(20);

      if (invoices.length === 0) {
        return { message: `Customer "${name}" not found` };
      }

      const totalSpent = invoices.reduce((sum, inv) => sum + inv.total, 0);

      return {
        customerName: name,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalOrders: invoices.length,
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          total: inv.total,
          status: inv.status,
          date: inv.createdAt,
        })),
        recentTransactions: invoices.slice(0, 5),
      };
    }

    default:
      return { message: `Unknown entity type: ${type}` };
  }
};

// ============ RESPONSE TYPE HELPER ============

export const getResponseType = (toolName) => {
  const productTools = ["query_products"];
  const supplierTools = ["query_suppliers"];
  const salesTools = ["query_sales"];
  const orderTools = ["query_orders"];
  const analyticsTools = ["query_analytics"];
  const teamTools = ["query_team"];
  const insightTools = ["query_insights"];
  // const dashboardTools = ["get_dashboard"];
  // const comprehensiveTools = ["get_comprehensive_info"];
  const dashboardTools = ["get_dashboard", "get_full_overview"];
  const comprehensiveTools = ["get_comprehensive_info"];

  if (dashboardTools.includes(toolName)) return "dashboard";
  if (comprehensiveTools.includes(toolName)) return "comprehensive";
  if (analyticsTools.includes(toolName)) return "analytics";
  if (salesTools.includes(toolName) || orderTools.includes(toolName))
    return "table";
  if (productTools.includes(toolName)) return "product_list";
  if (supplierTools.includes(toolName)) return "supplier_list";
  if (teamTools.includes(toolName)) return "team_list";
  if (insightTools.includes(toolName)) return "insight";
  return "text";
};

// ============ ROLE-BASED ACCESS ============

export const getToolsForRole = (allTools, role) => {
  const adminOnlyTools = ["query_team"];
  const managerAndAboveTools = [
    "query_sales",
    "query_orders",
    "query_analytics",
    "query_insights",
    "get_dashboard",
    "get_comprehensive_info",
    "get_full_overview",
    "generate_report",
  ];

  if (role === "staff") {
    return allTools.filter(
      (t) =>
        !adminOnlyTools.includes(t.name) &&
        !managerAndAboveTools.includes(t.name),
    );
  }
  if (role === "manager") {
    return allTools.filter((t) => !adminOnlyTools.includes(t.name));
  }
  return allTools;
};
