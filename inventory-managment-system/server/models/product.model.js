import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    productCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    productSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    productCostPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    productSellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    productCurrentStock: {
      type: Number,
      required: true,
      min: 0,
    },
    productReorderLevel: {
      type: Number,
      default: 10,
    },
    productImageUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);
