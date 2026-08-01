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

export const toolRegistry = {
  query_products: {
    declaration: productToolsDeclaration,
    handler: productToolsHandler,
  },
  query_invoices: {
    declaration: invoiceToolsDeclaration,
    handler: invoiceToolsHandler,
  },
  query_suppliers: {
    declaration: supplierToolsDeclaration,
    handler: supplierToolsHandler,
  },
  query_categories: {
    declaration: categoryToolsDeclaration,
    handler: categoryToolsHandler,
  },
  query_users: {
    declaration: userToolsDeclaration,
    handler: userToolsHandler,
  },
  query_organization: {
    declaration: organizationToolsDeclaration,
    handler: organizationToolsHandler,
  },
  query_purchase_orders: {
    declaration: purchaseOrderToolsDeclaration,
    handler: purchaseOrderToolsHandler,
  },
  query_stock_logs: {
    declaration: stockLogToolsDeclaration,
    handler: stockLogToolsHandler,
  },
  query_reorder: {
    declaration: reorderToolsDeclaration,
    handler: reorderToolsHandler,
  },
  query_anomalies: {
    declaration: anomalyToolsDeclaration,
    handler: anomalyToolsHandler,
  },
  query_insights: {
    declaration: insightToolsDeclaration,
    handler: insightToolsHandler,
  },
  query_composite: {
    declaration: compositeToolsDeclaration,
    handler: compositeToolsHandler,
  },
  run_aggregation: {
    declaration: fallbackToolsDeclaration,
    handler: fallbackToolsHandler,
  },
  get_conversation_history: {
    declaration: conversationToolsDeclaration,
    handler: conversationToolsHandler,
  },
};

export const getToolDeclarations = () => {
  return Object.values(toolRegistry).map((entry) => entry.declaration);
};

export const getToolHandler = (name) => {
  const entry = toolRegistry[name];
  return entry ? entry.handler : null;
};
