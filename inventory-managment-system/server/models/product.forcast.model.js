import mongoose from "mongoose";

const demandForecastSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    predictedDemand: {
      type: Number,
      required: true,
      min: 0,
    },
    forecastPeriod: {
      type: String,
      enum: ["7_days", "30_days", "90_days"],
      required: true,
    },
    daysUntilStockout: {
      type: Number,
      min: 0,
      default: null,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    modelUsed: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const DemandForecast = mongoose.model("DemandForecast", demandForecastSchema);
export default DemandForecast;
