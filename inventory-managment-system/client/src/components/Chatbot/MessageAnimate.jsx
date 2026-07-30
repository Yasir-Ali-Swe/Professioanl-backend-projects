// src/components/chatbot/MessageAnimate.jsx
import { useEffect, useRef, useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Loader2,
    PackageX,
} from "lucide-react"
import "highlight.js/styles/github-dark.css"

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN SCHEMAS & UTILS
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_SCHEMAS = {
    products_compact: [
        { key: "name", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "sellingPrice", label: "Selling Price", align: "right", format: "currency" },
        { key: "status", label: "Status", align: "center", format: "status" },
    ],
    products_detailed: [
        { key: "name", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "costPrice", label: "Cost Price", align: "right", format: "currency" },
        { key: "sellingPrice", label: "Selling Price", align: "right", format: "currency" },
        { key: "category", label: "Category", align: "left" },
        { key: "supplier", label: "Supplier", align: "left" },
        { key: "status", label: "Status", align: "center", format: "status" },
    ],
    purchases: [
        { key: "poNumber", label: "PO Number", align: "left" },
        { key: "supplier", label: "Supplier", align: "left" },
        { key: "itemsCount", label: "Items", align: "right" },
        { key: "totalCost", label: "Total Cost", align: "right", format: "currency" },
        { key: "status", label: "Status", align: "center", format: "status" },
        { key: "createdBy", label: "Created By", align: "left" },
        { key: "createdAt", label: "Date", align: "left", format: "date" },
    ],
    sales: [
        { key: "invoiceNumber", label: "Invoice #", align: "left" },
        { key: "customerName", label: "Customer", align: "left" },
        { key: "subtotal", label: "Subtotal", align: "right", format: "currency" },
        { key: "tax", label: "Tax", align: "right", format: "currency" },
        { key: "total", label: "Total", align: "right", format: "currency" },
        { key: "status", label: "Status", align: "center", format: "status" },
        { key: "createdBy", label: "Created By", align: "left" },
        { key: "createdAt", label: "Date", align: "left", format: "date" },
    ],
    transactions: [
        { key: "productName", label: "Product", align: "left" },
        { key: "productSku", label: "SKU", align: "left" },
        { key: "type", label: "Type", align: "center" },
        { key: "reason", label: "Reason", align: "left" },
        { key: "quantity", label: "Qty", align: "right" },
        { key: "referenceNumber", label: "Reference", align: "left" },
        { key: "performedBy", label: "User", align: "left" },
        { key: "createdAt", label: "Date", align: "left", format: "date" },
    ],
    users: [
        { key: "name", label: "Name", align: "left" },
        { key: "email", label: "Email", align: "left" },
        { key: "role", label: "Role", align: "left" },
        { key: "isActive", label: "Active", align: "center", format: "boolean" },
        { key: "revenueGenerated", label: "Revenue", align: "right", format: "currency" },
        { key: "createdAt", label: "Joined", align: "left", format: "date" },
    ],
    organizations: [
        { key: "name", label: "Organization", align: "left" },
        { key: "contactEmail", label: "Email", align: "left" },
        { key: "usersCount", label: "Users", align: "right" },
        { key: "productsCount", label: "Products", align: "right" },
        { key: "salesValue", label: "Sales Value", align: "right", format: "currency" },
        { key: "status", label: "Status", align: "center" },
    ],
    forecast: [
        { key: "productId.name", label: "Product", align: "left" },
        { key: "predictedDemand", label: "Predicted Demand", align: "right" },
        { key: "forecastPeriod", label: "Period", align: "center" },
        { key: "daysUntilStockout", label: "Days to Stockout", align: "right" },
        { key: "status", label: "Status", align: "center" },
    ],
    anomalies: [
        { key: "productId.name", label: "Product", align: "left" },
        { key: "type", label: "Type", align: "left" },
        { key: "description", label: "Description", align: "left" },
        { key: "severityDisplay", label: "Severity", align: "center" },
    ],
    suggestions: [
        { key: "productId.name", label: "Product", align: "left" },
        { key: "suggestedReorderQuantity", label: "Suggested Qty", align: "right" },
        { key: "supplierName", label: "Supplier", align: "left" },
        { key: "priority", label: "Priority", align: "center" },
    ],
    deadStock: [
        { key: "name", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "costPrice", label: "Cost Price", align: "right", format: "currency" },
        { key: "value", label: "Total Value", align: "right", format: "currency" },
        { key: "category", label: "Category", align: "left" },
        { key: "supplier", label: "Supplier", align: "left" },
    ],
    invoice_items: [
        { key: "productName", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "unitPrice", label: "Unit Price", align: "right", format: "currency" },
        { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
        { key: "subtotal", label: "Subtotal", align: "right", format: "currency" },
        { key: "profit", label: "Profit", align: "right", format: "currency" },
        { key: "margin", label: "Margin", align: "right", format: "percentage" },
    ],
    po_items: [
        { key: "productName", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantity", label: "Quantity", align: "right" },
        { key: "unitCost", label: "Unit Cost", align: "right", format: "currency" },
        { key: "totalCost", label: "Total Cost", align: "right", format: "currency" },
    ],
    customer_purchases: [
        { key: "productName", label: "Product Name", align: "left" },
        { key: "sku", label: "SKU", align: "left" },
        { key: "quantityPurchased", label: "Qty Bought", align: "right" },
        { key: "totalSpent", label: "Total Spent", align: "right", format: "currency" },
    ],
    // GROUP BY SCHEMAS
    grouped_categories: [
        { key: "categoryName", label: "Category Name", align: "left" },
        { key: "productCount", label: "Products", align: "right" },
        { key: "totalStock", label: "Stock", align: "right" },
        { key: "totalCostValue", label: "Cost Value", align: "right", format: "currency" },
        { key: "totalSellingValue", label: "Selling Value", align: "right", format: "currency" },
        { key: "totalPotentialProfit", label: "Potential Profit", align: "right", format: "currency" },
        { key: "averageMargin", label: "Avg Margin", align: "right", format: "percentage" },
    ],
    grouped_suppliers: [
        { key: "supplierName", label: "Supplier", align: "left" },
        { key: "productCount", label: "Products", align: "right" },
        { key: "totalStock", label: "Total Stock", align: "right" },
        { key: "totalCostValue", label: "Total Cost", align: "right", format: "currency" },
        { key: "totalSellingValue", label: "Total Value", align: "right", format: "currency" },
        { key: "totalPotentialProfit", label: "Potential Profit", align: "right", format: "currency" },
        { key: "averageMargin", label: "Avg Margin", align: "right", format: "percentage" },
    ],
    grouped_status: [
        { key: "statusDisplay", label: "Status", align: "center" },
        { key: "productCount", label: "Products", align: "right" },
        { key: "totalStock", label: "Total Stock", align: "right" },
        { key: "totalCostValue", label: "Total Cost", align: "right", format: "currency" },
        { key: "totalSellingValue", label: "Total Value", align: "right", format: "currency" },
        { key: "totalPotentialProfit", label: "Potential Profit", align: "right", format: "currency" },
        { key: "averageMargin", label: "Avg Margin", align: "right", format: "percentage" },
    ],
    grouped_customers: [
        { key: "_id", label: "Customer", align: "left" },
        { key: "salesCount", label: "Orders", align: "right" },
        { key: "totalRevenue", label: "Total Revenue", align: "right", format: "currency" },
        { key: "averageRevenue", label: "Avg Revenue", align: "right", format: "currency" },
    ],
    grouped_sales_monthly: [
        { key: "_id", label: "Month", align: "left" },
        { key: "salesCount", label: "Orders", align: "right" },
        { key: "totalRevenue", label: "Total Revenue", align: "right", format: "currency" },
        { key: "averageRevenue", label: "Avg Revenue", align: "right", format: "currency" },
    ],
    grouped_sales_daily: [
        { key: "_id", label: "Date", align: "left" },
        { key: "salesCount", label: "Orders", align: "right" },
        { key: "totalRevenue", label: "Total Revenue", align: "right", format: "currency" },
        { key: "averageRevenue", label: "Avg Revenue", align: "right", format: "currency" },
    ],
    grouped_sales_status: [
        { key: "_id", label: "Status", align: "center" },
        { key: "salesCount", label: "Orders", align: "right" },
        { key: "totalRevenue", label: "Total Revenue", align: "right", format: "currency" },
        { key: "averageRevenue", label: "Avg Revenue", align: "right", format: "currency" },
    ],
    grouped_purchase_suppliers: [
        { key: "supplierName", label: "Supplier", align: "left" },
        { key: "orderCount", label: "Orders", align: "right" },
        { key: "totalSpent", label: "Total Spent", align: "right", format: "currency" },
        { key: "averageSpent", label: "Avg Spent", align: "right", format: "currency" },
    ],
    grouped_purchase_status: [
        { key: "status", label: "Status", align: "center" },
        { key: "orderCount", label: "Orders", align: "right" },
        { key: "totalSpent", label: "Total Spent", align: "right", format: "currency" },
        { key: "averageSpent", label: "Avg Spent", align: "right", format: "currency" },
    ],
};

const isDetailedRequest = (userQueryText = "") => {
    if (!userQueryText) return false;
    const lower = userQueryText.toLowerCase();
    return (
        lower.includes("detail") ||
        lower.includes("complete") ||
        lower.includes("all field") ||
        lower.includes("every field") ||
        lower.includes("full info") ||
        lower.includes("margin") ||
        lower.includes("cost price") ||
        lower.includes("profit") ||
        lower.includes("valuation")
    );
};

const resolveTableConfig = (data, toolName, userQueryText = "") => {
    if (!Array.isArray(data) || data.length === 0) {
        return { schema: [], title: "Data" };
    }
    const sample = data[0];

    // Check for grouped data - ORDER MATTERS!
    if (sample.categoryName !== undefined && sample.productCount !== undefined) {
        return { schema: COLUMN_SCHEMAS.grouped_categories, title: "Categories" };
    }
    if (sample.supplierName !== undefined && sample.productCount !== undefined) {
        return { schema: COLUMN_SCHEMAS.grouped_suppliers, title: "Suppliers" };
    }
    if (sample.statusDisplay !== undefined && sample.productCount !== undefined) {
        return { schema: COLUMN_SCHEMAS.grouped_status, title: "Stock Status" };
    }
    if (sample.status !== undefined && sample.orderCount !== undefined) {
        return { schema: COLUMN_SCHEMAS.grouped_purchase_status, title: "Purchase Status" };
    }
    if (sample.salesCount !== undefined && sample.totalRevenue !== undefined) {
        if (sample._id && /^\d{4}-\d{2}$/.test(sample._id)) {
            return { schema: COLUMN_SCHEMAS.grouped_sales_monthly, title: "Monthly Sales" };
        }
        if (sample._id && /^\d{4}-\d{2}-\d{2}$/.test(sample._id)) {
            return { schema: COLUMN_SCHEMAS.grouped_sales_daily, title: "Daily Sales" };
        }
        return { schema: COLUMN_SCHEMAS.grouped_customers, title: "Customer Sales" };
    }
    if (sample.orderCount !== undefined && sample.totalSpent !== undefined) {
        return { schema: COLUMN_SCHEMAS.grouped_purchase_suppliers, title: "Supplier Orders" };
    }

    // Regular data detection
    if (sample.unitPrice !== undefined && sample.quantity !== undefined) {
        return { schema: COLUMN_SCHEMAS.invoice_items, title: "Invoice Line Items" };
    }
    if (sample.unitCost !== undefined && sample.totalCost !== undefined) {
        return { schema: COLUMN_SCHEMAS.po_items, title: "Purchase Order Items" };
    }
    if (sample.quantityPurchased !== undefined && sample.totalSpent !== undefined) {
        return { schema: COLUMN_SCHEMAS.customer_purchases, title: "Purchased Products" };
    }
    if (toolName === "query_inventory" || (sample.sku !== undefined && sample.quantity !== undefined && sample.sellingPrice !== undefined)) {
        const isDetailed = isDetailedRequest(userQueryText);
        return {
            schema: isDetailed ? COLUMN_SCHEMAS.products_detailed : COLUMN_SCHEMAS.products_compact,
            title: isDetailed ? "Detailed Products" : "Products",
        };
    }
    if (toolName === "query_purchases" || sample.poNumber !== undefined) {
        return { schema: COLUMN_SCHEMAS.purchases, title: "Purchase Orders" };
    }
    if (toolName === "query_sales" || sample.invoiceNumber !== undefined) {
        return { schema: COLUMN_SCHEMAS.sales, title: "Invoices" };
    }
    if (toolName === "query_transactions" || (sample.type !== undefined && sample.reason !== undefined && sample.performedBy !== undefined)) {
        return { schema: COLUMN_SCHEMAS.transactions, title: "Transactions" };
    }
    if (sample.role !== undefined && sample.email !== undefined) {
        return { schema: COLUMN_SCHEMAS.users, title: "Users" };
    }
    if (sample.contactEmail !== undefined && sample.productsCount !== undefined) {
        return { schema: COLUMN_SCHEMAS.organizations, title: "Organizations" };
    }
    if (sample.predictedDemand !== undefined) {
        return { schema: COLUMN_SCHEMAS.forecast, title: "Demand Forecast" };
    }
    if (sample.severityDisplay !== undefined || sample.severity !== undefined) {
        return { schema: COLUMN_SCHEMAS.anomalies, title: "Anomalies" };
    }
    if (sample.suggestedReorderQuantity !== undefined) {
        return { schema: COLUMN_SCHEMAS.suggestions, title: "Reorder Suggestions" };
    }
    if (sample.daysWithoutSale !== undefined || (sample.value !== undefined && sample.costPrice !== undefined && sample.quantity !== undefined)) {
        return { schema: COLUMN_SCHEMAS.deadStock, title: "Dead Stock" };
    }

    const excludedKeys = new Set(["_id", "__v", "statusKey", "statusEmoji", "statusLabel", "organizationId", "updatedAt", "createdBy", "supplierId", "categoryId"]);
    const keys = Object.keys(sample).filter((k) => !excludedKeys.has(k));
    const schema = keys.map((k) => ({
        key: k,
        label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
        align: typeof sample[k] === "number" ? "right" : k.toLowerCase().includes("status") ? "center" : "left",
    }));

    return { schema, title: "Results" };
};

const hasStatusEmoji = (text) => {
    if (!text) return false;
    return /[🟢🟡🔴⚫]/.test(text.toString());
};

const getValueByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

// ─────────────────────────────────────────────────────────────────────────────
// FIXED: formatCellValue - percentage now multiplies by 100
// ─────────────────────────────────────────────────────────────────────────────

const formatCellValue = (row, col) => {
    const val = getValueByPath(row, col.key);
    if (val === null || val === undefined || val === "") return "—";

    if (col.format === "currency") {
        if (typeof val === "string") {
            const trimmed = val.trim();
            if (trimmed.startsWith("PKR") || trimmed.startsWith("$")) {
                return trimmed;
            }
            const cleanNum = parseFloat(trimmed.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(cleanNum)) {
                return `PKR ${cleanNum.toLocaleString("en-PK", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`;
            }
            return trimmed;
        }
        if (typeof val === "number" && !isNaN(val)) {
            return `PKR ${val.toLocaleString("en-PK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }
        return String(val);
    }

    if (col.format === "percentage") {
        if (typeof val === "string") {
            const trimmed = val.trim();
            if (trimmed.endsWith("%")) {
                return trimmed;
            }
            const cleanNum = parseFloat(trimmed.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(cleanNum)) {
                const pctVal = cleanNum > 1 ? cleanNum : cleanNum * 100;
                return `${Math.round(pctVal)}%`;
            }
            return trimmed;
        }
        if (typeof val === "number" && !isNaN(val)) {
            const pctVal = val > 1 ? val : val * 100;
            return `${Math.round(pctVal)}%`;
        }
        return String(val);
    }

    if (col.format === "date" || val instanceof Date) {
        const d = new Date(val);
        return !isNaN(d.getTime()) ? d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" }) : String(val);
    }
    if (col.format === "boolean") {
        return val ? "Yes" : "No";
    }
    if (col.format === "status") {
        return val;
    }
    return String(val);
};

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ message }) {
    return (
        <div className="w-full my-4 p-6 border border-border rounded-xl bg-card text-center select-none shadow-2xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mx-auto mb-3">
                <PackageX className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
                {message || "No matching records found"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
                {message === "No data found matching your criteria."
                    ? "We couldn't find any data matching your search criteria."
                    : "Try adjusting your search terms or filters."}
            </p>
            <div className="text-left bg-muted/40 border border-border/60 rounded-lg p-3 max-w-sm mx-auto text-xs">
                <span className="font-semibold text-foreground block mb-1">Try asking:</span>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>"Show all products"</li>
                    <li>"Remove current filters"</li>
                    <li>"Search using a different keyword"</li>
                </ul>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURED TABLE - UPDATED WITH FIXES
// ─────────────────────────────────────────────────────────────────────────────

function StructuredTable({
    data,
    pagination,
    messageId,
    onPageChange,
    isLoading,
    toolName,
    userQueryText,
    schema,
}) {
    // Check if data is empty
    const isEmpty = !Array.isArray(data) || data.length === 0;

    if (isEmpty) {
        return <EmptyState />;
    }

    let resolvedSchema = [];
    let resolvedTitle = "";

    // --- CRITICAL: Check for grouped data FIRST ---
    const sample = data[0];

    // Category grouping
    if (sample.categoryName !== undefined && sample.productCount !== undefined) {
        resolvedSchema = COLUMN_SCHEMAS.grouped_categories;
        resolvedTitle = "Categories";
    }
    // Supplier grouping
    else if (sample.supplierName !== undefined && sample.productCount !== undefined) {
        resolvedSchema = COLUMN_SCHEMAS.grouped_suppliers;
        resolvedTitle = "Suppliers";
    }
    // Status grouping
    else if ((sample.statusDisplay !== undefined || sample.status !== undefined) && sample.productCount !== undefined) {
        resolvedSchema = COLUMN_SCHEMAS.grouped_status;
        resolvedTitle = "Stock Status";
    }
    // Sales grouping
    else if (sample.salesCount !== undefined && sample.totalRevenue !== undefined) {
        if (sample._id && /^\d{4}-\d{2}$/.test(sample._id)) {
            resolvedSchema = COLUMN_SCHEMAS.grouped_sales_monthly;
            resolvedTitle = "Monthly Sales";
        } else if (sample._id && /^\d{4}-\d{2}-\d{2}$/.test(sample._id)) {
            resolvedSchema = COLUMN_SCHEMAS.grouped_sales_daily;
            resolvedTitle = "Daily Sales";
        } else {
            resolvedSchema = COLUMN_SCHEMAS.grouped_customers;
            resolvedTitle = "Customer Sales";
        }
    }
    // Purchase grouping
    else if (sample.orderCount !== undefined && sample.totalSpent !== undefined) {
        if (sample.supplierName !== undefined) {
            resolvedSchema = COLUMN_SCHEMAS.grouped_purchase_suppliers;
            resolvedTitle = "Supplier Orders";
        } else {
            resolvedSchema = COLUMN_SCHEMAS.grouped_purchase_status;
            resolvedTitle = "Purchase Status";
        }
    }
    // Schema prop provided
    else if (schema && COLUMN_SCHEMAS[schema]) {
        resolvedSchema = COLUMN_SCHEMAS[schema];
        const titleMap = {
            products_compact: "Products",
            products_detailed: "Detailed Products",
            purchases: "Purchase Orders",
            sales: "Invoices",
            transactions: "Transactions",
            users: "Users",
            organizations: "Organizations",
            forecast: "Demand Forecast",
            anomalies: "Anomalies",
            suggestions: "Reorder Suggestions",
            deadStock: "Dead Stock",
            grouped_categories: "Categories",
            grouped_suppliers: "Suppliers",
            grouped_status: "Stock Status",
            grouped_customers: "Customer Sales",
            grouped_sales_monthly: "Monthly Sales",
            grouped_sales_daily: "Daily Sales",
            grouped_sales_status: "Sales by Status",
            grouped_purchase_suppliers: "Supplier Orders",
            grouped_purchase_status: "Purchase Status",
        };
        resolvedTitle = titleMap[schema] || "Results";
    }
    // Fallback: resolve from data
    else {
        const config = resolveTableConfig(data, toolName, userQueryText);
        resolvedSchema = config.schema;
        resolvedTitle = config.title;
    }

    // If still no schema, create dynamic one
    if (!resolvedSchema || resolvedSchema.length === 0) {
        const keys = Object.keys(sample).filter(k => !k.startsWith('_') && !['__v', 'organizationId'].includes(k));
        resolvedSchema = keys.map(k => ({
            key: k,
            label: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
            align: typeof sample[k] === "number" ? "right" : "left",
            format: typeof sample[k] === "number" &&
                (k.toLowerCase().includes('cost') || k.toLowerCase().includes('revenue') ||
                    k.toLowerCase().includes('spent') || k.toLowerCase().includes('value')) ? "currency" :
                k.toLowerCase().includes('margin') || k.toLowerCase().includes('percentage') ? "percentage" : undefined,
        }));
        resolvedTitle = "Results";
    }

    const page = pagination?.page || 1;
    const totalPages = pagination?.totalPages || 1;
    const count = pagination?.count !== undefined ? pagination.count : data.length;
    const limit = pagination?.pageSize || 10;
    const start = count > 0 ? (page - 1) * limit + 1 : 0;
    const end = Math.min(page * limit, count);

    const isPrevDisabled = page <= 1 || isLoading;
    const isNextDisabled = page >= totalPages || isLoading;

    return (
        <div className="w-full my-4 shadow-2xs bg-card overflow-hidden transition-all">
            <div className="w-full overflow-x-auto max-h-[380px] scrollbar-thin relative">
                <table className="w-full text-xs border-collapse min-w-[550px]">
                    <thead className="bg-muted/90 backdrop-blur-xs text-foreground border-b border-border font-semibold sticky top-0 z-10 select-none">
                        <tr>
                            {resolvedSchema.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        "px-3.5 py-2.5 font-semibold border-r last:border-0 border-border text-foreground whitespace-nowrap",
                                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                    )}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-border transition-opacity duration-200", isLoading && "opacity-40")}>
                        {data.map((row, rowIdx) => {
                            // For grouped data, ensure we have proper display values
                            const displayRow = { ...row };

                            // If status exists but statusDisplay doesn't, create it
                            if (row.status !== undefined && row.statusDisplay === undefined) {
                                const statusMap = {
                                    'in_stock': '🟢 In Stock',
                                    'low_stock': '🟡 Low Stock',
                                    'out_of_stock': '🔴 Out of Stock',
                                    'dead_stock': '⚫ Dead Stock',
                                };
                                displayRow.statusDisplay = statusMap[row.status] || row.status;
                            }

                            return (
                                <tr key={rowIdx} className="hover:bg-muted/40 transition-colors">
                                    {resolvedSchema.map((col) => {
                                        const formatted = formatCellValue(displayRow, col);
                                        const hasEmoji = hasStatusEmoji(formatted);
                                        return (
                                            <td
                                                key={col.key}
                                                className={cn(
                                                    "px-3.5 py-2.5 border-r last:border-0 border-border text-foreground whitespace-nowrap text-xs",
                                                    col.align === "right" ? "text-right font-mono text-[11px]" : col.align === "center" || hasEmoji ? "text-center" : "text-left"
                                                )}
                                            >
                                                {formatted}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="px-3 py-2 bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-muted-foreground select-none">
                    Showing <span className="font-medium text-foreground">{start}–{end}</span> of <span className="font-medium text-foreground">{count}</span> {resolvedTitle.toLowerCase()}
                </span>

                {totalPages > 1 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(messageId, page - 1)}
                            disabled={isPrevDisabled}
                            className="h-7 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            <span>Previous</span>
                        </Button>

                        <span className="text-[11px] font-medium text-foreground select-none px-1">
                            Page {page} of {totalPages}
                        </span>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(messageId, page + 1)}
                            disabled={isNextDisabled}
                            className="h-7 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Next</span>
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTED QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────

function SuggestedQuestions({ questions, onSuggestionClick, disabled }) {
    if (!Array.isArray(questions) || questions.length === 0) return null;

    return (
        <div className="mt-4 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
                💬 Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2">
                {questions.map((question, idx) => (
                    <button
                        key={idx}
                        onClick={() => !disabled && onSuggestionClick?.(question)}
                        disabled={disabled}
                        className={cn(
                            "px-3 py-1.5 text-xs rounded-full border border-border bg-muted/50 transition-all duration-150 text-left",
                            disabled
                                ? "opacity-50 cursor-not-allowed"
                                : "cursor-pointer hover:bg-muted hover:border-primary/30 hover:underline hover:text-foreground text-muted-foreground font-medium",
                        )}
                    >
                        {question}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN COMPONENTS & RENDERER
// ─────────────────────────────────────────────────────────────────────────────

const markdownComponents = {
    h1: ({ node, ...props }) => (
        <h1 className="text-base font-bold mt-4 mb-2 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    h2: ({ node, ...props }) => (
        <h2 className="text-sm font-bold mt-4 mb-2 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    h3: ({ node, ...props }) => (
        <h3 className="text-xs font-semibold mt-3 mb-1 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    p: ({ node, children, ...props }) => (
        <p className="mb-2.5 last:mb-0 leading-relaxed text-sm text-foreground wrap-break-word [word-break:break-word]" {...props}>
            {children}
        </p>
    ),
    ul: ({ node, children, ...props }) => (
        <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-sm text-foreground wrap-break-word [word-break:break-word]" {...props}>
            {children}
        </ul>
    ),
    li: ({ node, children, ...props }) => (
        <li className="pl-0.5 wrap-break-word [word-break:break-word] leading-relaxed text-sm" {...props}>
            {children}
        </li>
    ),
    ol: ({ node, ...props }) => (
        <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-sm text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
        <blockquote className="border-l-4 border-primary/50 bg-muted/40 pl-3 py-1 my-2.5 italic rounded-r text-foreground/80 text-sm wrap-break-word [word-break:break-word]" {...props} />
    ),
    strong: ({ node, ...props }) => (
        <strong className="font-bold text-foreground" {...props} />
    ),
    em: ({ node, ...props }) => (
        <em className="italic text-foreground" {...props} />
    ),
    table: ({ node, ...props }) => (
        <div className="my-3 overflow-x-auto rounded-lg border border-border bg-card/60 shadow-sm scrollbar-thin">
            <table className="w-full text-xs text-left text-foreground border-collapse" {...props} />
        </div>
    ),
    thead: ({ node, ...props }) => (
        <thead className="bg-muted/70 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border" {...props} />
    ),
    tbody: ({ node, ...props }) => (
        <tbody className="divide-y divide-border/50 bg-background/50" {...props} />
    ),
    tr: ({ node, ...props }) => (
        <tr className="hover:bg-muted/40 transition-colors" {...props} />
    ),
    th: ({ node, ...props }) => (
        <th className="px-3 py-2 font-semibold border-b border-border text-foreground" {...props} />
    ),
    td: ({ node, ...props }) => (
        <td className="px-3 py-2 whitespace-nowrap text-foreground" {...props} />
    ),
    code: ({ node, className, children, ...props }) => {
        const inline = !className;
        if (inline) {
            return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border text-foreground font-semibold wrap-break-word whitespace-pre-wrap" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <pre className="bg-muted/60 border border-border rounded-lg p-3.5 overflow-x-auto my-3 font-mono text-[11px] text-foreground leading-normal scrollbar-thin">
                <code className={cn("block w-full whitespace-pre", className)} {...props}>
                    {children}
                </code>
            </pre>
        );
    },
    span: ({ node, className, children, ...props }) => {
        const content = children?.toString() || "";
        const isSectionHeader = /[📦📊💡🎯💬]/.test(content);

        if (isSectionHeader) {
            let colorClass = "text-primary";
            if (content.includes("📦")) colorClass = "text-primary";
            else if (content.includes("📊")) colorClass = "text-blue-600";
            else if (content.includes("💡")) colorClass = "text-amber-600";
            else if (content.includes("🎯")) colorClass = "text-green-600";
            else if (content.includes("💬")) colorClass = "text-purple-600";

            return (
                <span className={cn("font-bold text-base mt-4 block", colorClass, className)} {...props}>
                    {children}
                </span>
            );
        }

        return <span className={className} {...props}>{children}</span>
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MESSAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function MessageAnimated({
    message,
    scrollAnchor = false,
    className,
    onSuggestionClick,
    onPageChange,
    isHistoryConversation = false,
    isChatPending = false,
    ...props
}) {
    const [displayContent, setDisplayContent] = useState(message.content || "");
    const messageRef = useRef(null);
    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";

    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [scrollHeight, setScrollHeight] = useState(0);
    const contentRef = useRef(null);

    useEffect(() => {
        setDisplayContent(message.content || "");
    }, [message.content]);

    useEffect(() => {
        if (isUser && contentRef.current && typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const sh = entry.target.scrollHeight;
                    setScrollHeight(sh);
                    setIsOverflowing(sh > 135);
                }
            });
            observer.observe(contentRef.current);
            return () => observer.disconnect();
        }
    }, [isUser, message.content]);

    const content = isUser
        ? message.content || ""
        : displayContent || message.content || "";

    const tableData = message.tableData || null;
    const pagination = message.pagination || null;
    const suggestedQuestions = message.suggestedQuestions || [];
    const pageLoading = message.pageLoading || false;
    const schema = message.schema || null;

    const suggestionsDisabled = isHistoryConversation || isChatPending || pageLoading;

    // Check if this is grouped data from the backend
    const isGroupedData = tableData && Array.isArray(tableData) && tableData.length > 0 &&
        (tableData[0].categoryName !== undefined ||
            tableData[0].supplierName !== undefined ||
            (tableData[0].status !== undefined && tableData[0].orderCount !== undefined) ||
            (tableData[0].statusDisplay !== undefined && tableData[0].productCount !== undefined) ||
            (tableData[0].salesCount !== undefined && tableData[0].totalRevenue !== undefined) ||
            (tableData[0].orderCount !== undefined && tableData[0].totalSpent !== undefined));

    const cleanContent = useMemo(() => {
        if (!content) return "";

        // 1. Strip 💬 SUGGESTED QUESTIONS header
        let cleaned = content.replace(/💬\s*SUGGESTED QUESTIONS[\s\S]*$/i, "").trim();

        // 2. Normalize unicode bullets to markdown hyphen bullets
        cleaned = cleaned.replace(/(\n|^)[ \t]*•[ \t]*/g, "$1- ");

        // 3. Check if the result is empty
        const hasEmptyData = message?.summary?.isEmpty === true ||
            message?.isEmpty === true ||
            (message?.pagination?.count === 0);

        // 4. If empty data, clean up zero-summary and N/A rows
        if (hasEmptyData) {
            cleaned = cleaned.replace(/\|.*N\/A.*\|/g, "").trim();
            cleaned = cleaned.replace(/\|[\s\-:]+\|/g, "").trim();
            cleaned = cleaned.replace(/\| Name\/Number \| SKU \| Quantity \| Selling Price \| Status \|/g, "").trim();
            cleaned = cleaned.replace(/\| \-\-\- \| \-\-\- \| \-\-\- \| \-\-\- \| \-\-\- \|/g, "").trim();
        }

        // 5. For grouped data, ensure the table renders properly
        if (isGroupedData && !cleaned.includes("|")) {
            const primaryRegex = /(##?\s*📊\s*PRIMARY CONTENT[^\n]*)/i;
            if (primaryRegex.test(cleaned)) {
                cleaned = cleaned.replace(primaryRegex, "$1\n\n| Data |\n| --- |\n");
            } else {
                cleaned = cleaned + "\n\n## 📊 PRIMARY CONTENT\n| Data |\n| --- |\n";
            }
        }

        // 6. Regular data table placeholder
        const hasData = message?.tableData && Array.isArray(message.tableData) && message.tableData.length > 0;
        if (hasData && !hasEmptyData && !isGroupedData && !cleaned.includes("|")) {
            const primaryRegex = /(##?\s*📊\s*PRIMARY CONTENT[^\n]*)/i;
            if (primaryRegex.test(cleaned)) {
                cleaned = cleaned.replace(primaryRegex, "$1\n\n| Data Table |\n| --- |\n");
            } else {
                cleaned = cleaned + "\n\n## 📊 PRIMARY CONTENT\n| Data Table |\n| --- |\n";
            }
        }

        return cleaned;
    }, [content, message?.tableData, message?.summary, message?.pagination, message?.isEmpty, isGroupedData]);

    const customMarkdownComponents = useMemo(() => {
        const hasData = tableData && Array.isArray(tableData) && tableData.length > 0;

        return {
            ...markdownComponents,
            table: (props) => {
                if (hasData) {
                    return (
                        <StructuredTable
                            data={tableData}
                            pagination={pagination}
                            messageId={message.id}
                            onPageChange={onPageChange}
                            isLoading={pageLoading}
                            toolName={message.toolName}
                            userQueryText={message.userQueryText || message.query}
                            schema={schema}
                        />
                    );
                }
                return markdownComponents.table(props);
            },
        };
    }, [tableData, pagination, message.id, onPageChange, pageLoading, message.toolName, message.userQueryText, schema, message.query]);

    return (
        <div
            ref={messageRef}
            className={cn(
                "flex w-full gap-3 transition-all duration-300 ease-out",
                isUser ? "justify-end" : "justify-start",
                scrollAnchor && "scroll-mt-4",
                className,
            )}
            {...props}
        >
            <div
                className={cn(
                    "transition-all duration-200 wrap-break-word [word-break:break-word] overflow-hidden flex flex-col",
                    isUser
                        ? "max-w-[75%] bg-primary mt-4 text-slate-950 px-4 py-3 rounded-tr-none shadow-sm rounded-2xl font-semibold"
                        : "w-full bg-background px-5 py-4 rounded-tl-none ring-0 text-foreground",
                )}
            >
                {isAssistant ? (
                    <div className="relative leading-relaxed wrap-break-word [word-break:break-word]">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={customMarkdownComponents}
                        >
                            {cleanContent}
                        </ReactMarkdown>

                        <SuggestedQuestions
                            questions={suggestedQuestions}
                            onSuggestionClick={onSuggestionClick}
                            disabled={suggestionsDisabled}
                        />
                    </div>
                ) : (
                    <>
                        <div
                            ref={contentRef}
                            style={{
                                maxHeight: isOverflowing && !isExpanded ? "135px" : isExpanded ? `${scrollHeight}px` : "none",
                                transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                            className={cn("relative overflow-hidden transition-all duration-300 w-full")}
                        >
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap wrap-break-word [word-break:break-word]">
                                {content}
                            </p>

                            {isOverflowing && !isExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-primary via-primary/80 to-transparent pointer-events-none" />
                            )}
                        </div>

                        {isOverflowing && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                aria-expanded={isExpanded}
                                className="w-full text-center mt-2.5 pt-2 border-t border-slate-950/15 text-xs font-bold text-slate-950/70 hover:text-slate-950 transition-colors cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-slate-950/30 rounded"
                            >
                                {isExpanded ? (
                                    <>
                                        <span>Show less</span>
                                        <ChevronUp className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </>
                                ) : (
                                    <>
                                        <span>Show more</span>
                                        <ChevronDown className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
