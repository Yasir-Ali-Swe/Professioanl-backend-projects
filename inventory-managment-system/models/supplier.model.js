import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: true,
    },
    supplierCompanyName: {
      type: String,
      required: true,
    },
    supplierEmail: {
      type: String,
      required: true,
    },
    supplierPhone: {
      type: String,
      required: true,
    },
    supplierAddress: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Supplier = mongoose.model("Supplier", supplierSchema);
