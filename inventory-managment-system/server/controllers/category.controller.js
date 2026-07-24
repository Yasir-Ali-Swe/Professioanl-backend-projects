import categoryModel from "../models/category.model.js";
import slugify from "slugify";
import productModel from "../models/product.model.js";

export const createCategory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }
    const existingCategory = await categoryModel.findOne({
      organizationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const categorySlug = slugify(name, { lower: true, strict: true });
    const category = await categoryModel.create({
      organizationId,
      name,
      categorySlug,
      createdBy,
    });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Error creating category:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }
    const categoryId = req.params.id;
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }
    const existingCategory = await categoryModel.findOne({
      organizationId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: categoryId },
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const categorySlug = slugify(name, { lower: true, strict: true });

    const updatedCategory = await categoryModel.findOneAndUpdate(
      { _id: categoryId, organizationId },
      { name, categorySlug },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const categories = await categoryModel
      .find({ organizationId })
      .select("-__v -updatedAt")
      .populate("createdBy", "name role") // Populate createdBy with name and role
      .lean();

    // Fetch products count for each category
    const categoriesWithProductCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await productModel.countDocuments({
          categoryId: category._id,
          organizationId,
        });
        return {
          _id: category._id,
          organizationId: category.organizationId,
          name: category.name,
          categorySlug: category.categorySlug,
          createdBy: category.createdBy
            ? {
              name: category.createdBy.name,
              role: category.createdBy.role,
            }
            : null,
          createdAt: category.createdAt,
          productsCount: count,
          isActive: count > 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithProductCounts,
    });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const categoryId = req.params.id;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const category = await categoryModel
      .findOne({ _id: categoryId, organizationId })
      .select("-__v -updatedAt")
      .populate("createdBy", "name role")
      .lean();

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Format the response
    const formattedCategory = {
      _id: category._id,
      organizationId: category.organizationId,
      name: category.name,
      categorySlug: category.categorySlug,
      createdBy: category.createdBy
        ? {
          name: category.createdBy.name,
          role: category.createdBy.role,
        }
        : null,
      createdAt: category.createdAt,
    };

    res.status(200).json({
      success: true,
      data: formattedCategory,
    });
  } catch (error) {
    console.error("Error fetching category by ID:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const categorySlug = req.params.slug;

    if (!organizationId || !categorySlug) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and category slug are required",
      });
    }

    const category = await categoryModel
      .findOne({ organizationId, categorySlug })
      .select("-__v -updatedAt")
      .populate("createdBy", "name role")
      .lean();

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const formattedCategory = {
      _id: category._id,
      organizationId: category.organizationId,
      name: category.name,
      categorySlug: category.categorySlug,
      createdBy: category.createdBy
        ? {
          name: category.createdBy.name,
          role: category.createdBy.role,
        }
        : null,
      createdAt: category.createdAt,
    };

    res.status(200).json({
      success: true,
      data: formattedCategory,
    });
  } catch (error) {
    console.error("Error fetching category by slug:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getCategoryProducts = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const categoryId = req.params.id;

    if (!organizationId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and category ID are required",
      });
    }

    const products = await productModel
      .find({ organizationId, categoryId })
      .select("-__v -updatedAt")
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name email phone")
      .populate("createdBy", "name role")
      .lean();

    // Format with string IDs but include additional fields
    const formattedProducts = products.map((product) => ({
      _id: product._id,
      organizationId: product.organizationId,
      name: product.name,
      categoryId: product.categoryId ? product.categoryId._id : null,
      categoryName: product.categoryId?.name || null,
      categorySlug: product.categoryId?.categorySlug || null,
      supplierId: product.supplierId ? product.supplierId._id : null,
      supplierName: product.supplierId?.name || null,
      supplierEmail: product.supplierId?.email || null,
      supplierPhone: product.supplierId?.phone || null,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdBy: product.createdBy ? product.createdBy._id : null,
      createdByName: product.createdBy?.name || null,
      createdByRole: product.createdBy?.role || null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching category products:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const categoryId = req.params.id;

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    if (!categoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    const category = await categoryModel.findOne({
      _id: categoryId,
      organizationId,
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    const productsCount = await productModel.countDocuments({
      categoryId,
      organizationId,
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productsCount} product(s) are associated with this category.`,
      });
    }

    await categoryModel.findOneAndDelete({
      _id: categoryId,
      organizationId,
    });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
