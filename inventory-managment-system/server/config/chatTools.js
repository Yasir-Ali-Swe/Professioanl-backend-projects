// config/chatTools.js
export const chatTools = [
  {
    functionDeclarations: [
      {
        name: "query_inventory",
        description: `Query products, categories, stock levels, valuation, cost/selling prices, profits, margins, reorder thresholds, and stock status (including dead stock items/products).
          Use this tool for listing, searching, or filtering products by dead stock (stockStatus: "dead_stock"), in stock, low stock, or out of stock.
          Supports search, price/margin filtering, date filtering (period: today/yesterday/this_week/last_week/this_month/last_month/this_year, or via startDate/endDate), stock status (all/in_stock/low_stock/out_of_stock/dead_stock), sorting, pagination, grouping (category/supplier/status), and filtering by creator.
          
          Examples:
          - "Show all products"
          - "Show me dead stock items / products"
          - "What products are low in stock?"
          - "Products added this week"
          - "Highest margin electronics"
          - "Valuation of products from supplier X"
          - "Show products with profit margin under 15%"
          - "Total inventory value grouped by category"
          - "Show products added by staff Ahmed Khan"`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by product name, SKU, or barcode" },
            category: { type: "string", description: "Filter by category name" },
            supplier: { type: "string", description: "Filter by supplier name" },
            stockStatus: {
              type: "string",
              enum: ["all", "in_stock", "low_stock", "out_of_stock", "dead_stock"],
              description: "Filter by stock status. Dead stock means products with quantity > 0 but no sales in the last 30 days.",
            },
            minPrice: { type: "number", description: "Minimum selling price" },
            maxPrice: { type: "number", description: "Maximum selling price" },
            minMargin: { type: "number", description: "Minimum profit margin (0.0 to 1.0)" },
            maxMargin: { type: "number", description: "Maximum profit margin (0.0 to 1.0)" },
            period: {
              type: "string",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year"],
              description: "Filter by when products were added (predefined date range)",
            },
            startDate: { type: "string", description: "Start date for product addition filter (YYYY-MM-DD)" },
            endDate: { type: "string", description: "End date for product addition filter (YYYY-MM-DD)" },
            creatorName: { type: "string", description: "Filter by the name of the staff member/user who created/added the products" },
            groupBy: {
              type: "string",
              enum: ["category", "supplier", "status"],
              description: "Group results and calculate aggregate statistics",
            },
            sortBy: {
              type: "string",
              enum: ["name", "sku", "quantity", "sellingPrice", "costPrice", "profit", "margin", "createdAt", "updatedAt"],
              description: "Field to sort by (includes calculated fields like profit and margin)",
            },
            sortOrder: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
            },
            limit: { type: "number", description: "Maximum number of results to return" },
            page: { type: "number", description: "Page number for pagination" },
          },
        },
      },
      {
        name: "query_purchases",
        description: `Query purchase orders, supplier performance, purchase costs, order lead times, and creator details.
          Supports status filtering (pending/approved/rejected/fulfilled/all), supplier filter, cost filtering, date range (today/yesterday/this_week/last_week/this_month/last_month/this_year, or via startDate/endDate), sorting, grouping by supplier/status, and filtering by creator name.
          
          Examples:
          - "Show all pending purchase orders"
          - "Total cost of orders this month"
          - "How is supplier X performing on lead times?"
          - "Orders from Supplier Y over $5000"
          - "Average PO lead time by supplier"
          - "Show purchase orders created by Ahmed Khan"`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by PO number or supplier name" },
            supplier: { type: "string", description: "Filter by supplier name" },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected", "fulfilled", "all"],
              description: "Filter by purchase order status",
            },
            minCost: { type: "number", description: "Minimum total cost" },
            maxCost: { type: "number", description: "Maximum total cost" },
            period: {
              type: "string",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year"],
              description: "Predefined date range for orders",
            },
            startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            creatorName: { type: "string", description: "Filter by the name of the staff member/user who created the purchase order" },
            groupBy: {
              type: "string",
              enum: ["supplier", "status"],
              description: "Group results to calculate vendor or status aggregates",
            },
            sortBy: {
              type: "string",
              enum: ["date", "totalCost", "leadTime"],
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
        description: `Query sales, invoices, customers, revenue, actual profits, and creator details.
          Supports invoice number or customer name search, status filter (paid/unpaid/void/all), amount filters, date ranges (today/yesterday/this_week/last_week/this_month/last_month/this_year, or via startDate/endDate), grouping (customer/status/daily/monthly), and filtering by creator name.
          
          Examples:
          - "Show total revenue today"
          - "List unpaid invoices"
          - "Top customers by total spent"
          - "Monthly sales chart data"
          - "Invoices created by Ahmed Khan"
          - "Invoices from yesterday"`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by invoice number or customer name" },
            customer: { type: "string", description: "Filter by specific customer name" },
            status: {
              type: "string",
              enum: ["paid", "unpaid", "void", "all"],
              description: "Filter by invoice status",
            },
            minAmount: { type: "number", description: "Minimum invoice amount" },
            maxAmount: { type: "number", description: "Maximum invoice amount" },
            period: {
              type: "string",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year"],
              description: "Predefined date range",
            },
            startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            creatorName: { type: "string", description: "Filter by the name of the staff member/user who created the invoice" },
            groupBy: {
              type: "string",
              enum: ["customer", "status", "daily", "monthly"],
              description: "Group results to calculate sales aggregates",
            },
            includeProducts: {
              type: "boolean",
              description: "Include a breakdown of products sold in the result",
            },
            sortBy: {
              type: "string",
              enum: ["date", "total", "customerName"],
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
        name: "query_organization",
        description: `Query organizations, users, team members, roles, permissions, and platform-wide or organization-wide metadata.
          For Super Admins, this allows platform-wide lookups. For Org Admins, it restricts details to their own organization's team members.
          
          Examples:
          - "Show all active users"
          - "List my team members"
          - "How many managers do we have?"
          - "Show all registered organizations in the system" (Super Admin)`,
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "Search by organization name, user name, or email" },
            role: {
              type: "string",
              enum: ["admin", "manager", "staff", "super_admin", "all"],
              description: "Filter by user role",
            },
            isActive: { type: "boolean", description: "Filter by active status" },
            sortBy: {
              type: "string",
              enum: ["name", "email", "createdAt"],
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
        name: "query_insights",
        description: `Retrieve high-level business dashboards (overall metrics, categories, profit actuals, top selling items), demand forecasts, stockout predictions, anomaly logs, AI reorder suggestions, ABC classification analysis, and historical insights.
          Note: For listing or searching dead stock items/products specifically, prefer query_inventory with stockStatus: "dead_stock".
          
          Examples:
          - "Give me a dashboard summary of my business"
          - "Show AI reorder suggestions"
          - "Which products are predicted to run out of stock?"
          - "Run an ABC classification analysis"
          - "Show recent high severity anomalies"
          - "Give me weekly insights history"`,
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["dashboard", "forecast", "anomalies", "suggestions", "abc_analysis", "dead_stock", "insights_history"],
              description: "Type of insights to retrieve (REQUIRED)",
            },
            period: {
              type: "string",
              enum: ["today", "this_week", "this_month", "last_month", "weekly", "monthly"],
              description: "Time period for dashboard or insights",
            },
            product: { type: "string", description: "Product name or SKU for forecast/anomaly lookup" },
            severity: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Filter anomalies by severity",
            },
            limit: { type: "number", description: "Maximum number of results" },
          },
          required: ["type"],
        },
      },
      {
        name: "get_details",
        description: `Get full, rich, all-in-one populated details, itemization, and cross-model relationships for a single business entity (Product, Supplier, Category, Invoice, Purchase Order, User/Staff, or Organization) by its name, SKU, PO/Invoice number, email, or database ID.
          
          Examples:
          - "Show me details of invoice INV-2026-0008"
          - "Give me full invoice information for INV-2026-0008"
          - "Which products are included in invoice INV-2026-0008?"
          - "Who created invoice INV-2026-0008?"
          - "Show items in purchase order PO-0001"
          - "Supplier profile for TechElectro Solutions"
          - "Category breakdown for Electronics"
          - "User performance profile for Ahmed Khan"
          - "Organization details and invoice settings"`,
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["product", "supplier", "category", "invoice", "purchase_order", "user", "organization"],
              description: "The entity type (REQUIRED)",
            },
            identifier: {
              type: "string",
              description: "Name, SKU, PO/Invoice number, email, or database ID of the entity (REQUIRED)",
            },
          },
          required: ["type", "identifier"],
        },
      },
      {
        name: "query_transactions",
        description: `Query inventory stock transactions or movements (stock logs).
          Supports filtering by product name/SKU, transaction type (in/out), reason (purchase/sale/adjustment/return/damage), staff/user who performed the transaction, date ranges, and sorting.
          
          Examples:
          - "Show recent stock adjustments"
          - "Transactions created by Ahmed Khan"
          - "Show stock logs for product Samsung TV"
          - "Stock movements in the last 7 days"`,
        parameters: {
          type: "object",
          properties: {
            product: { type: "string", description: "Filter by product name or SKU" },
            type: { type: "string", enum: ["in", "out", "all"], description: "Filter by transaction type" },
            reason: { type: "string", enum: ["purchase", "sale", "adjustment", "return", "damage", "all"], description: "Filter by reason" },
            creatorName: { type: "string", description: "Filter by the name of the staff member who performed the transaction" },
            period: {
              type: "string",
              enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year"],
              description: "Date range (predefined period)",
            },
            startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
            endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
            limit: { type: "number", description: "Maximum number of results" },
          },
        },
      },
    ],
  },
];
