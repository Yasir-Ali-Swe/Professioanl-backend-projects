// services/resolvers/categoryResolver.js
import mongoose from "mongoose";
import categoryModel from "../../models/category.model.js";
import invoiceModel from "../../models/invoice.model.js";
import productModel from "../../models/product.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable, FORMAT_TYPES } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

const HISTORICAL_COST_DISCLAIMER = "\n\n📌 Note: Profit margins are calculated using historical invoice sale prices at the time of transaction and current product cost prices.";

export const resolveCategoryQuery = async (queryText = "", args = {}, organizationId = null) => {
  const lowerQuery = (queryText || "").toLowerCase();
  const baseMatch = organizationId
    ? { organizationId: new mongoose.Types.ObjectId(organizationId), status: "paid" }
    : { status: "paid" };

  const isMarginQuery =
    lowerQuery.includes("profit margin") ||
    lowerQuery.includes("margin") ||
    lowerQuery.includes("category profit") ||
    lowerQuery.includes("profitability");

  // Realized Category Profit Margin Aggregation over Invoice Line Items
  if (isMarginQuery) {
    let specificCategoryDoc = null;
    const catSearchTerm = args.category || args.identifier || stripTriggerPhrases(queryText);

    if (catSearchTerm && !lowerQuery.includes("by category") && !lowerQuery.includes("all categories")) {
      const catRegex = new RegExp(escapeRegex(catSearchTerm), "i");
      const matchingCats = await categoryModel.find({
        ...(organizationId ? { organizationId } : {}),
        name: catRegex,
      }).lean();

      if (matchingCats.length > 1) {
        return buildDisambiguationResult("categories", catSearchTerm, matchingCats);
      }
      if (matchingCats.length === 1) {
        specificCategoryDoc = matchingCats[0];
      }
    }

    const pipeline = [
      { $match: baseMatch },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          let: { prodId: "$products.productId", orgId: "$organizationId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$prodId"] },
                    organizationId ? { $eq: ["$organizationId", "$$orgId"] } : true,
                  ],
                },
              },
            },
          ],
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "categories",
          let: { catId: "$productDoc.categoryId", orgId: "$organizationId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$catId"] },
                    organizationId ? { $eq: ["$organizationId", "$$orgId"] } : true,
                  ],
                },
              },
            },
          ],
          as: "categoryDoc",
        },
      },
      { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    ];

    if (specificCategoryDoc) {
      pipeline.push({
        $match: { "categoryDoc._id": specificCategoryDoc._id },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$categoryDoc._id",
          categoryName: { $first: { $ifNull: ["$categoryDoc.name", "Uncategorized"] } },
          itemsSold: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.subtotal" },
          totalCost: { $sum: { $multiply: ["$products.quantity", "$productDoc.costPrice"] } },
        },
      },
      {
        $project: {
          categoryName: 1,
          itemsSold: 1,
          totalRevenue: 1,
          totalCost: 1,
          totalProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
          profitMargin: {
            $cond: [
              { $gt: ["$totalRevenue", 0] },
              {
                $multiply: [
                  { $divide: [{ $subtract: ["$totalRevenue", "$totalCost"] }, "$totalRevenue"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { profitMargin: -1 } },
    );

    const categoryAggregates = await invoiceModel.aggregate(pipeline);

    if (categoryAggregates.length === 0) {
      return buildNotFoundResult("realized category profit margins", specificCategoryDoc?.name || "invoices");
    }

    const catMarginColumns = [
      { key: "categoryName", label: "Category Name", type: "string" },
      { key: "itemsSold", label: "Items Sold", type: "number" },
      { key: "totalCost", label: "Total Cost", type: "number", format: FORMAT_TYPES.CURRENCY },
      { key: "totalRevenue", label: "Total Revenue", type: "number", format: FORMAT_TYPES.CURRENCY },
      { key: "totalProfit", label: "Total Profit", type: "number", format: FORMAT_TYPES.CURRENCY },
      { key: "profitMargin", label: "Profit Margin", type: "number", format: FORMAT_TYPES.PERCENTAGE },
    ];

    const { columns, rows } = buildFlatTable(catMarginColumns, categoryAggregates);

    const categoryText = specificCategoryDoc ? ` for category "${specificCategoryDoc.name}"` : "";
    const framingLine = `Realized profit margin generated by categories${categoryText} (based on actual invoice sales):`;

    return {
      success: true,
      data: rows,
      fields: columns,
      count: categoryAggregates.length,
      tableTitle: `Profit Margin by Category${categoryText}`,
      framingLine,
      reply: `${framingLine}${HISTORICAL_COST_DISCLAIMER}`, // VISIBLE in chat output!
      isAnalytical: true, // Analytical query -> MAY append insight if notable
      summary: {
        totalCategories: categoryAggregates.length,
        disclaimer: HISTORICAL_COST_DISCLAIMER.trim(),
        isEmpty: false,
      },
    };
  }

  // Case 2: Plain Category Listing Lookup
  const categories = await categoryModel
    .find(organizationId ? { organizationId } : {})
    .lean();

  if (categories.length === 0) {
    return buildNotFoundResult("categories", "organization");
  }

  const categoryIds = categories.map((c) => c._id);
  const counts = await productModel.aggregate([
    {
      $match: {
        categoryId: { $in: categoryIds },
        isActive: true,
        ...(organizationId ? { organizationId: new mongoose.Types.ObjectId(organizationId) } : {}),
      },
    },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

  const enhancedCats = categories.map((c) => ({
    categoryName: c.name,
    productCount: countMap.get(c._id.toString()) || 0,
    createdAt: c.createdAt,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.categories_compact, enhancedCats);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: categories.length,
    tableTitle: "Product Categories",
    framingLine: `Found ${categories.length} product categor${categories.length === 1 ? "y" : "ies"} in your organization:`,
    reply: `Found ${categories.length} product categor${categories.length === 1 ? "y" : "ies"} in your organization:`,
    isAnalytical: false, // Record lookup -> NO insight
    summary: { totalCategories: categories.length, isEmpty: false },
  };
};
