import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import supplierModel from "../models/supplier.model.js";

export const createProduct = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const {
      name,
      categoryId,
      supplierId,
      sku,
      quantity,
      reorderThreshold,
      costPrice,
      sellingPrice,
      unit,
    } = req.body;

    if (
      !name ||
      !categoryId ||
      !supplierId ||
      !costPrice ||
      !sellingPrice ||
      !unit
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, categoryId, supplierId, costPrice, sellingPrice, and unit are required",
      });
    }

    const category = await categoryModel.findOne({
      _id: categoryId,
      organizationId,
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const supplier = await supplierModel.findOne({
      _id: supplierId,
      organizationId,
    });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    let finalSku = sku;
    if (!sku) {
      const categoryPrefix = category.categorySlug
        .toUpperCase()
        .substring(0, 4);
      const count = await productModel.countDocuments({
        organizationId,
        categoryId,
      });
      finalSku = `${categoryPrefix}-${String(count + 1).padStart(4, "0")}`;
    } else {
      const existingProduct = await productModel.findOne({
        organizationId,
        sku,
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    const product = await productModel.create({
      organizationId,
      name,
      categoryId,
      supplierId,
      sku: finalSku,
      quantity: quantity || 0,
      reorderThreshold: reorderThreshold || 10,
      costPrice,
      sellingPrice,
      unit,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};



export const getAllProducts = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const {
      page = 1,
      limit = 10,
      search,
      categoryName,
      supplierName,
      unit,
      isActive,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { organizationId };

    if (unit) {
      query.unit = unit;
    }

    if (isActive === "true") {
      query.isActive = true;
    } else if (isActive === "false") {
      query.isActive = false;
    }

    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalProducts = await productModel.countDocuments(query);

    let products = await productModel
      .find(query)
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name contactPerson phone")
      .select("-__v -updatedAt")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (categoryName) {
      products = products.filter(
        (product) =>
          product.categoryId &&
          product.categoryId.name
            .toLowerCase()
            .includes(categoryName.toLowerCase()),
      );
    }

    if (supplierName) {
      products = products.filter(
        (product) =>
          product.supplierId &&
          product.supplierId.name
            .toLowerCase()
            .includes(supplierName.toLowerCase()),
      );
    }

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      organizationId: product.organizationId,
      categoryId: product.categoryId?._id || null,
      supplierId: product.supplierId?._id || null,
      name: product.name,
      categoryName: product.categoryId?.name || null,
      categorySlug: product.categoryId?.categorySlug || null,
      supplierName: product.supplierId?.name || null,
      supplierContact: product.supplierId?.contactPerson || null,
      supplierPhone: product.supplierId?.phone || null,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdBy: product.createdBy,
      createdAt: product.createdAt,
    }));

    const filteredTotal = formattedProducts.length;

    res.status(200).json({
      success: true,
      data: formattedProducts,
      total: filteredTotal,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filteredTotal / Number(limit)),
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;
    const {
      name,
      categoryId,
      supplierId,
      quantity,
      reorderThreshold,
      costPrice,
      sellingPrice,
      unit,
    } = req.body;

    if (!organizationId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and product ID are required",
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (categoryId) updateData.categoryId = categoryId;
    if (supplierId) updateData.supplierId = supplierId;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (reorderThreshold !== undefined)
      updateData.reorderThreshold = reorderThreshold;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (unit) updateData.unit = unit;

    const updatedProduct = await productModel
      .findOneAndUpdate({ _id: productId, organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-__v -updatedAt");

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;

    if (!organizationId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and product ID are required",
      });
    }

    const product = await productModel
      .findOne({ _id: productId, organizationId })
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name contactPerson phone")
      .select("-__v -updatedAt")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const formattedProduct = {
      _id: product._id,
      organizationId: product.organizationId,
      categoryId: product.categoryId?._id || null,
      supplierId: product.supplierId?._id || null,
      name: product.name,
      categoryName: product.categoryId?.name || null,
      categorySlug: product.categoryId?.categorySlug || null,
      supplierName: product.supplierId?.name || null,
      supplierContact: product.supplierId?.contactPerson || null,
      supplierPhone: product.supplierId?.phone || null,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdBy: product.createdBy,
      createdAt: product.createdAt,
    };

    res.status(200).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    console.error("Error fetching product by ID:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const toggleProductActive = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;
    const { isActive } = req.body;

    if (!organizationId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and product ID are required",
      });
    }

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive field is required",
      });
    }

    const updatedProduct = await productModel
      .findOneAndUpdate(
        { _id: productId, organizationId },
        { isActive },
        { new: true, runValidators: true },
      )
      .select("-__v -updatedAt");

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Product ${isActive ? "activated" : "deactivated"} successfully`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error toggling product active status:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
