// config/indexes.js
import mongoose from "mongoose";

export const createIndexes = async () => {
  try {
    // Product indexes
    const productModel = mongoose.model("Product");
    await productModel.collection.createIndex(
      { organizationId: 1, sku: 1 },
      { unique: true },
    );
    await productModel.collection.createIndex({
      organizationId: 1,
      categoryId: 1,
    });
    await productModel.collection.createIndex({
      organizationId: 1,
      supplierId: 1,
    });
    await productModel.collection.createIndex({
      organizationId: 1,
      quantity: 1,
    });
    await productModel.collection.createIndex({
      organizationId: 1,
      isActive: 1,
    });
    await productModel.collection.createIndex({
      organizationId: 1,
      createdAt: -1,
    });

    // Invoice indexes
    const invoiceModel = mongoose.model("Invoice");
    await invoiceModel.collection.createIndex(
      { organizationId: 1, invoiceNumber: 1 },
      { unique: true },
    );
    await invoiceModel.collection.createIndex({
      organizationId: 1,
      createdAt: -1,
      status: 1,
    });
    await invoiceModel.collection.createIndex({
      organizationId: 1,
      customerName: 1,
    });
    await invoiceModel.collection.createIndex({
      organizationId: 1,
      "products.productId": 1,
    });
    await invoiceModel.collection.createIndex({ organizationId: 1, status: 1 });

    // Purchase Order indexes
    const purchaseOrderModel = mongoose.model("PurchaseOrder");
    await purchaseOrderModel.collection.createIndex(
      { organizationId: 1, poNumber: 1 },
      { unique: true },
    );
    await purchaseOrderModel.collection.createIndex({
      organizationId: 1,
      supplierId: 1,
    });
    await purchaseOrderModel.collection.createIndex({
      organizationId: 1,
      status: 1,
    });
    await purchaseOrderModel.collection.createIndex({
      organizationId: 1,
      createdAt: -1,
    });

    // Stock Log indexes
    const stockLogModel = mongoose.model("StockLog");
    await stockLogModel.collection.createIndex({
      organizationId: 1,
      productId: 1,
      createdAt: -1,
    });
    await stockLogModel.collection.createIndex({
      organizationId: 1,
      type: 1,
      reason: 1,
    });
    await stockLogModel.collection.createIndex({
      organizationId: 1,
      performedBy: 1,
    });

    // Chat Log indexes (already defined in model but ensure they exist)
    const chatLogModel = mongoose.model("ChatLog");
    await chatLogModel.collection.createIndex({
      organizationId: 1,
      userId: 1,
      conversationId: 1,
      createdAt: -1,
    });
    await chatLogModel.collection.createIndex({
      organizationId: 1,
      userId: 1,
      createdAt: -1,
    });

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.error("Error creating indexes:", error.message);
  }
};
