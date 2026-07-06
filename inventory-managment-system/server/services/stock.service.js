import stockLogModel from "../models/stock.log.model.js";
import productModel from "../models/product.model.js";

export const performStockIn = async ({
  organizationId,
  productId,
  quantity,
  reason,
  relatedPurchaseOrderId = null,
  performedBy,
}) => {
  const product = await productModel.findOne({
    _id: productId,
    organizationId,
  });
  if (!product) {
    throw new Error("Product not found");
  }

  product.quantity += quantity;
  await product.save();

  const stockLog = await stockLogModel.create({
    organizationId,
    productId,
    type: "in",
    reason,
    quantity,
    relatedPurchaseOrderId,
    performedBy,
  });

  return {
    product: {
      _id: product._id,
      name: product.name,
      quantity: product.quantity,
    },
    stockLog,
  };
};

export const performStockOut = async ({
  organizationId,
  productId,
  quantity,
  reason,
  relatedInvoiceId = null,
  performedBy,
}) => {
  const product = await productModel.findOne({
    _id: productId,
    organizationId,
  });
  if (!product) {
    throw new Error("Product not found");
  }

  if (product.quantity < quantity) {
    throw new Error("Insufficient stock");
  }

  product.quantity -= quantity;
  await product.save();

  const stockLog = await stockLogModel.create({
    organizationId,
    productId,
    type: "out",
    reason,
    quantity,
    relatedInvoiceId,
    performedBy,
  });

  return {
    product: {
      _id: product._id,
      name: product.name,
      quantity: product.quantity,
    },
    stockLog,
  };
};
