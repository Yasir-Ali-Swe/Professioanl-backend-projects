import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    poNumber: {
      type: String,
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        unitCost: {
          type: Number,
          required: true,
        },
      },
    ],
    totalCost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "fulfilled"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    generatedFromAI: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

purchaseOrderSchema.index({ organizationId: 1, poNumber: 1 }, { unique: true });
const purchaseOrderModel = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export default purchaseOrderModel;
