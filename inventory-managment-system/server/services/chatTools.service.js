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

export const executeTool = async (toolName, args, organizationId) => {
  switch (toolName) {
    case "get_products_by_category": {
      const category = await categoryModel.findOne({
        organizationId,
        name: new RegExp(args.categoryName, "i"),
      });
      if (!category) return { message: "Category not found" };
      const filter = {
        organizationId,
        categoryId: category._id,
        isActive: true,
      };
      if (args.lowStockOnly) {
        filter.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
      }
      const products = await productModel
        .find(filter)
        .select("name sku quantity sellingPrice imageUrl");
      return { products };
    }
    case "get_low_stock_products": {
      const products = await productModel
        .find({
          organizationId,
          isActive: true,
          $expr: { $lte: ["$quantity", "$reorderThreshold"] },
        })
        .select("name sku quantity sellingPrice imageUrl");
      return { products };
    }
    case "get_product_stock": {
      const product = await productModel
        .findOne({
          organizationId,
          name: new RegExp(args.productName, "i"),
        })
        .select("name sku quantity sellingPrice imageUrl");
      if (!product) return { message: "Product not found" };
      return { product };
    }
    case "search_products": {
      const products = await productModel
        .find({
          organizationId,
          isActive: true,
          name: new RegExp(args.keyword, "i"),
        })
        .select("name sku quantity sellingPrice imageUrl");
      return { products };
    }
    case "get_out_of_stock_products": {
      const products = await productModel
        .find({ organizationId, isActive: true, quantity: 0 })
        .select("name sku imageUrl");
      return { products };
    }
    case "list_categories": {
      const categories = await categoryModel
        .find({ organizationId })
        .select("name");
      return { categories };
    }
    case "get_supplier_info": {
      const supplier = await supplierModel.findOne({
        organizationId,
        name: new RegExp(args.supplierName, "i"),
      });
      if (!supplier) return { message: "Supplier not found" };
      return { supplier };
    }
    case "list_suppliers": {
      const suppliers = await supplierModel
        .find({ organizationId })
        .select("name contactPerson leadTimeDays");
      return { suppliers };
    }
    case "get_stock_history": {
      const product = await productModel.findOne({
        organizationId,
        name: new RegExp(args.productName, "i"),
      });
      if (!product) return { message: "Product not found" };
      const since = new Date(
        Date.now() - (args.days || 30) * 24 * 60 * 60 * 1000,
      );
      const logs = await stockLogModel
        .find({
          organizationId,
          productId: product._id,
          createdAt: { $gte: since },
        })
        .populate("performedBy", "name")
        .sort({ createdAt: -1 });
      return { productName: product.name, logs };
    }
    case "get_sales_summary": {
      const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
      const invoices = await invoiceModel.find({
        organizationId,
        status: "paid",
        createdAt: { $gte: since },
      });
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
      return { totalRevenue, totalOrders: invoices.length, days: args.days };
    }
    case "get_recent_invoices": {
      const filter = { organizationId };
      if (args.status) filter.status = args.status;
      const invoices = await invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(args.limit || 10)
        .select("invoiceNumber customerName total status createdAt");
      return { invoices };
    }
    case "get_top_selling_products": {
      const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
      const invoices = await invoiceModel.find({
        organizationId,
        status: "paid",
        createdAt: { $gte: since },
      });
      const tally = {};
      invoices.forEach((inv) =>
        inv.products.forEach((p) => {
          tally[p.productId] = (tally[p.productId] || 0) + p.quantity;
        }),
      );
      const sorted = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const products = await Promise.all(
        sorted.map(async ([id, qty]) => {
          const p = await productModel.findById(id).select("name imageUrl");
          return { name: p?.name, imageUrl: p?.imageUrl, unitsSold: qty };
        }),
      );
      return { products };
    }
    case "get_pending_purchase_orders": {
      const orders = await purchaseOrderModel
        .find({ organizationId, status: "pending" })
        .populate("supplierId", "name");
      return { orders };
    }
    case "get_purchase_orders_by_status": {
      const orders = await purchaseOrderModel
        .find({ organizationId, status: args.status })
        .populate("supplierId", "name");
      return { orders };
    }
    case "get_demand_forecast": {
      const product = await productModel.findOne({
        organizationId,
        name: new RegExp(args.productName, "i"),
      });
      if (!product) return { message: "Product not found" };
      const forecast = await demandForecastModel
        .findOne({ organizationId, productId: product._id })
        .sort({ createdAt: -1 });
      if (!forecast)
        return { message: "No forecast available yet for this product" };
      return { productName: product.name, forecast };
    }
    case "get_reorder_suggestions": {
      const suggestions = await reorderSuggestionModel
        .find({ organizationId, status: "pending" })
        .populate("productId", "name imageUrl");
      return { suggestions };
    }
    case "get_unresolved_anomalies": {
      const anomalies = await anomalyModel
        .find({ organizationId, isResolved: false })
        .populate("productId", "name imageUrl");
      return { anomalies };
    }
    case "get_latest_insight_summary": {
      const insight = await aiInsightsModel
        .findOne({ organizationId, period: args.period || "weekly" })
        .sort({ createdAt: -1 });
      if (!insight) return { message: "No insights generated yet" };
      return { insight };
    }
    case "get_team_members": {
      const users = await userModel
        .find({ organizationId })
        .select("name email role isActive");
      return { users };
    }
    default:
      return { message: "Unknown request" };
  }
};

export const getResponseType = (toolName) => {
  const productListTools = [
    "get_products_by_category",
    "get_low_stock_products",
    "search_products",
    "get_out_of_stock_products",
    "get_top_selling_products",
  ];
  const singleProductTools = ["get_product_stock"];
  const tableTools = [
    "get_pending_purchase_orders",
    "get_purchase_orders_by_status",
    "get_recent_invoices",
    "list_suppliers",
    "get_team_members",
    "get_unresolved_anomalies",
    "get_reorder_suggestions",
    "get_stock_history",
  ];

  if (productListTools.includes(toolName)) return "product_list";
  if (singleProductTools.includes(toolName)) return "product_single";
  if (tableTools.includes(toolName)) return "table";
  return "text";
};

export const getToolsForRole = (allTools, role) => {
  const adminOnlyTools = ["get_team_members"];
  const managerAndAboveTools = [
    "get_sales_summary",
    "get_pending_purchase_orders",
    "get_purchase_orders_by_status",
    "get_demand_forecast",
    "get_reorder_suggestions",
    "get_unresolved_anomalies",
    "get_latest_insight_summary",
    "get_top_selling_products",
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
