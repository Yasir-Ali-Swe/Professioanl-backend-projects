import productModel from "../models/product.model.js";
import categoryModel from "../models/category.model.js";
import supplierModel from "../models/supplier.model.js";

export const uploadProductImage = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const productId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const product = await productModel
      .findOneAndUpdate(
        { _id: productId, organizationId },
        { imageUrl: req.file.path },
        { new: true },
      )
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

    res.status(200).json({
      success: true,
      message: "Product image uploaded successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error uploading product image:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

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
      imageUrl,
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

    if (costPrice < 0 || sellingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost price and selling price cannot be negative",
      });
    }

    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    if (reorderThreshold !== undefined && reorderThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: "Reorder threshold cannot be negative",
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
      imageUrl: imageUrl || null, // Add this
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

    if (categoryName) {
      const category = await categoryModel.findOne({
        organizationId,
        name: { $regex: categoryName, $options: "i" },
      });
      if (category) {
        query.categoryId = category._id;
      } else {
        query.categoryId = null;
      }
    }

    if (supplierName) {
      const supplier = await supplierModel.findOne({
        organizationId,
        name: { $regex: supplierName, $options: "i" },
      });
      if (supplier) {
        query.supplierId = supplier._id;
      } else {
        query.supplierId = null;
      }
    }

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

    const products = await productModel
      .find(query)
      .populate("categoryId", "name categorySlug")
      .populate("supplierId", "name contactPerson phone email address")
      .populate("createdBy", "name role")
      .select("-__v -updatedAt")
      .sort({
        [sortBy]: order === "asc" ? 1 : -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      organizationId: product.organizationId,
      name: product.name,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      // Category details
      category: product.categoryId
        ? {
          _id: product.categoryId._id,
          name: product.categoryId.name,
          categorySlug: product.categoryId.categorySlug,
        }
        : null,
      // Supplier details
      supplier: product.supplierId
        ? {
          _id: product.supplierId._id,
          name: product.supplierId.name,
          contactPerson: product.supplierId.contactPerson,
          phone: product.supplierId.phone,
          email: product.supplierId.email || null,
          address: product.supplierId.address || null,
        }
        : null,
      // Created by details (as string)
      createdBy: product.createdBy
        ? `${product.createdBy.name} (${product.createdBy.role})`
        : null,
    }));

    const activeProductsCount = await productModel.countDocuments({
      organizationId,
      isActive: true,
    });
    const lowStockProductsCount = await productModel.countDocuments({
      organizationId,
      $expr: { $lte: ["$quantity", "$reorderThreshold"] },
    });

    res.status(200).json({
      success: true,
      data: formattedProducts,
      total: totalProducts,
      activeCount: activeProductsCount,
      lowStockCount: lowStockProductsCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalProducts / Number(limit)),
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

    if (costPrice !== undefined && costPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Cost price cannot be negative",
      });
    }

    if (sellingPrice !== undefined && sellingPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Selling price cannot be negative",
      });
    }

    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
    }

    if (reorderThreshold !== undefined && reorderThreshold < 0) {
      return res.status(400).json({
        success: false,
        message: "Reorder threshold cannot be negative",
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
      .populate(
        "supplierId",
        "name contactPerson email phone address leadTimeDays",
      )
      .populate("createdBy", "name email role")
      .select("-__v")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const totalInventoryValue = product.quantity * product.costPrice;
    const totalSalesValue = product.quantity * product.sellingPrice;
    const profitMargin = product.sellingPrice - product.costPrice;
    const profitMarginPercentage =
      product.costPrice > 0
        ? (
          ((product.sellingPrice - product.costPrice) / product.costPrice) *
          100
        ).toFixed(2)
        : 0;

    const needsReorder = product.quantity <= product.reorderThreshold;

    const formattedProduct = {
      _id: product._id,
      organizationId: product.organizationId,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      needsReorder: needsReorder,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      profitMargin: profitMargin,
      profitMarginPercentage: parseFloat(profitMarginPercentage),
      totalInventoryValue: totalInventoryValue,
      totalSalesValue: totalSalesValue,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categoryId: product.categoryId?._id || product.categoryId || null,
      supplierId: product.supplierId?._id || product.supplierId || null,
      category: product.categoryId
        ? {
          _id: product.categoryId._id,
          name: product.categoryId.name,
          categorySlug: product.categoryId.categorySlug,
        }
        : null,
      supplier: product.supplierId
        ? {
          _id: product.supplierId._id,
          name: product.supplierId.name,
          contactPerson: product.supplierId.contactPerson,
          email: product.supplierId.email || null,
          phone: product.supplierId.phone,
          address: product.supplierId.address || null,
          leadTimeDays: product.supplierId.leadTimeDays || null,
        }
        : null,
      createdBy: product.createdBy
        ? `${product.createdBy.name} (${product.createdBy.role})`
        : null,
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

    if (isActive === undefined || isActive === null) {
      return res.status(400).json({
        success: false,
        message: "isActive field is required",
      });
    }

    // Convert string to boolean if needed
    let activeStatus = isActive;
    if (typeof isActive === "string") {
      activeStatus = isActive.toLowerCase() === "true";
    }

    const updatedProduct = await productModel
      .findOneAndUpdate(
        { _id: productId, organizationId },
        { isActive: activeStatus },
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
      message: `Product ${activeStatus ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    console.error("Error toggling product active status:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
