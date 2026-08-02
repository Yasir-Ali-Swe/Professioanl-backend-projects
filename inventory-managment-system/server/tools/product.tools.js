import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Supplier from "../models/supplier.model.js";
import StockLog from "../models/stockLog.model.js";
import Invoice from "../models/invoice.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const productToolsDeclaration = {
  name: "query_products",
  description: `
Retrieve product and inventory information.

Use this tool whenever the user asks about:
- Products
- Product details
- SKU lookup
- Product search
- Inventory
- Stock levels
- Inventory value
- Product pricing
- Low stock
- Out of stock
- Overstock
- Product categories
- Product suppliers
- Product comparisons
- Sales history of a product
- Purchase history of a product
- Stock movement of a product
- Product statistics and rankings

Supports exact lookups, fuzzy searches, filtering, sorting, comparisons, and date range filtering.
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_products",
          "product_details",
          "search_products",
          "sku_lookup",
          "inventory_summary",
          "inventory_value",
          "low_stock",
          "out_of_stock",
          "over_stock",
          "top_stock",
          "lowest_stock",
          "products_by_category",
          "products_by_supplier",
          "price_analysis",
          "profit_margin",
          "sales_history",
          "purchase_history",
          "stock_history",
          "compare_products",
        ],
      },
      sku: {
        type: "string",
        description: "Exact product SKU for lookup.",
      },
      productName: {
        type: "string",
        description: "Product name for search.",
      },
      category: {
        type: "string",
        description: "Category name to filter by.",
      },
      supplier: {
        type: "string",
        description: "Supplier name to filter by.",
      },
      productNames: {
        type: "array",
        description: "Products to compare.",
        items: { type: "string" },
      },
      status: {
        type: "string",
        enum: ["active", "inactive"],
        description: "Filter by product status.",
      },
      minPrice: {
        type: "number",
        description: "Minimum selling price filter.",
      },
      maxPrice: {
        type: "number",
        description: "Maximum selling price filter.",
      },
      stockStatus: {
        type: "string",
        enum: ["normal", "low_stock", "out_of_stock", "over_stock"],
        description: "Filter by stock status.",
      },
      sortBy: {
        type: "string",
        enum: [
          "name",
          "quantity",
          "costPrice",
          "sellingPrice",
          "createdAt",
          "updatedAt",
        ],
        description: "Field to sort products by.",
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort direction.",
      },
      limit: {
        type: "number",
        description: "Maximum number of products to return (default 50).",
      },
    },
    required: ["action"],
  },
};

export const productToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const {
    action,
    sku,
    productName,
    category,
    supplier,
    productNames,
    status,
    stockStatus,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    sortOrder = "desc",
    startDate,
    endDate,
    limit = 50,
  } = args;

  const match = applyScopeFilter(scope, organizationId, {});

  if (minPrice !== undefined || maxPrice !== undefined) {
    match.sellingPrice = {};
    if (minPrice !== undefined) match.sellingPrice.$gte = minPrice;
    if (maxPrice !== undefined) match.sellingPrice.$lte = maxPrice;
  }

  const sortObj = {};
  sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

  switch (action) {
    case "list_products": {
      if (status) match.isActive = status === "active";

      const products = await Product.find(match)
        .sort(sortObj)
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "product_details":
    case "sku_lookup": {
      if (sku) match.sku = sku;
      else if (productName) match.name = { $regex: productName, $options: "i" };
      else return { error: "SKU or productName required for details lookup" };

      const product = await Product.findOne(match).lean();
      if (!product) return { found: false, message: "Product not found" };

      const enriched = await enrichSingleProduct(product);
      return sanitizeForModel(enriched);
    }

    case "search_products": {
      if (!productName) return { error: "productName required for search" };
      match.$or = [
        { name: { $regex: productName, $options: "i" } },
        { sku: { $regex: productName, $options: "i" } },
      ];

      const products = await Product.find(match)
        .sort(sortObj)
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "inventory_summary":
    case "inventory_value": {
      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
            totalRevenue: {
              $sum: { $multiply: ["$quantity", "$sellingPrice"] },
            },
            avgPrice: { $avg: "$sellingPrice" },
          },
        },
      ];

      const result = await Product.aggregate(pipeline);
      const summary = result[0] || {
        totalProducts: 0,
        totalQuantity: 0,
        totalValue: 0,
        totalRevenue: 0,
        avgPrice: 0,
      };

      return sanitizeForModel({
        summary,
        details:
          action === "inventory_value"
            ? await getInventoryBreakdown(match)
            : null,
      });
    }

    case "low_stock": {
      match.$expr = { $lte: ["$quantity", "$reorderThreshold"] };
      match.quantity = { $gt: 0 };

      const products = await Product.find(match)
        .sort({ quantity: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "out_of_stock": {
      match.quantity = 0;

      const products = await Product.find(match)
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "over_stock": {
      match.$expr = {
        $gt: ["$quantity", { $multiply: ["$reorderThreshold", 2] }],
      };

      const products = await Product.find(match)
        .sort({ quantity: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "top_stock": {
      const products = await Product.find(match)
        .sort({ quantity: -1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "lowest_stock": {
      const products = await Product.find(match)
        .sort({ quantity: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        products: enriched,
        count: enriched.length,
        total: await Product.countDocuments(match),
      });
    }

    case "products_by_category": {
      if (!category) return { error: "category required" };

      const cat = await Category.findOne({
        name: { $regex: category, $options: "i" },
      }).lean();
      if (!cat) return { found: false, message: "Category not found" };

      match.categoryId = cat._id;
      const products = await Product.find(match)
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        category: cat.name,
        products: enriched,
        count: enriched.length,
      });
    }

    case "products_by_supplier": {
      if (!supplier) return { error: "supplier required" };

      const sup = await Supplier.findOne({
        name: { $regex: supplier, $options: "i" },
      }).lean();
      if (!sup) return { found: false, message: "Supplier not found" };

      match.supplierId = sup._id;
      const products = await Product.find(match)
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      const enriched = await enrichProducts(products);
      return sanitizeForModel({
        supplier: sup.name,
        products: enriched,
        count: enriched.length,
      });
    }

    case "price_analysis":
    case "profit_margin": {
      const pipeline = [
        { $match: match },
        {
          $project: {
            name: 1,
            sku: 1,
            costPrice: 1,
            sellingPrice: 1,
            profitMargin: {
              $cond: [
                { $gt: ["$sellingPrice", 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$sellingPrice", "$costPrice"] },
                        "$sellingPrice",
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { profitMargin: sortOrder === "desc" ? -1 : 1 } },
        { $limit: limit },
      ];

      const results = await Product.aggregate(pipeline);
      return sanitizeForModel({
        products: results,
        count: results.length,
        analysis:
          action === "profit_margin"
            ? "Profit margin analysis"
            : "Price analysis",
      });
    }

    case "sales_history": {
      if (!sku && !productName) return { error: "sku or productName required" };

      let product;
      if (sku) {
        product = await Product.findOne({ sku }).lean();
      } else {
        product = await Product.findOne({
          name: { $regex: productName, $options: "i" },
        }).lean();
      }

      if (!product) return { found: false, message: "Product not found" };

      const dateFilter = {};
      if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
      if (endDate)
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          $lte: new Date(endDate),
        };

      const stockLogs = await StockLog.find({
        productId: product._id,
        type: "out",
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const invoiceIds = stockLogs
        .map((log) => log.relatedInvoiceId)
        .filter((id) => id);
      const invoices = await Invoice.find({ _id: { $in: invoiceIds } })
        .select("invoiceNumber customerName total status")
        .lean();

      const invoiceMap = {};
      for (const inv of invoices) {
        invoiceMap[inv._id.toString()] = inv;
      }

      const sales = stockLogs.map((log) => ({
        date: log.createdAt,
        quantity: log.quantity,
        invoice: invoiceMap[log.relatedInvoiceId?.toString()] || null,
        reason: log.reason,
      }));

      return sanitizeForModel({
        product: { name: product.name, sku: product.sku },
        sales,
        count: sales.length,
        totalSold: sales.reduce((sum, s) => sum + s.quantity, 0),
      });
    }

    case "purchase_history": {
      if (!sku && !productName) return { error: "sku or productName required" };

      let product;
      if (sku) {
        product = await Product.findOne({ sku }).lean();
      } else {
        product = await Product.findOne({
          name: { $regex: productName, $options: "i" },
        }).lean();
      }

      if (!product) return { found: false, message: "Product not found" };

      const dateFilter = {};
      if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
      if (endDate)
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          $lte: new Date(endDate),
        };

      const stockLogs = await StockLog.find({
        productId: product._id,
        type: "in",
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const poIds = stockLogs
        .map((log) => log.relatedPurchaseOrderId)
        .filter((id) => id);
      const pos = await PurchaseOrder.find({ _id: { $in: poIds } })
        .select("poNumber supplierId totalCost status")
        .lean();

      const poMap = {};
      for (const po of pos) {
        poMap[po._id.toString()] = po;
      }

      const purchases = stockLogs.map((log) => ({
        date: log.createdAt,
        quantity: log.quantity,
        purchaseOrder: poMap[log.relatedPurchaseOrderId?.toString()] || null,
        reason: log.reason,
      }));

      return sanitizeForModel({
        product: { name: product.name, sku: product.sku },
        purchases,
        count: purchases.length,
        totalPurchased: purchases.reduce((sum, p) => sum + p.quantity, 0),
      });
    }

    case "stock_history": {
      if (!sku && !productName) return { error: "sku or productName required" };

      let product;
      if (sku) {
        product = await Product.findOne({ sku }).lean();
      } else {
        product = await Product.findOne({
          name: { $regex: productName, $options: "i" },
        }).lean();
      }

      if (!product) return { found: false, message: "Product not found" };

      const dateFilter = {};
      if (startDate) dateFilter.createdAt = { $gte: new Date(startDate) };
      if (endDate)
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          $lte: new Date(endDate),
        };

      const logs = await StockLog.find({
        productId: product._id,
        ...dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return sanitizeForModel({
        product: {
          name: product.name,
          sku: product.sku,
          currentQuantity: product.quantity,
        },
        stockHistory: logs,
        count: logs.length,
      });
    }

    case "compare_products": {
      if (!productNames || productNames.length < 2) {
        return { error: "At least 2 product names required for comparison" };
      }

      const products = await Product.find({
        name: { $in: productNames.map((n) => new RegExp(n, "i")) },
      }).lean();

      if (products.length < 2) {
        return { error: "Could not find at least 2 products to compare" };
      }

      const comparisons = products.map((p) => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        profitMargin:
          p.sellingPrice > 0
            ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(
              2,
            )
            : 0,
        stockValue: p.quantity * p.costPrice,
        totalRevenue: p.quantity * p.sellingPrice,
      }));

      return sanitizeForModel({
        comparison: comparisons,
        insight: "Compare products by price, stock, and profitability",
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};

async function enrichProducts(products) {
  if (!products || products.length === 0) return [];

  const categoryIds = [
    ...new Set(products.map((p) => p.categoryId).filter(Boolean)),
  ];
  const supplierIds = [
    ...new Set(products.map((p) => p.supplierId).filter(Boolean)),
  ];

  const [categories, suppliers] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } })
      .select("name")
      .lean(),
    Supplier.find({ _id: { $in: supplierIds } })
      .select("name")
      .lean(),
  ]);

  const categoryMap = new Map(
    categories.map((c) => [c._id.toString(), c.name]),
  );
  const supplierMap = new Map(
    suppliers.map((s) => [s._id.toString(), s.name]),
  );

  return products.map((product) => {
    const catName = product.categoryId
      ? categoryMap.get(product.categoryId.toString())
      : null;
    const supName = product.supplierId
      ? supplierMap.get(product.supplierId.toString())
      : null;

    return {
      ...product,
      categoryName: catName || null,
      supplierName: supName || null,
      profitMargin:
        product.sellingPrice > 0
          ? (
            ((product.sellingPrice - product.costPrice) /
              product.sellingPrice) *
            100
          ).toFixed(2)
          : 0,
      stockValue: (product.quantity || 0) * (product.costPrice || 0),
    };
  });
}

async function enrichSingleProduct(product) {
  if (!product) return null;

  const [category, supplier] = await Promise.all([
    product.categoryId
      ? Category.findById(product.categoryId).select("name").lean()
      : null,
    product.supplierId
      ? Supplier.findById(product.supplierId).select("name").lean()
      : null,
  ]);

  return {
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
    stockValue: (product.quantity || 0) * (product.costPrice || 0),
    lowStock: product.quantity <= product.reorderThreshold,
  };
}

async function getInventoryBreakdown(match) {
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

  return { byCategory, bySupplier };
}
