// config/chatTools.js
export const chatTools = [
  {
    functionDeclarations: [
      {
        name: "get_products_by_category",
        description:
          "Get products filtered by category name, optionally only low stock ones",
        parameters: {
          type: "object",
          properties: {
            categoryName: { type: "string" },
            lowStockOnly: { type: "boolean" },
          },
          required: ["categoryName"],
        },
      },
      {
        name: "get_low_stock_products",
        description: "Get all products at or below their reorder threshold",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_product_stock",
        description:
          "Get current stock quantity and details for a specific product by name",
        parameters: {
          type: "object",
          properties: { productName: { type: "string" } },
          required: ["productName"],
        },
      },
      {
        name: "search_products",
        description: "Search products by name keyword",
        parameters: {
          type: "object",
          properties: { keyword: { type: "string" } },
          required: ["keyword"],
        },
      },
      {
        name: "get_out_of_stock_products",
        description: "Get products with zero quantity",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "list_categories",
        description: "Get list of all product categories",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_supplier_info",
        description: "Get supplier details by name",
        parameters: {
          type: "object",
          properties: { supplierName: { type: "string" } },
          required: ["supplierName"],
        },
      },
      {
        name: "list_suppliers",
        description: "Get list of all suppliers with lead times",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_stock_history",
        description: "Get recent stock movement history for a product",
        parameters: {
          type: "object",
          properties: {
            productName: { type: "string" },
            days: { type: "number" },
          },
          required: ["productName"],
        },
      },
      {
        name: "get_sales_summary",
        description: "Get total revenue and order count for a date range",
        parameters: {
          type: "object",
          properties: { days: { type: "number" } },
          required: ["days"],
        },
      },
      {
        name: "get_recent_invoices",
        description: "Get most recent invoices, optionally by status",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["paid", "unpaid", "void"] },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "get_top_selling_products",
        description: "Get best selling products in a date range",
        parameters: {
          type: "object",
          properties: { days: { type: "number" } },
          required: ["days"],
        },
      },
      {
        name: "get_pending_purchase_orders",
        description: "Get purchase orders awaiting approval",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_purchase_orders_by_status",
        description: "Get purchase orders filtered by status",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected", "fulfilled"],
            },
          },
          required: ["status"],
        },
      },
      {
        name: "get_demand_forecast",
        description: "Get the latest demand forecast for a product",
        parameters: {
          type: "object",
          properties: { productName: { type: "string" } },
          required: ["productName"],
        },
      },
      {
        name: "get_reorder_suggestions",
        description: "Get pending AI-generated reorder suggestions",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_unresolved_anomalies",
        description: "Get unresolved flagged anomalies",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "get_latest_insight_summary",
        description: "Get the latest AI-generated business summary",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["weekly", "monthly"] },
          },
        },
      },
      {
        name: "get_team_members",
        description: "Get list of team members in the organization",
        parameters: { type: "object", properties: {} },
      },
    ],
  },
];
