import {
  productToolsDeclaration,
  productToolsHandler,
} from "./product.tools.js";
import {
  invoiceToolsDeclaration,
  invoiceToolsHandler,
} from "./invoice.tools.js";
import {
  supplierToolsDeclaration,
  supplierToolsHandler,
} from "./supplier.tools.js";
import {
  categoryToolsDeclaration,
  categoryToolsHandler,
} from "./category.tools.js";
import { userToolsDeclaration, userToolsHandler } from "./user.tools.js";
import {
  organizationToolsDeclaration,
  organizationToolsHandler,
} from "./organization.tools.js";
import {
  purchaseOrderToolsDeclaration,
  purchaseOrderToolsHandler,
} from "./purchaseOrder.tools.js";
import {
  stockLogToolsDeclaration,
  stockLogToolsHandler,
} from "./stockLog.tools.js";
import {
  reorderToolsDeclaration,
  reorderToolsHandler,
} from "./reorder.tools.js";
import {
  anomalyToolsDeclaration,
  anomalyToolsHandler,
} from "./anomaly.tools.js";
import {
  insightToolsDeclaration,
  insightToolsHandler,
} from "./insight.tools.js";
import {
  compositeToolsDeclaration,
  compositeToolsHandler,
} from "./composite.tools.js";
import {
  fallbackToolsDeclaration,
  fallbackToolsHandler,
} from "./fallback.tools.js";
import {
  conversationToolsDeclaration,
  conversationToolsHandler,
} from "./conversation.tools.js";

/**
 * Each tool entry now includes:
 * - declaration: Gemini function declaration
 * - handler: The function that executes the tool
 * - intentType: Explicit classification for intent detection
 *   Values: 'detail', 'list', 'compare', 'summary', 'mixed'
 * - actions: Per-action intent mapping for multi-action tools
 */
export const toolRegistry = {
  // ============ PRODUCT TOOLS ============
  query_products: {
    declaration: productToolsDeclaration,
    handler: productToolsHandler,
    intentType: "mixed",
    actions: {
      list_products: { intentType: "list" },
      product_details: { intentType: "detail" },
      sku_lookup: { intentType: "detail" },
      search_products: { intentType: "list" },
      inventory_summary: { intentType: "summary" },
      inventory_value: { intentType: "summary" },
      low_stock: { intentType: "list" },
      out_of_stock: { intentType: "list" },
      over_stock: { intentType: "list" },
      top_stock: { intentType: "list" },
      lowest_stock: { intentType: "list" },
      products_by_category: { intentType: "list" },
      products_by_supplier: { intentType: "list" },
      price_analysis: { intentType: "compare" },
      profit_margin: { intentType: "compare" },
      sales_history: { intentType: "detail" },
      purchase_history: { intentType: "detail" },
      stock_history: { intentType: "detail" },
      compare_products: { intentType: "compare" },
    },
  },

  // ============ INVOICE TOOLS ============
  query_invoices: {
    declaration: invoiceToolsDeclaration,
    handler: invoiceToolsHandler,
    intentType: "mixed",
    actions: {
      list_invoices: { intentType: "list" },
      search_invoices: { intentType: "list" },
      invoice_details: { intentType: "detail" },
      invoice_line_items: { intentType: "detail" },
      paid_invoices: { intentType: "list" },
      unpaid_invoices: { intentType: "list" },
      voided_invoices: { intentType: "list" },
      sales_summary: { intentType: "summary" },
      sales_trend: { intentType: "summary" },
      top_customers: { intentType: "list" },
      customer_purchases: { intentType: "detail" },
      customer_history: { intentType: "detail" },
    },
  },

  // ============ SUPPLIER TOOLS ============
  query_suppliers: {
    declaration: supplierToolsDeclaration,
    handler: supplierToolsHandler,
    intentType: "mixed",
    actions: {
      list_suppliers: { intentType: "list" },
      search_suppliers: { intentType: "list" },
      supplier_details: { intentType: "detail" },
      supplier_products: { intentType: "list" },
      supplier_performance: { intentType: "summary" },
      supplier_purchase_orders: { intentType: "list" },
      top_suppliers: { intentType: "list" },
      supplier_lead_times: { intentType: "list" },
      compare_suppliers: { intentType: "compare" },
    },
  },

  // ============ CATEGORY TOOLS ============
  query_categories: {
    declaration: categoryToolsDeclaration,
    handler: categoryToolsHandler,
    intentType: "mixed",
    actions: {
      list_categories: { intentType: "list" },
      category_details: { intentType: "detail" },
      category_products: { intentType: "list" },
      category_performance: { intentType: "summary" },
      category_breakdown: { intentType: "summary" },
      compare_categories: { intentType: "compare" },
      top_category: { intentType: "list" },
      lowest_category: { intentType: "list" },
    },
  },

  // ============ USER TOOLS ============
  query_users: {
    declaration: userToolsDeclaration,
    handler: userToolsHandler,
    intentType: "mixed",
    actions: {
      list_users: { intentType: "list" },
      search_users: { intentType: "list" },
      user_details: { intentType: "detail" },
      active_users: { intentType: "list" },
      inactive_users: { intentType: "list" },
      verified_users: { intentType: "list" },
      users_by_role: { intentType: "list" },
      team_structure: { intentType: "list" },
      recent_users: { intentType: "list" },
      user_activity: { intentType: "detail" },
    },
  },

  // ============ ORGANIZATION TOOLS ============
  query_organization: {
    declaration: organizationToolsDeclaration,
    handler: organizationToolsHandler,
    intentType: "mixed",
    actions: {
      organization_basic_info: { intentType: 'detail' },
      organization_profile: { intentType: "detail" },
      organization_details: { intentType: "detail" },
      invoice_settings: { intentType: "detail" },
      organization_status: { intentType: "detail" },
      organization_users: { intentType: "list" },
      organization_analytics: { intentType: "summary" },
      organization_summary: { intentType: "summary" },
    },
  },

  // ============ PURCHASE ORDER TOOLS ============
  query_purchase_orders: {
    declaration: purchaseOrderToolsDeclaration,
    handler: purchaseOrderToolsHandler,
    intentType: "mixed",
    actions: {
      list_purchase_orders: { intentType: "list" },
      po_details: { intentType: "detail" },
      po_items: { intentType: "detail" },
      pending_pos: { intentType: "list" },
      approved_pos: { intentType: "list" },
      fulfilled_pos: { intentType: "list" },
      rejected_pos: { intentType: "list" },
      po_by_supplier: { intentType: "list" },
      po_analytics: { intentType: "summary" },
    },
  },

  // ============ STOCK LOG TOOLS ============
  query_stock_logs: {
    declaration: stockLogToolsDeclaration,
    handler: stockLogToolsHandler,
    intentType: "mixed",
    actions: {
      stock_history: { intentType: "detail" },
      stock_movement: { intentType: "list" },
      stock_in: { intentType: "list" },
      stock_out: { intentType: "list" },
      sales_movement: { intentType: "list" },
      purchase_movement: { intentType: "list" },
      return_history: { intentType: "list" },
      damage_history: { intentType: "list" },
      adjustment_history: { intentType: "list" },
      stock_timeline: { intentType: "detail" },
      recent_movements: { intentType: "list" },
      movement_summary: { intentType: "summary" },
    },
  },

  // ============ REORDER TOOLS ============
  query_reorder: {
    declaration: reorderToolsDeclaration,
    handler: reorderToolsHandler,
    intentType: "mixed",
    actions: {
      list_reorder_suggestions: { intentType: "list" },
      reorder_suggestion_details: { intentType: "detail" },
      pending_suggestions: { intentType: "list" },
      product_reorder_suggestion: { intentType: "detail" },
      list_forecasts: { intentType: "list" },
      forecast_details: { intentType: "detail" },
      product_forecast: { intentType: "detail" },
      stockout_prediction: { intentType: "list" },
      forecast_summary: { intentType: "summary" },
    },
  },

  // ============ ANOMALY TOOLS ============
  query_anomalies: {
    declaration: anomalyToolsDeclaration,
    handler: anomalyToolsHandler,
    intentType: "mixed",
    actions: {
      list_anomalies: { intentType: "list" },
      anomaly_details: { intentType: "detail" },
      unresolved_anomalies: { intentType: "list" },
      resolved_anomalies: { intentType: "list" },
      high_severity: { intentType: "list" },
      medium_severity: { intentType: "list" },
      low_severity: { intentType: "list" },
      anomalies_by_type: { intentType: "list" },
      product_anomalies: { intentType: "list" },
      anomaly_summary: { intentType: "summary" },
    },
  },

  // ============ INSIGHT TOOLS ============
  query_insights: {
    declaration: insightToolsDeclaration,
    handler: insightToolsHandler,
    intentType: "mixed",
    actions: {
      latest_insights: { intentType: "summary" },
      weekly_insights: { intentType: "summary" },
      monthly_insights: { intentType: "summary" },
      insights_by_period: { intentType: "summary" },
      insights_summary: { intentType: "summary" },
      top_product: { intentType: "detail" },
      declining_product: { intentType: "detail" },
    },
  },

  // ============ COMPOSITE TOOLS ============
  query_composite: {
    declaration: compositeToolsDeclaration,
    handler: compositeToolsHandler,
    intentType: "mixed",
    actions: {
      dashboard_summary: { intentType: "summary" },
      business_overview: { intentType: "summary" },
      inventory_valuation: { intentType: "summary" },
      profit_loss: { intentType: "summary" },
      complete_sku_info: { intentType: "detail" },
      complete_supplier_profile: { intentType: "detail" },
      complete_category_performance: { intentType: "detail" },
      business_health_check: { intentType: "summary" },
    },
  },

  // ============ FALLBACK TOOLS ============
  run_aggregation: {
    declaration: fallbackToolsDeclaration,
    handler: fallbackToolsHandler,
    intentType: "mixed",
  },

  // ============ CONVERSATION TOOLS ============
  get_conversation_history: {
    declaration: conversationToolsDeclaration,
    handler: conversationToolsHandler,
    intentType: "list",
  },
};

/**
 * Helper to get intent type for a tool + action combination
 */
export const getIntentType = (toolName, action) => {
  const entry = toolRegistry[toolName];
  if (!entry) return "mixed";

  if (entry.actions && entry.actions[action]) {
    return entry.actions[action].intentType;
  }

  return entry.intentType || "mixed";
};

/**
 * Helper to get action from tool call server-side
 * This is the critical function that ensures action is always derived
 * even when Gemini doesn't send it in the args.
 */
export const getActionFromCall = (call, result = null) => {
  // Priority 1: Result contains action
  if (result && result.action && typeof result.action === "string") {
    return result.action;
  }

  // Priority 2: Call args contain action
  if (call.args && call.args.action) {
    return call.args.action;
  }

  // Priority 3: Infer from tool name and args
  const toolName = call.name;
  const args = call.args || {};

  if (toolName === "query_products") {
    if (args.sku || args.productName) return "product_details";
    if (args.lowStock) return "low_stock";
    if (args.inventorySummary !== undefined) return "inventory_summary";
    if (args.stockStatus) {
      if (args.stockStatus === "low_stock") return "low_stock";
      if (args.stockStatus === "out_of_stock") return "out_of_stock";
      if (args.stockStatus === "over_stock") return "over_stock";
    }
    if (args.category) return "products_by_category";
    if (args.supplier) return "products_by_supplier";
    if (args.productNames && args.productNames.length > 0)
      return "compare_products";
    return "list_products";
  }

  if (toolName === "query_invoices") {
    if (args.invoiceId || args.invoiceNumber) return "invoice_details";
    if (args.status === "paid") return "paid_invoices";
    if (args.status === "unpaid") return "unpaid_invoices";
    if (args.status === "void") return "voided_invoices";
    if (args.customerName) return "customer_purchases";
    if (args.startDate || args.endDate) {
      if (args.groupBy) return "sales_trend";
      return "sales_summary";
    }
    if (args.sortBy === "total" && args.sortOrder === "desc")
      return "top_customers";
    return "list_invoices";
  }

  if (toolName === "query_suppliers") {
    if (args.supplierId || args.supplierName) return "supplier_details";
    if (args.searchTerm) return "search_suppliers";
    if (args.sortBy === "leadTimeDays") return "supplier_lead_times";
    return "list_suppliers";
  }

  if (toolName === "query_categories") {
    if (args.categoryId || args.categoryName) return "category_details";
    return "list_categories";
  }

  if (toolName === "query_users") {
    if (args.userId || args.email) return "user_details";
    if (args.role) return "users_by_role";
    if (args.isActive === true) return "active_users";
    if (args.isActive === false) return "inactive_users";
    if (args.isVerified === true) return "verified_users";
    if (args.sortBy === "createdAt" && args.sortOrder === "desc")
      return "recent_users";
    return "list_users";
  }

  if (toolName === "query_organization") {
    if (args.action === 'organization_basic_info' ||
      args.action === 'organization_profile' ||
      args.action === 'invoice_settings') {
      return args.action;
    }
    if (args.includeUsers) return "organization_users";
    if (args.includeAnalytics) return "organization_analytics";
    if (args.action === "invoice_settings") return "invoice_settings";
    if (args.action === "organization_status") return "organization_status";
    if (args.action === "organization_summary") return "organization_summary";
    return "organization_profile";
  }

  if (toolName === "query_purchase_orders") {
    if (args.poId || args.poNumber) return "po_details";
    if (args.status === "pending") return "pending_pos";
    if (args.status === "approved") return "approved_pos";
    if (args.status === "fulfilled") return "fulfilled_pos";
    if (args.status === "rejected") return "rejected_pos";
    if (args.supplierId || args.supplierName) return "po_by_supplier";
    return "list_purchase_orders";
  }

  if (toolName === "query_stock_logs") {
    if (args.productId || args.productSku || args.productName) {
      if (args.startDate || args.endDate) return "stock_timeline";
      return "stock_history";
    }
    if (args.type === "in") return "stock_in";
    if (args.type === "out") return "stock_out";
    if (args.reason === "sale") return "sales_movement";
    if (args.reason === "purchase") return "purchase_movement";
    if (args.reason === "return") return "return_history";
    if (args.reason === "damage") return "damage_history";
    if (args.reason === "adjustment") return "adjustment_history";
    return "stock_movement";
  }

  if (toolName === "query_reorder") {
    if (args.suggestionId) return "reorder_suggestion_details";
    if (args.productId || args.productSku || args.productName) {
      if (args.forecastPeriod) return "product_forecast";
      return "product_reorder_suggestion";
    }
    if (args.status === "pending") return "pending_suggestions";
    if (args.forecastPeriod) return "list_forecasts";
    return "list_reorder_suggestions";
  }

  if (toolName === "query_anomalies") {
    if (args.anomalyId) return "anomaly_details";
    if (args.type) return "anomalies_by_type";
    if (args.severity === "high") return "high_severity";
    if (args.severity === "medium") return "medium_severity";
    if (args.severity === "low") return "low_severity";
    if (args.isResolved === true) return "resolved_anomalies";
    if (args.isResolved === false) return "unresolved_anomalies";
    return "list_anomalies";
  }

  if (toolName === "query_insights") {
    if (args.period === "weekly") return "weekly_insights";
    if (args.period === "monthly") return "monthly_insights";
    return "latest_insights";
  }

  if (toolName === "query_composite") {
    if (args.sku || args.productId) return "complete_sku_info";
    if (args.supplierId || args.supplierName)
      return "complete_supplier_profile";
    if (args.categoryId || args.categoryName)
      return "complete_category_performance";
    if (args.action === "business_health_check") return "business_health_check";
    if (args.action === "profit_loss") return "profit_loss";
    if (args.action === "inventory_valuation") return "inventory_valuation";
    return "dashboard_summary";
  }

  // For unknown tools, return whatever action was in args or 'unknown'
  return args.action || "unknown";
};

/**
 * Get all tool declarations for sending to Gemini.
 */
export const getToolDeclarations = () => {
  return Object.values(toolRegistry).map((entry) => entry.declaration);
};

/**
 * Get a tool handler by name.
 */
export const getToolHandler = (name) => {
  const entry = toolRegistry[name];
  return entry ? entry.handler : null;
};
