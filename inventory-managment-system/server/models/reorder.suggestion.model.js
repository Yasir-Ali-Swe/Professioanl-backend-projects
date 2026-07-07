import mongoose from "mongoose";

const reorderSuggestionSchema = new mongoose.Schema(
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
    suggestedQuantity: {
      type: Number,
      required: true,
    },
    suggestedReorderDate: {
      type: Date,
      required: true,
    },
    reasoning: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "actioned", "dismissed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const ReorderSuggestion = mongoose.model(
  "ReorderSuggestion",
  reorderSuggestionSchema,
);
export default ReorderSuggestion;
