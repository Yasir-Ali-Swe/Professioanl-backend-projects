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
  const product = await productModel.findOneAndUpdate(
    { _id: productId, organizationId },
    { $inc: { quantity: quantity } },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw { status: 404, message: "Product not found" };
  }

  const newQuantity = product.quantity;
  const oldQuantity = newQuantity - quantity;

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
      quantity: newQuantity,
      oldQuantity,
      newQuantity,
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
  const product = await productModel.findOneAndUpdate(
    { _id: productId, organizationId, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true, runValidators: true }
  );

  if (!product) {
    const exists = await productModel.findOne({ _id: productId, organizationId });
    if (!exists) {
      throw { status: 404, message: "Product not found" };
    }
    throw {
      status: 400,
      message: `Insufficient stock. Available: ${exists.quantity}, Requested: ${quantity}`,
    };
  }

  const newQuantity = product.quantity;
  const oldQuantity = newQuantity + quantity;

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
      quantity: newQuantity,
      oldQuantity,
      newQuantity,
      unit: product.unit,
    },
    stockLog,
  };
};
