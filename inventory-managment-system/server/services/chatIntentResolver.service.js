// services/chatIntentResolver.service.js
import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import invoiceModel from "../models/invoice.model.js";
import organizationModel from "../models/organization.model.js";
import {
  COLUMN_DEFINITIONS,
  buildFlatTable,
  FORMAT_TYPES,
} from "./chatResponseFormatter.service.js";

/**
 * Schema-Aware Intent-to-Model Resolver Engine.
 * Resolves user query intent to specific models, fields, and aggregations.
 */

export const resolveAdminProfileIntent = async (organizationId) => {
  const queryFilter = organizationId
    ? { organizationId, role: "admin" }
    : { role: "admin" };

  const adminUsers = await userModel
    .find(queryFilter)
    .select("name email role isActive createdAt")
    .lean();

  if (!adminUsers || adminUsers.length === 0) {
    return {
      data: [],
      fields: COLUMN_DEFINITIONS.users_compact,
      columns: COLUMN_DEFINITIONS.users_compact,
      rows: [],
      count: 0,
      tableTitle: "Admin Profile",
      isSimple: true,
      summary: {
        isEmpty: true,
        message: "No admin user found for this organization.",
      },
    };
  }

  const enhancedAdmins = adminUsers.map((user) => ({
    userName: user.name,
    email: user.email,
    role: "admin",
    status: user.isActive ? "Active" : "Inactive",
    createdAt: user.createdAt,
  }));

  const { columns, rows } = buildFlatTable(
    COLUMN_DEFINITIONS.users_compact,
    enhancedAdmins,
  );

  return {
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: adminUsers.length,
    tableTitle: "Organization Admin Profile",
    isSimple: false,
    summary: {
      adminName: adminUsers[0].name,
      adminEmail: adminUsers[0].email,
      totalAdmins: adminUsers.length,
      isEmpty: false,
    },
  };
};

export const resolveProfitMarginByCategoryIntent = async (
  queryText,
  args,
  organizationId,
) => {
  const lower = (queryText || "").toLowerCase();
  const baseFilter = organizationId ? { organizationId, isActive: true } : { isActive: true };

  // Check if a specific category was requested
  let categoryDoc = null;
  if (args.category) {
    categoryDoc = await categoryModel.findOne({
      ...(organizationId ? { organizationId } : {}),
      name: new RegExp(`^${args.category}$`, "i"),
    });
  }

  if (!categoryDoc) {
    // Attempt fuzzy match from query string
    const categories = await categoryModel
      .find(organizationId ? { organizationId } : {})
      .lean();

    for (const cat of categories) {
      if (lower.includes(cat.name.toLowerCase())) {
        categoryDoc = cat;
        break;
      }
    }
  }

  if (categoryDoc) {
    // Specific category profit margin per product
    const filter = { ...baseFilter, categoryId: categoryDoc._id };
    const products = await productModel
      .find(filter)
      .populate("supplierId", "name")
      .lean();

    const enhancedProducts = products.map((p) => {
      const profit = p.sellingPrice - p.costPrice;
      const margin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
      return {
        productName: p.name,
        sku: p.sku,
        categoryName: categoryDoc.name,
        supplierName: p.supplierId?.name || "N/A",
        quantity: p.quantity,
        reorderThreshold: p.reorderThreshold,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        margin: Math.round(margin * 100) / 100,
        status: p.quantity === 0 ? "🔴 Out of Stock" : p.quantity <= p.reorderThreshold ? "🟡 Low Stock" : "🟢 In Stock",
      };
    });

    const { columns, rows } = buildFlatTable(
      COLUMN_DEFINITIONS.products_detailed,
      enhancedProducts,
    );

    const totalCost = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
    const totalRevenue = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      data: rows,
      fields: columns,
      columns: columns,
      rows: rows,
      count: products.length,
      tableTitle: `${categoryDoc.name} Profit Margins`,
      summary: {
        categoryName: categoryDoc.name,
        totalProducts: products.length,
        totalCostValue: Math.round(totalCost * 100) / 100,
        totalRevenueValue: Math.round(totalRevenue * 100) / 100,
        totalPotentialProfit: Math.round(totalProfit * 100) / 100,
        averageProfitMargin: `${Math.round(avgMargin)}%`,
        isEmpty: products.length === 0,
      },
    };
  }

  // Aggregate Profit Margin grouped across all categories
  const pipeline = [
    { $match: baseFilter },
    {
      $group: {
        _id: "$categoryId",
        productCount: { $sum: 1 },
        totalStock: { $sum: "$quantity" },
        totalCostValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
        totalSellingValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $project: {
        categoryName: { $ifNull: [{ $arrayElemAt: ["$categoryDetails.name", 0] }, "Uncategorized"] },
        productCount: 1,
        totalCostValue: 1,
        totalSellingValue: 1,
        totalProfit: { $subtract: ["$totalSellingValue", "$totalCostValue"] },
        profitMargin: {
          $cond: [
            { $gt: ["$totalSellingValue", 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ["$totalSellingValue", "$totalCostValue"] },
                    "$totalSellingValue",
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
    { $sort: { profitMargin: -1 } },
  ];

  const categoryAggregates = await productModel.aggregate(pipeline);

  const catMarginColumns = [
    { key: "categoryName", label: "Category Name", type: "string" },
    { key: "productCount", label: "Products", type: "number" },
    { key: "totalCostValue", label: "Cost Value", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "totalSellingValue", label: "Revenue Value", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "totalProfit", label: "Total Profit", type: "number", format: FORMAT_TYPES.CURRENCY },
    { key: "profitMargin", label: "Profit Margin", type: "number", format: FORMAT_TYPES.PERCENTAGE },
  ];

  const { columns, rows } = buildFlatTable(catMarginColumns, categoryAggregates);

  return {
    data: rows,
    fields: columns,
    columns: columns,
    rows: rows,
    count: categoryAggregates.length,
    tableTitle: "Profit Margin by Category",
    summary: {
      totalCategories: categoryAggregates.length,
      isEmpty: categoryAggregates.length === 0,
    },
  };
};
