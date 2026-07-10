// services/stock.service.js
import stockLogModel from "../models/stockLog.model.js";
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
    throw { status: 404, message: "Product not found" };
  }

  const oldQuantity = product.quantity;
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
      sku: product.sku,
      quantity: product.quantity,
      oldQuantity,
      newQuantity: product.quantity,
      unit: product.unit,
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
    throw { status: 404, message: "Product not found" };
  }

  if (product.quantity < quantity) {
    throw {
      status: 400,
      message: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}`,
    };
  }

  const oldQuantity = product.quantity;
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
      sku: product.sku,
      quantity: product.quantity,
      oldQuantity,
      newQuantity: product.quantity,
      unit: product.unit,
    },
    stockLog,
  };
};
