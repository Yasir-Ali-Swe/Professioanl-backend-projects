// models/subscription.model.js
import mongoose from "mongoose";

const subscriptionRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled", "incomplete"],
      default: "incomplete",
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionRecordSchema);
