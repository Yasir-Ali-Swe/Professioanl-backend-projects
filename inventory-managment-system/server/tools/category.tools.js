import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { applyScopeFilter } from "../utils/scopeFilter.js";
import { sanitizeForModel } from "../utils/sanitizeForModel.js";

export const categoryToolsDeclaration = {
  name: "query_categories",
  description: `
Retrieve category information.

Use this tool whenever the user asks about:
- Categories
- Category details
- Products in a category
- Category performance
- Category breakdowns
- Category comparisons
- Category analytics
`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "The operation to perform.",
        enum: [
          "list_categories",
          "category_details",
          "category_products",
          "category_performance",
          "category_breakdown",
          "compare_categories",
          "top_category",
          "lowest_category",
        ],
      },
      categoryId: {
        type: "string",
        description: "Category ID for details.",
      },
      categoryName: {
        type: "string",
        description: "Category name for search.",
      },
      limit: {
        type: "integer",
        description: "Maximum number of results (default: 50).",
        minimum: 1,
        maximum: 500,
      },
    },
    required: ["action"],
  },
};

export const categoryToolsHandler = async (args, scopeContext) => {
  const { scope, organizationId } = scopeContext;
  const { action, categoryId, categoryName, limit = 50 } = args;

  const match = applyScopeFilter(scope, organizationId, {});

  switch (action) {
    case "list_categories": {
      const categories = await Category.find(match)
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      return sanitizeForModel({
        categories,
        count: categories.length,
        total: await Category.countDocuments(match),
      });
    }

    case "category_details": {
      if (!categoryId && !categoryName) {
        return { error: "categoryId or categoryName required" };
      }

      const query = { ...match };
      if (categoryId) query._id = categoryId;
      else if (categoryName)
        query.name = { $regex: categoryName, $options: "i" };

      const category = await Category.findOne(query).lean();
      if (!category) return { found: false, message: "Category not found" };

      const productMatch = applyScopeFilter(scope, organizationId, {
        categoryId: category._id,
      });

      const stats = await Product.aggregate([
        { $match: productMatch },
        {
          $group: {
            _id: null,
            productCount: { $sum: 1 },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
            totalRevenue: {
              $sum: { $multiply: ["$quantity", "$sellingPrice"] },
            },
            avgPrice: { $avg: "$sellingPrice" },
          },
        },
      ]);

      const products = await Product.find(productMatch)
        .select("name sku quantity sellingPrice costPrice isActive")
        .limit(10)
        .lean();

      return sanitizeForModel({
        ...category,
        stats: stats[0] || {
          productCount: 0,
          totalValue: 0,
          totalRevenue: 0,
          avgPrice: 0,
        },
        sampleProducts: products,
      });
    }

    case "category_products": {
      if (!categoryId && !categoryName) {
        return { error: "categoryId or categoryName required" };
      }

      const query = { ...match };
      if (categoryId) query._id = categoryId;
      else if (categoryName)
        query.name = { $regex: categoryName, $options: "i" };

      const category = await Category.findOne(query).lean();
      if (!category) return { found: false, message: "Category not found" };

      const products = await Product.find({
        organizationId: category.organizationId,
        categoryId: category._id,
      })
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      return sanitizeForModel({
        category: { name: category.name, id: category._id },
        products,
        count: products.length,
      });
    }

    case "category_performance":
    case "category_breakdown": {
      const categories = await Category.find(match).lean();

      const results = await Promise.all(
        categories.map(async (cat) => {
          const productMatch = applyScopeFilter(scope, organizationId, {
            categoryId: cat._id,
          });

          const stats = await Product.aggregate([
            { $match: productMatch },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalValue: {
                  $sum: { $multiply: ["$quantity", "$costPrice"] },
                },
                totalRevenue: {
                  $sum: { $multiply: ["$quantity", "$sellingPrice"] },
                },
                avgPrice: { $avg: "$sellingPrice" },
              },
            },
          ]);

          return {
            name: cat.name,
            id: cat._id,
            ...(stats[0] || {
              count: 0,
              totalValue: 0,
              totalRevenue: 0,
              avgPrice: 0,
            }),
          };
        }),
      );

      results.sort((a, b) => b.totalValue - a.totalValue);

      const totalValue = results.reduce((sum, r) => sum + r.totalValue, 0);

      return sanitizeForModel({
        categories: results,
        totalValue,
        categoryCount: results.length,
        type:
          action === "category_performance"
            ? "Performance analysis"
            : "Breakdown",
      });
    }

    case "compare_categories": {
      if (!categoryName) {
        return { error: "categoryName required for comparison" };
      }

      const names = categoryName.split(",").map((s) => s.trim());
      if (names.length < 2) {
        return { error: "Need at least 2 categories to compare" };
      }

      const categories = await Category.find({
        name: { $in: names.map((n) => new RegExp(n, "i")) },
      }).lean();

      if (categories.length < 2) {
        return { error: "Could not find at least 2 categories to compare" };
      }

      const comparisons = await Promise.all(
        categories.map(async (cat) => {
          const productMatch = applyScopeFilter(scope, organizationId, {
            categoryId: cat._id,
          });

          const stats = await Product.aggregate([
            { $match: productMatch },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                totalValue: {
                  $sum: { $multiply: ["$quantity", "$costPrice"] },
                },
                totalRevenue: {
                  $sum: { $multiply: ["$quantity", "$sellingPrice"] },
                },
                avgPrice: { $avg: "$sellingPrice" },
              },
            },
          ]);

          return {
            name: cat.name,
            productCount: stats[0]?.count || 0,
            totalValue: stats[0]?.totalValue || 0,
            totalRevenue: stats[0]?.totalRevenue || 0,
            avgPrice: stats[0]?.avgPrice || 0,
          };
        }),
      );

      return sanitizeForModel({
        comparison: comparisons,
      });
    }

    case "top_category": {
      const categories = await Category.find(match).lean();

      let topCategory = null;
      let maxValue = 0;

      for (const cat of categories) {
        const productMatch = applyScopeFilter(scope, organizationId, {
          categoryId: cat._id,
        });

        const result = await Product.aggregate([
          { $match: productMatch },
          {
            $group: {
              _id: null,
              totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
              count: { $sum: 1 },
            },
          },
        ]);

        const value = result[0]?.totalValue || 0;
        if (value > maxValue) {
          maxValue = value;
          topCategory = {
            name: cat.name,
            totalValue: value,
            productCount: result[0]?.count || 0,
          };
        }
      }

      return sanitizeForModel({
        topCategory,
        maxValue,
      });
    }

    case "lowest_category": {
      const categories = await Category.find(match).lean();

      let lowestCategory = null;
      let minValue = Infinity;

      for (const cat of categories) {
        const productMatch = applyScopeFilter(scope, organizationId, {
          categoryId: cat._id,
        });

        const result = await Product.aggregate([
          { $match: productMatch },
          {
            $group: {
              _id: null,
              totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
              count: { $sum: 1 },
            },
          },
        ]);

        const value = result[0]?.totalValue || 0;
        if (value < minValue) {
          minValue = value;
          lowestCategory = {
            name: cat.name,
            totalValue: value,
            productCount: result[0]?.count || 0,
          };
        }
      }

      return sanitizeForModel({
        lowestCategory,
        minValue,
      });
    }

    default: {
      return { error: `Unknown action: ${action}` };
    }
  }
};
