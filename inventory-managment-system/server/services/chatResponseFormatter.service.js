// services/chatResponseFormatter.service.js

/**
 * Standardized Response Formatter for StockPilot AI Chatbot.
 * Ensures the backend fully owns column definitions, row formatting,
 * flattens all nested object fields into primitive values, and produces
 * a consistent response structure.
 */

export const FORMAT_TYPES = {
  CURRENCY: "currency",
  PERCENTAGE: "percentage",
  DATE: "date",
  BOOLEAN: "boolean",
  TEXT: "text",
  NUMBER: "number",
};

/**
 * Pre-defined column definitions per entity/intent.
 */
export const COLUMN_DEFINITIONS = {
  products_compact: [
    { key: "productName", label: "Product Name", type: "string" },
    { key: "sku", label: "SKU", type: "string" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "sellingPrice", label: "Selling Price", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "status", label: "Status", type: "string", align: "center" },
  ],
  products_detailed: [
    { key: "productName", label: "Product Name", type: "string" },
    { key: "sku", label: "SKU", type: "string" },
    { key: "categoryName", label: "Category", type: "string" },
    { key: "supplierName", label: "Supplier", type: "string" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "reorderThreshold", label: "Reorder Threshold", type: "number" },
    { key: "costPrice", label: "Cost Price", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "sellingPrice", label: "Selling Price", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "margin", label: "Profit Margin", type: "number", format: FORMAT_TYPES.PERCENTAGE },
    { key: "status", label: "Status", type: "string", align: "center" },
  ],
  invoices_compact: [
    { key: "invoiceNumber", label: "Invoice #", type: "string" },
    { key: "customerName", label: "Customer Name", type: "string" },
    { key: "date", label: "Date", type: "string", format: FORMAT_TYPES.DATE },
    { key: "total", label: "Total Amount", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "status", label: "Status", type: "string", align: "center" },
  ],
  invoices_detailed: [
    { key: "invoiceNumber", label: "Invoice #", type: "string" },
    { key: "customerName", label: "Customer Name", type: "string" },
    { key: "date", label: "Date", type: "string", format: FORMAT_TYPES.DATE },
    { key: "subtotal", label: "Subtotal", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "tax", label: "Tax", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "discount", label: "Discount", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "total", label: "Total Amount", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "status", label: "Status", type: "string", align: "center" },
    { key: "createdBy", label: "Created By", type: "string" },
  ],
  invoice_items: [
    { key: "productName", label: "Product", type: "string" },
    { key: "sku", label: "SKU", type: "string" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "sellingPrice", label: "Unit Price", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "subtotal", label: "Subtotal", type: "number", format: FORMAT_TYPES.CURRENCY },
  ],
  purchase_orders_compact: [
    { key: "poNumber", label: "PO #", type: "string" },
    { key: "supplierName", label: "Supplier", type: "string" },
    { key: "date", label: "Date", type: "string", format: FORMAT_TYPES.DATE },
    { key: "totalCost", label: "Total Cost", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "status", label: "Status", type: "string", align: "center" },
  ],
  purchase_order_items: [
    { key: "productName", label: "Product", type: "string" },
    { key: "sku", label: "SKU", type: "string" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "unitCost", label: "Unit Cost", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "subtotal", label: "Subtotal", type: "number", format: FORMAT_TYPES.CURRENCY },
  ],
  suppliers_compact: [
    { key: "supplierName", label: "Supplier Name", type: "string" },
    { key: "contactPerson", label: "Contact Person", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "leadTimeDays", label: "Lead Time (Days)", type: "number" },
  ],
  categories_compact: [
    { key: "categoryName", label: "Category Name", type: "string" },
    { key: "productCount", label: "Total Products", type: "number" },
    { key: "createdAt", label: "Created Date", type: "string", format: FORMAT_TYPES.DATE },
  ],
  users_compact: [
    { key: "userName", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "role", label: "Role", type: "string" },
    { key: "status", label: "Active Status", type: "string", align: "center" },
  ],
  anomalies_compact: [
    { key: "severity", label: "Severity", type: "string", align: "center" },
    { key: "type", label: "Anomaly Type", type: "string" },
    { key: "productName", label: "Product", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "status", label: "Resolution Status", type: "string", align: "center" },
    { key: "date", label: "Detected Date", type: "string", format: FORMAT_TYPES.DATE },
  ],
  forecast_compact: [
    { key: "productName", label: "Product", type: "string" },
    { key: "predictedDemand", label: "Predicted Demand", type: "number" },
    { key: "forecastPeriod", label: "Period", type: "string" },
    { key: "daysUntilStockout", label: "Days To Stockout", type: "number" },
    { key: "confidence", label: "Confidence Score", type: "number", format: FORMAT_TYPES.PERCENTAGE },
  ],
  reorder_suggestions: [
    { key: "productName", label: "Product", type: "string" },
    { key: "suggestedQuantity", label: "Suggested Qty", type: "number" },
    { key: "suggestedReorderDate", label: "Reorder Date", type: "string", format: FORMAT_TYPES.DATE },
    { key: "reasoning", label: "Reasoning", type: "string" },
    { key: "status", label: "Status", type: "string", align: "center" },
  ],
  grouped_summary: [
    { key: "groupName", label: "Group / Entity", type: "string" },
    { key: "totalCount", label: "Total Count / Items", type: "number" },
    { key: "totalValue", label: "Total Value / Revenue", type: "number", format: FORMAT_TYPES.CURRENCY },
  ],
};

/**
 * Format a value to primitive clean value for frontend consumption.
 */
export const formatPrimitiveValue = (val, formatType) => {
  if (val === null || val === undefined) return "—";

  if (formatType === FORMAT_TYPES.CURRENCY) {
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return "PKR 0.00";
    return `PKR ${num.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (formatType === FORMAT_TYPES.PERCENTAGE) {
    const num = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(num)) return "0%";
    const pct = num > 1 ? num : num * 100;
    return `${Math.round(pct)}%`;
  }

  if (formatType === FORMAT_TYPES.DATE) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  if (typeof val === "object" && !(val instanceof Date)) {
    if (val.name) return val.name;
    if (val.invoiceNumber) return val.invoiceNumber;
    if (val.poNumber) return val.poNumber;
    return JSON.stringify(val);
  }

  return val;
};

/**
 * Ensures rows only contain primitive scalar properties corresponding to columns.
 */
export const buildFlatTable = (columns, rawRows = []) => {
  if (!Array.isArray(rawRows)) rawRows = [];

  const rows = rawRows.map((rawRow) => {
    const flatRow = {};
    columns.forEach((col) => {
      let rawVal = rawRow[col.key];

      // Handle nested access fallbacks if rawRow has populated objects
      if (rawVal === undefined) {
        if (col.key === "productName") rawVal = rawRow.name || rawRow.product?.name;
        else if (col.key === "categoryName") rawVal = rawRow.category?.name || rawRow.categoryId?.name;
        else if (col.key === "supplierName") rawVal = rawRow.supplier?.name || rawRow.supplierId?.name;
        else if (col.key === "createdBy") rawVal = rawRow.creator?.name || rawRow.createdBy?.name;
        else if (col.key === "userName") rawVal = rawRow.name;
        else if (col.key === "date") rawVal = rawRow.createdAt;
      }

      flatRow[col.key] = formatPrimitiveValue(rawVal, col.format);
    });
    return flatRow;
  });

  return {
    columns: columns.map((col) => ({
      key: col.key,
      label: col.label,
      type: col.type || "string",
      align: col.align || (col.format === FORMAT_TYPES.CURRENCY || col.type === "number" ? "right" : "left"),
      format: col.format,
    })),
    rows,
  };
};

/**
 * Builds the canonical unified backend response JSON structure.
 */
export const buildStandardResponse = ({
  responseType = "list", // 'simple' | 'list' | 'detail' | 'analytical'
  summaryText = "",
  tableColumns = [],
  tableRows = [],
  insights = [],
  recommendations = [],
  suggestedQuestions = [],
  metadata = {},
}) => {
  // Simple queries must never have tables, insights, recommendations, or suggested questions
  if (responseType === "simple") {
    return {
      responseType: "simple",
      summaryText,
      table: { columns: [], rows: [] },
      insights: [],
      recommendations: [],
      suggestedQuestions: [],
      metadata,
    };
  }

  const table = buildFlatTable(tableColumns, tableRows);

  return {
    responseType,
    summaryText,
    table,
    insights: Array.isArray(insights) ? insights : [],
    recommendations: Array.isArray(recommendations) ? recommendations : [],
    suggestedQuestions: Array.isArray(suggestedQuestions) ? suggestedQuestions : [],
    metadata,
  };
};
