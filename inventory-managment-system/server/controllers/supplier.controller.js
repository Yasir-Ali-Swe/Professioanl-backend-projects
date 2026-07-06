import supplierModel from "../models/supplier.model.js";
import productModel from "../models/product.model.js";

export const createSupplier = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const createdBy = req.user._id;
    const { name, contactPerson, email, phone, address, leadTimeDays } =
      req.body;

    if (!name || !contactPerson || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Name, contactPerson, phone, and address are required",
      });
    }

    const supplier = await supplierModel.create({
      organizationId,
      name,
      contactPerson,
      email,
      phone,
      address,
      leadTimeDays,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Error creating supplier:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAllSuppliers = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const suppliers = await supplierModel
      .find({ organizationId })
      .select("-__v -updatedAt")
      .lean();

    res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSupplierByIdWithProducts = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const supplierId = req.params.id;

    if (!organizationId || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and supplier ID are required",
      });
    }

    const supplier = await supplierModel
      .findOne({ _id: supplierId, organizationId })
      .select("name contactPerson email phone address leadTimeDays createdAt")
      .lean();

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const products = await productModel
      .find({ organizationId, supplierId })
      .populate("categoryId", "categorySlug")
      .select(
        "name sku quantity reorderThreshold costPrice sellingPrice unit imageUrl isActive createdAt",
      )
      .lean();

    const formattedProducts = products.map((product) => ({
      name: product.name,
      categorySlug: product.categoryId?.categorySlug || null,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        supplier,
        products: formattedProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier with products:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const supplierId = req.params.id;

    if (!organizationId || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and supplier ID are required",
      });
    }

    const deletedSupplier = await supplierModel.findOneAndDelete({
      _id: supplierId,
      organizationId,
    });

    if (!deletedSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting supplier:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const supplierId = req.params.id;
    const { name, contactPerson, email, phone, address, leadTimeDays } =
      req.body;

    if (!organizationId || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and supplier ID are required",
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (contactPerson) updateData.contactPerson = contactPerson;
    if (email !== undefined) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (leadTimeDays !== undefined) updateData.leadTimeDays = leadTimeDays;

    const updatedSupplier = await supplierModel
      .findOneAndUpdate({ _id: supplierId, organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-__v -updatedAt");

    if (!updatedSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: updatedSupplier,
    });
  } catch (error) {
    console.error("Error updating supplier:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
