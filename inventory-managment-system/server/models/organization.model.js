import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "trial"],
      default: "active",
    },
    invoiceSettings: {
      taxRate: {
        type: Number,
        default: 0,
      },
      defaultDiscount: {
        type: Number,
        default: 0,
      },
      invoicePrefix: {
        type: String,
        default: "INV",
      },
      nextInvoiceNumber: {
        type: Number,
        default: 1,
      },
    },
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
  },
  { timestamps: true },
);

const organizationModel = mongoose.model("Organization", organizationSchema);
export default organizationModel;
