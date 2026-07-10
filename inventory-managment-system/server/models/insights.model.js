// models/insights.model.js
import mongoose from "mongoose";

const aiInsightsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    period: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    summaryText: {
      type: String,
    },
    keyMetrics: {
      topSellingProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },
      decliningProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },
      totalRevenue: {
        type: Number,
        required: true,
      },
      totalOrders: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const AiInsights = mongoose.model("AiInsights", aiInsightsSchema);

export default AiInsights;
