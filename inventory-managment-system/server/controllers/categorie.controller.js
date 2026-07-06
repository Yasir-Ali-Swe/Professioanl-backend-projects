import categoryModel from "../models/categorie.model.js";
import slugify from "slugify";

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
    res
      .status(201)
      .json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
  } catch (error) {
    console.error("Error creating category:", error.message);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    const categories = await categoryModel
      .find({ organizationId })
      .select("-__v -updatedAt")
      .lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const categoryId = req.params.id;
    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }
    const category = await categoryModel
      .findById(categoryId)
      .select("-__v -updatedAt")
      .lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error("Error fetching category by ID:", error.message);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};
