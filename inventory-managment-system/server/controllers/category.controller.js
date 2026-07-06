import categoryModel from "../models/categorie.model.js";
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
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error.message);
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
    const categorySlug = slugify(name, { lower: true, strict: true });

    const updatedCategory = await categoryModel.findOneAndUpdate(
      { _id: categoryId, organizationId },
      { name, categorySlug },
      { new: true },
    );
    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error.message);
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
      .lean();
    res.status(200).json({ success: true, data: categories });
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
      .findById(categoryId)
      .select("-__v -updatedAt")
      .lean();
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.status(200).json({ success: true, data: category });
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID and category slug are required",
        });
    }

    const category = await categoryModel
      .findOne({ organizationId, slug: categorySlug })
      .select("-__v -updatedAt")
      .lean();

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID and category ID are required",
        });
    }
    const products = await productModel
      .find({ organizationId, categoryId })
      .select("-__v -updatedAt")
      .lean();
    res.status(200).json({ success: true, data: products });
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

    const deletedCategory = await categoryModel.findOneAndDelete({
      _id: categoryId,
      organizationId,
    });

    if (!deletedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
