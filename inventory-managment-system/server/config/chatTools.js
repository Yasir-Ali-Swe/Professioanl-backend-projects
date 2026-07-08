// config/chatTools.js
export const chatTools = [
  {
    functionDeclarations: [
      {
        name: "query_products",
        description: `Get product data with ANY filter. 
          Supports: search by name/SKU, category, supplier, price range, stock status (all/in_stock/low_stock/out_of_stock), sorting, and limiting results.
          
          Examples:
          - "Show me electronics products"
          - "Products under $50"
          - "Low stock items"
          - "Search for Samsung TV"
          - "Products from ABC supplier"
          - "Cheapest products first"
          - "Top 10 most expensive items"
          - "Electronics with low stock"`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by name or SKU" },
            category: { type: "string", description: "Category name" },
            supplier: { type: "string", description: "Supplier name" },
            minPrice: { type: "number", description: "Minimum selling price" },
            maxPrice: { type: "number", description: "Maximum selling price" },
            stockStatus: {
              type: "string",
              enum: ["all", "in_stock", "low_stock", "out_of_stock"],
              description: "Filter by stock status",
            },
            sortBy: {
              type: "string",
              enum: ["name", "price", "stock", "sku"],
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default 20, max 100)",
            },
          },
        },
      },
      {
        name: "query_suppliers",
        description: `Get supplier data with ANY filter.
          Supports: search by name/contact/email, lead time range, sorting, and limiting results.
          
          Examples:
          - "Show me all suppliers"
          - "Suppliers with fast delivery"
          - "Find supplier ABC"
          - "Suppliers with lead time under 5 days"
          - "Suppliers sorted by name"`,
        parameters: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Search by name, contact person, or email",
            },
            minLeadTime: {
              type: "number",
              description: "Minimum lead time in days",
            },
            maxLeadTime: {
              type: "number",
              description: "Maximum lead time in days",
            },
            sortBy: {
              type: "string",
              enum: ["name", "leadTime"],
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
        },
      },
      {
        name: "query_sales",
        description: `Get sales and invoice data with ANY filter.
          Supports: date ranges (today/yesterday/this_week/last_week/this_month/last_month/this_year), customer search, amount range, status, sorting, and limiting results.
          
          Examples:
          - "Revenue this month"
          - "Sales from January 2024"
          - "Invoices from customer ABC"
          - "Unpaid invoices"
          - "Invoices over $1000"
          - "Best selling products"
          - "Customer purchase history"`,
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: [
                "today",
                "yesterday",
                "this_week",
                "last_week",
                "this_month",
                "last_month",
                "this_year",
              ],
              description: "Predefined date period",
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            customer: { type: "string", description: "Customer name" },
            minAmount: {
              type: "number",
              description: "Minimum invoice amount",
            },
            maxAmount: {
              type: "number",
              description: "Maximum invoice amount",
            },
            status: {
              type: "string",
              enum: ["paid", "unpaid", "void", "all"],
              description: "Invoice status",
            },
            includeProducts: {
              type: "boolean",
              description: "Include product details in response",
            },
            sortBy: {
              type: "string",
              enum: ["date", "amount", "customer"],
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
        },
      },
      {
        name: "query_orders",
        description: `Get purchase order data with ANY filter.
          Supports: status (pending/approved/rejected/fulfilled), supplier, date ranges, sorting, and limiting results.
          
          Examples:
          - "Show me pending orders"
          - "Purchase orders from Supplier X"
          - "Approved orders this month"
          - "Rejected purchase orders"
          - "Orders by date"`,
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected", "fulfilled", "all"],
              description: "Order status",
            },
            supplier: { type: "string", description: "Supplier name" },
            period: {
              type: "string",
              enum: ["today", "this_week", "this_month"],
              description: "Predefined date period",
            },
            startDate: {
              type: "string",
              description: "Start date (YYYY-MM-DD)",
            },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            sortBy: {
              type: "string",
              enum: ["date", "total"],
              description: "Field to sort by",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
        },
      },
      {
        name: "query_analytics",
        description: `Get analytics, forecasts, anomalies, and suggestions.
          Types:
          - forecast: Demand forecasts with stockout predictions
          - anomalies: Unresolved issues with severity levels
          - suggestions: AI-generated reorder suggestions
          - inventory_value: Total inventory valuation
          - customer_analytics: Customer purchase history
          
          Examples:
          - "When will Samsung TV run out?"
          - "Show me high severity anomalies"
          - "Reorder suggestions"
          - "Total inventory value"
          - "Customer purchase history for ABC"`,
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "forecast",
                "anomalies",
                "suggestions",
                "inventory_value",
                "customer_analytics",
              ],
              description: "Type of analytics to retrieve",
            },
            product: { type: "string", description: "Product name or SKU" },
            category: { type: "string", description: "Category name" },
            severity: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Anomaly severity level",
            },
            anomalyType: {
              type: "string",
              enum: [
                "dead_stock",
                "sales_spike",
                "suspicious_adjustment",
                "unusual_return",
              ],
              description: "Type of anomaly",
            },
            customer: {
              type: "string",
              description: "Customer name (for customer_analytics)",
            },
            forecastPeriod: {
              type: "string",
              enum: ["7_days", "30_days", "90_days"],
              description: "Forecast time period",
            },
            minConfidence: {
              type: "number",
              description: "Minimum confidence level (0-1)",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
          required: ["type"],
        },
      },
      {
        name: "query_team",
        description: `Get team member data with ANY filter.
          Supports: search by name/email, role, active status, and limiting results.
          
          Examples:
          - "Show me all team members"
          - "Find John in team"
          - "Show me admins"
          - "Active staff members"
          - "Search for user john@email.com"`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by name or email" },
            role: {
              type: "string",
              enum: ["admin", "manager", "staff", "all"],
              description: "User role filter",
            },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
            includeDetails: {
              type: "boolean",
              description: "Include detailed info and activity",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
        },
      },
      {
        name: "query_insights",
        description: `Get AI-generated business insights and summaries.
          Supports: weekly/monthly periods, latest or historical data.
          
          Examples:
          - "Show me weekly insights"
          - "Monthly business summary"
          - "Insight history"`,
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["weekly", "monthly"],
              description: "Insight period",
            },
            type: {
              type: "string",
              enum: ["latest", "history"],
              description: "Get latest or historical insights",
            },
            limit: {
              type: "number",
              description: "Number of historical records",
            },
          },
        },
      },
      {
        name: "get_dashboard",
        description: `Get a comprehensive dashboard summary with all key metrics.
          Supports: different time periods (today/this_week/this_month).
          
          Examples:
          - "Show me dashboard"
          - "Today's summary"
          - "Weekly dashboard"
          - "Monthly overview"`,
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "this_week", "this_month"],
              description: "Time period for the dashboard",
            },
          },
        },
      },
      {
        name: "get_comprehensive_info",
        description: `Get comprehensive information about a specific entity.
          Supports: products, suppliers, and customers with all related data.
          
          Examples:
          - "Tell me everything about Samsung TV"
          - "Comprehensive supplier info for ABC"
          - "Full customer details for John"`,
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the entity" },
            type: {
              type: "string",
              enum: ["product", "supplier", "customer"],
              description: "Type of entity",
            },
          },
          required: ["name", "type"],
        },
      },
    ],
  },
];
