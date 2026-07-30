// config/constants.js

export const CONSTANTS = {
  // Pagination limits
  MAX_PAGE_LIMIT: 100,
  DEFAULT_PAGE_LIMIT: 10,

  // Context cache TTL (10 minutes)
  CONTEXT_CACHE_TTL: 600,

  // System prompt token limit
  MAX_SYSTEM_PROMPT_TOKENS: 1500,

  // Array trimming for LLM
  MAX_ARRAY_ITEMS: 15,

  // Follow-up detection words (strictly referential pronouns and indicators)
  FOLLOW_UP_WORDS: [
    "those",
    "them",
    "these",
    "that",
    "they",
    "it",
    "its",
    "their",
    "this",
    "the same",
    "these ones",
    "the ones",
    "listed above",
    "previous result",
  ],

  // Summary keys (never trim these)
  SUMMARY_KEYS: new Set([
    "summary",
    "metrics",
    "kpis",
    "comparison",
    "trends",
    "purchases",
    "invoiceSummary",
    "forecastSummary",
    "categories",
    "suppliers",
    "topCustomers",
    "vendorPerformance",
    "customerMetrics",
    "abcAnalysis",
    "inventorySummary",
  ]),

  // Data extraction keys
  DATA_KEYS: [
    "lineItems",
    "productsList",
    "customerProductsPurchased",
    "products",
    "product",
    "suppliers",
    "supplier",
    "invoices",
    "invoice",
    "orders",
    "purchase_order",
    "forecasts",
    "forecast",
    "anomalies",
    "suggestions",
    "users",
    "user",
    "organizations",
    "organization",
    "category",
    "insights",
    "dashboard",
    "abcAnalysis",
    "deadStock",
    "groupedResults",
    "vendorPerformance",
    "customerMetrics",
    "transactions",
    "metrics",
    "summary",
    "inventorySummary",
  ],

  // Period mappings for date ranges
  PERIOD_MAP: {
    today: 1,
    yesterday: 2,
    this_week: 7,
    last_week: 14,
    this_month: 30,
    last_month: 60,
    this_year: 365,
    weekly: 7,
    monthly: 30,
  },

  // Status with emoji and label (FULL TEXT)
  STATUS: {
    in_stock: { emoji: "🟢", label: "In Stock", full: "🟢 In Stock" },
    low_stock: { emoji: "🟡", label: "Low Stock", full: "🟡 Low Stock" },
    out_of_stock: {
      emoji: "🔴",
      label: "Out of Stock",
      full: "🔴 Out of Stock",
    },
    dead_stock: { emoji: "⚫", label: "Dead Stock", full: "⚫ Dead Stock" },
  },

  // Anomaly severity with full text
  ANOMALY_SEVERITY: {
    low: { emoji: "🟡", label: "Low", full: "🟡 Low" },
    medium: { emoji: "🟠", label: "Medium", full: "🟠 Medium" },
    high: { emoji: "🔴", label: "Critical", full: "🔴 Critical" },
  },
};
