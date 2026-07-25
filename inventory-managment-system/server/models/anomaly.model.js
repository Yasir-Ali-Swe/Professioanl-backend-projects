import mongoose from "mongoose";

const anomalySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "dead_stock",
        "sales_spike",
        "suspicious_adjustment",
        "unusual_return",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const anomalyModel = mongoose.model("Anomaly", anomalySchema);
export default anomalyModel;
