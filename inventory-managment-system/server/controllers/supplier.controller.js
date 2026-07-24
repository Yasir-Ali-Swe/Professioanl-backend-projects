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

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (leadTimeDays !== undefined && leadTimeDays !== null && leadTimeDays < 0) {
      return res.status(400).json({
        success: false,
        message: "Lead time cannot be negative",
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
      .populate("createdBy", "name role")
      .lean();

    // Fetch products count for each supplier
    const suppliersWithProductCounts = await Promise.all(
      suppliers.map(async (supplier) => {
        const count = await productModel.countDocuments({
          supplierId: supplier._id,
          organizationId,
        });
        return {
          _id: supplier._id,
          organizationId: supplier.organizationId,
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          leadTimeDays: supplier.leadTimeDays,
          createdBy: supplier.createdBy
            ? `${supplier.createdBy.name} (${supplier.createdBy.role})`
            : null,
          createdAt: supplier.createdAt,
          productsCount: count,
          isActive: count > 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: suppliersWithProductCounts,
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
      .populate("createdBy", "name role")
      .lean();

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const products = await productModel
      .find({ organizationId, supplierId })
      .populate("categoryId", "name categorySlug")
      .populate("createdBy", "name role")
      .select(
        "name sku quantity reorderThreshold costPrice sellingPrice unit imageUrl isActive createdAt",
      )
      .lean();

    // Format supplier with createdBy as string
    const formattedSupplier = {
      _id: supplier._id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      leadTimeDays: supplier.leadTimeDays,
      createdBy: supplier.createdBy
        ? `${supplier.createdBy.name} (${supplier.createdBy.role})`
        : null,
      createdAt: supplier.createdAt,
    };

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.categoryId
        ? {
          _id: product.categoryId._id,
          name: product.categoryId.name,
          categorySlug: product.categoryId.categorySlug,
        }
        : null,
      sku: product.sku,
      quantity: product.quantity,
      reorderThreshold: product.reorderThreshold,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      unit: product.unit,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdBy: product.createdBy
        ? `${product.createdBy.name} (${product.createdBy.role})`
        : null,
      createdAt: product.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        supplier: formattedSupplier,
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

    const productsCount = await productModel.countDocuments({
      supplierId,
      organizationId,
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. ${productsCount} product(s) are associated with this supplier.`,
      });
    }

    await supplierModel.findOneAndDelete({
      _id: supplierId,
      organizationId,
    });

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

    if (email !== undefined && email !== null && email !== "" && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (leadTimeDays !== undefined && leadTimeDays !== null && leadTimeDays < 0) {
      return res.status(400).json({
        success: false,
        message: "Lead time cannot be negative",
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
    });
  } catch (error) {
    console.error("Error updating supplier:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
