import mongoose from "mongoose";

const chatLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
      default: null, // e.g. "low_stock_check", "sales_query" — useful if you classify intents
    },
  },
  { timestamps: true },
);

chatLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

const chatLogModel = mongoose.model("ChatLog", chatLogSchema);
export default chatLogModel;
