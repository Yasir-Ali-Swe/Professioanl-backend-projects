import Product from "../models/product.model.js";
import Invoice from "../models/invoice.model.js";
import Category from "../models/category.model.js";
import Supplier from "../models/supplier.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import Anomaly from "../models/anomaly.model.js";
import User from "../models/user.model.js";
import ReorderSuggestion from "../models/reorder.suggestion.model.js";
import StockLog from "../models/stockLog.model.js";
import DemandForecast from "../models/product.forcast.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const compositeToolsDeclaration = {
  name: "query_composite",
  description: `
Retrieve composite data and business intelligence across multiple models.

Use this tool whenever the user asks about:
- Business overview
- Dashboard summary
- KPI summary
- Company performance
- Executive dashboard
- Complete business report
- Inventory valuation
- Profit and loss
- Complete product details (SKU + supplier + category + sales + purchase + stock + forecast + reorder + anomalies)
- Complete supplier profile
- Complete category performance
- Cross-module business questions
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "dashboard_summary",
          "business_overview",
          "inventory_valuation",
          "profit_loss",
          "complete_sku_info",
          "complete_supplier_profile",
          "complete_category_performance",
          "business_health_check",
        ],
      },
      sku: {
        type: "string",
        description: "SKU for complete product info.",
      },
      productId: {
        type: "string",
        description: "Product ID for complete info.",
      },
      supplierId: {
        type: "string",
        description: "Supplier ID for complete profile.",
      },
      supplierName: {
        type: "string",
        description: "Supplier name for complete profile.",
      },
      categoryId: {
        type: "string",
        description: "Category ID for complete performance.",
      },
      categoryName: {
        type: "string",
        description: "Category name for complete performance.",
      },
      startDate: {
        type: "string",
        description: "Start date for filtering (ISO format).",
      },
      endDate: {
        type: "string",
        description: "End date for filtering (ISO format).",
      },
    },
    required: ["action"],
  },
};

export const compositeToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    sku,
    productId,
    supplierId,
    supplierName,
    categoryId,
    categoryName,
    startDate,
    endDate,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  switch (action) {
    case "dashboard_summary":
    case "business_overview": {
      const productCount = await Product.countDocuments(match);
      const activeProducts = await Product.countDocuments({
        ...match,
        isActive: true,
      });
      const lowStock = await Product.countDocuments({
        ...match,
        $expr: { $lte: ["$quantity", "$reorderThreshold"] },
      });
      const outOfStock = await Product.countDocuments({
        ...match,
        quantity: 0,
      });

      const inventoryValue = await Product.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          },
        },
      ]);

      const invoiceFilter = { ...match };
      if (Object.keys(dateFilter).length > 0) {
        invoiceFilter.createdAt = dateFilter;
      }

      const revenue = await Invoice.aggregate([
        { $match: { ...invoiceFilter, status: "paid" } },
        {
          $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } },
        },
      ]);

      const unpaid = await Invoice.aggregate([
        { $match: { ...invoiceFilter, status: "unpaid" } },
        {
          $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } },
        },
      ]);

      const poFilter = { ...match };
      if (Object.keys(dateFilter).length > 0) {
        poFilter.createdAt = dateFilter;
      }

      const pendingPOs = await PurchaseOrder.countDocuments({
        ...poFilter,
        status: "pending",
      });

      const unresolvedAnomalies = await Anomaly.countDocuments({
        ...match,
        isResolved: false,
      });

      const pendingReorder = await ReorderSuggestion.countDocuments({
        ...match,
        status: "pending",
      });

      const userCount = await User.countDocuments(match);

      return sanitizeForModel({
        summary: {
          products: {
            total: productCount,
            active: activeProducts,
            lowStock,
            outOfStock,
            inventoryValue: inventoryValue[0]?.total || 0,
          },
          sales: {
            revenue: revenue[0]?.total || 0,
            orders: revenue[0]?.count || 0,
            unpaid: unpaid[0]?.total || 0,
            unpaidOrders: unpaid[0]?.count || 0,
          },
          operations: {
            pendingPOs,
            pendingReorder,
            unresolvedAnomalies,
          },
          users: userCount,
        },
        dateRange: { startDate, endDate },
      });
    }

    case "inventory_valuation": {
      const total = await Product.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
          },
        },
      ]);

      const byCategory = await Product.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $group: {
            _id: "$categoryId",
            categoryName: { $first: "$category.name" },
            value: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
      ]);

      const bySupplier = await Product.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "suppliers",
            localField: "supplierId",
            foreignField: "_id",
            as: "supplier",
          },
        },
        { $unwind: "$supplier" },
        {
          $group: {
            _id: "$supplierId",
            supplierName: { $first: "$supplier.name" },
            value: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { value: -1 } },
      ]);

      return sanitizeForModel({
        totalValue: total[0]?.total || 0,
        byCategory,
        bySupplier,
        totalProducts: await Product.countDocuments(match),
      });
    }

    case "profit_loss": {
      const invoiceFilter = { ...match, status: "paid" };
      if (Object.keys(dateFilter).length > 0) {
        invoiceFilter.createdAt = dateFilter;
      }

      const revenue = await Invoice.aggregate([
        { $match: invoiceFilter },
        {
          $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } },
        },
      ]);

      const invoices = await Invoice.find(invoiceFilter)
        .select("products")
        .lean();

      let totalCOGS = 0;
      let totalItems = 0;

      for (const invoice of invoices) {
        for (const item of invoice.products) {
          const product = await Product.findById(item.productId)
            .select("costPrice")
            .lean();
          if (product) {
            totalCOGS += product.costPrice * item.quantity;
            totalItems++;
          }
        }
      }

      const totalRevenue = revenue[0]?.total || 0;
      const grossProfit = totalRevenue - totalCOGS;
      const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return sanitizeForModel({
        revenue: totalRevenue,
        cogs: totalCOGS,
        grossProfit,
        margin: Math.round(margin * 100) / 100,
        orderCount: revenue[0]?.count || 0,
        itemCount: totalItems,
        dateRange: { startDate, endDate },
      });
    }

    case "complete_sku_info": {
      if (!sku && !productId) {
        return { error: "sku or productId required" };
      }

      const productMatch = { ...match };
      if (sku) productMatch.sku = sku;
      else if (productId) productMatch._id = productId;

      const product = await Product.findOne(productMatch).lean();
      if (!product) return { found: false, message: "Product not found" };

      const [
        category,
        supplier,
        stockLogs,
        invoices,
        purchaseOrders,
        reorderSuggestions,
        demandForecasts,
        anomalies,
      ] = await Promise.all([
        Category.findById(product.categoryId).select("name").lean(),
        Supplier.findById(product.supplierId)
          .select("name contactPerson email phone leadTimeDays")
          .lean(),
        StockLog.find({ productId: product._id })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        Invoice.find({ "products.productId": product._id })
          .select("invoiceNumber customerName total status createdAt")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        PurchaseOrder.find({ "items.productId": product._id })
          .select("poNumber supplierId totalCost status createdAt")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        ReorderSuggestion.find({ productId: product._id })
          .sort({ createdAt: -1 })
          .lean(),
        DemandForecast.find({ productId: product._id })
          .sort({ createdAt: -1 })
          .lean(),
        Anomaly.find({ productId: product._id }).sort({ createdAt: -1 }).lean(),
      ]);

      const totalSales = stockLogs
        .filter((log) => log.type === "out")
        .reduce((sum, log) => sum + log.quantity, 0);

      const totalPurchases = stockLogs
        .filter((log) => log.type === "in")
        .reduce((sum, log) => sum + log.quantity, 0);

      const revenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

      return sanitizeForModel({
        product: {
          ...product,
          categoryName: category?.name || null,
          supplierName: supplier?.name || null,
          profitMargin:
            product.sellingPrice > 0
              ? (
                  ((product.sellingPrice - product.costPrice) /
                    product.sellingPrice) *
                  100
                ).toFixed(2)
              : 0,
          stockValue: product.quantity * product.costPrice,
          lowStock: product.quantity <= product.reorderThreshold,
        },
        supplier,
        category,
        stockLogs: stockLogs.slice(0, 20),
        invoices: invoices.slice(0, 10),
        purchaseOrders: purchaseOrders.slice(0, 10),
        reorderSuggestions,
        demandForecasts,
        anomalies,
        metrics: {
          totalSales,
          totalPurchases,
          totalRevenue: revenue,
          netMovement: totalPurchases - totalSales,
        },
      });
    }

    case "complete_supplier_profile": {
      if (!supplierId && !supplierName) {
        return { error: "supplierId or supplierName required" };
      }

      const supplierMatch = { ...match };
      if (supplierId) supplierMatch._id = supplierId;
      else if (supplierName)
        supplierMatch.name = { $regex: supplierName, $options: "i" };

      const supplier = await Supplier.findOne(supplierMatch).lean();
      if (!supplier) return { found: false, message: "Supplier not found" };

      const [products, purchaseOrders, productStats] = await Promise.all([
        Product.find({
          organizationId: supplier.organizationId,
          supplierId: supplier._id,
        })
          .select("name sku quantity sellingPrice costPrice isActive")
          .limit(50)
          .lean(),
        PurchaseOrder.find({
          organizationId: supplier.organizationId,
          supplierId: supplier._id,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        Product.aggregate([
          {
            $match: {
              organizationId: supplier.organizationId,
              supplierId: supplier._id,
            },
          },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
              avgPrice: { $avg: "$sellingPrice" },
              totalQuantity: { $sum: "$quantity" },
            },
          },
        ]),
      ]);

      const totalPOValue = purchaseOrders.reduce(
        (sum, po) => sum + (po.totalCost || 0),
        0,
      );
      const poByStatus = {
        pending: purchaseOrders.filter((po) => po.status === "pending").length,
        approved: purchaseOrders.filter((po) => po.status === "approved")
          .length,
        fulfilled: purchaseOrders.filter((po) => po.status === "fulfilled")
          .length,
        rejected: purchaseOrders.filter((po) => po.status === "rejected")
          .length,
      };

      return sanitizeForModel({
        supplier,
        products: products.slice(0, 20),
        productStats: productStats[0] || {
          totalProducts: 0,
          totalValue: 0,
          avgPrice: 0,
          totalQuantity: 0,
        },
        purchaseOrders: purchaseOrders.slice(0, 20),
        purchaseOrderStats: {
          totalPOValue,
          poCount: purchaseOrders.length,
          byStatus: poByStatus,
        },
        performance: {
          avgLeadTime: supplier.leadTimeDays || null,
          fulfillmentRate:
            purchaseOrders.length > 0
              ? ((poByStatus.fulfilled / purchaseOrders.length) * 100).toFixed(
                  1,
                )
              : 0,
        },
      });
    }

    case "complete_category_performance": {
      if (!categoryId && !categoryName) {
        return { error: "categoryId or categoryName required" };
      }

      const categoryMatch = { ...match };
      if (categoryId) categoryMatch._id = categoryId;
      else if (categoryName)
        categoryMatch.name = { $regex: categoryName, $options: "i" };

      const category = await Category.findOne(categoryMatch).lean();
      if (!category) return { found: false, message: "Category not found" };

      const products = await Product.find({
        organizationId: category.organizationId,
        categoryId: category._id,
      }).lean();

      const productStats = {
        total: products.length,
        active: products.filter((p) => p.isActive).length,
        inactive: products.filter((p) => !p.isActive).length,
        totalValue: products.reduce(
          (sum, p) => sum + p.quantity * p.costPrice,
          0,
        ),
        totalRevenue: products.reduce(
          (sum, p) => sum + p.quantity * p.sellingPrice,
          0,
        ),
        avgPrice:
          products.length > 0
            ? products.reduce((sum, p) => sum + p.sellingPrice, 0) /
              products.length
            : 0,
        lowStock: products.filter((p) => p.quantity <= p.reorderThreshold)
          .length,
        outOfStock: products.filter((p) => p.quantity === 0).length,
      };

      const topProducts = products
        .sort(
          (a, b) => b.quantity * b.sellingPrice - a.quantity * a.sellingPrice,
        )
        .slice(0, 10)
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          quantity: p.quantity,
          sellingPrice: p.sellingPrice,
          revenue: p.quantity * p.sellingPrice,
        }));

      return sanitizeForModel({
        category,
        productStats,
        topProducts,
        products: products.slice(0, 20),
      });
    }

    case "business_health_check": {
      const [
        productCount,
        lowStock,
        outOfStock,
        activeProducts,
        invoices,
        unpaidInvoices,
        pendingPOs,
        unresolvedAnomalies,
        pendingReorder,
      ] = await Promise.all([
        Product.countDocuments(match),
        Product.countDocuments({
          ...match,
          $expr: { $lte: ["$quantity", "$reorderThreshold"] },
        }),
        Product.countDocuments({ ...match, quantity: 0 }),
        Product.countDocuments({ ...match, isActive: true }),
        Invoice.countDocuments(match),
        Invoice.countDocuments({ ...match, status: "unpaid" }),
        PurchaseOrder.countDocuments({ ...match, status: "pending" }),
        Anomaly.countDocuments({ ...match, isResolved: false }),
        ReorderSuggestion.countDocuments({ ...match, status: "pending" }),
      ]);

      const healthScore = {
        inventory: {
          score:
            productCount > 0
              ? (((productCount - lowStock) / productCount) * 100).toFixed(1)
              : 0,
          status: lowStock < productCount * 0.2 ? "Good" : "Warning",
        },
        operations: {
          score: pendingPOs === 0 && pendingReorder === 0 ? 100 : 80,
          status:
            pendingPOs === 0 && pendingReorder === 0
              ? "Good"
              : "Attention Needed",
        },
        financial: {
          score: unpaidInvoices === 0 ? 100 : 70,
          status: unpaidInvoices === 0 ? "Good" : "Attention Needed",
        },
        anomalies: {
          score: unresolvedAnomalies === 0 ? 100 : 60,
          status: unresolvedAnomalies === 0 ? "Good" : "Action Required",
        },
      };

      const overallScore =
        (parseInt(healthScore.inventory.score) +
          healthScore.operations.score +
          healthScore.financial.score +
          healthScore.anomalies.score) /
        4;

      return sanitizeForModel({
        metrics: {
          products: productCount,
          lowStock,
          outOfStock,
          activeProducts,
          invoices,
          unpaidInvoices,
          pendingPOs,
          unresolvedAnomalies,
          pendingReorder,
        },
        health: {
          overall: Math.round(overallScore),
          status:
            overallScore >= 80
              ? "Healthy"
              : overallScore >= 60
                ? "Fair"
                : "Critical",
          categories: healthScore,
        },
        recommendations: [
          ...(lowStock > 0
            ? [`${lowStock} products are low on stock. Consider reordering.`]
            : []),
          ...(outOfStock > 0
            ? [
                `${outOfStock} products are out of stock. Immediate attention required.`,
              ]
            : []),
          ...(pendingPOs > 0
            ? [`${pendingPOs} purchase orders are pending approval.`]
            : []),
          ...(unresolvedAnomalies > 0
            ? [`${unresolvedAnomalies} unresolved anomalies detected.`]
            : []),
          ...(unpaidInvoices > 0
            ? [
                `${unpaidInvoices} invoices are unpaid. Follow up with customers.`,
              ]
            : []),
        ],
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
