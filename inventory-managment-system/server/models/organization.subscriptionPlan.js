//models/Organization.subscriptionPlan.model.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    price: {
      type: Number,
      default: 0,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    aiFeatures: {
      type: Boolean,
      default: false,
    },
    stripePriceId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("SubscriptionPlan", subscriptionSchema);
