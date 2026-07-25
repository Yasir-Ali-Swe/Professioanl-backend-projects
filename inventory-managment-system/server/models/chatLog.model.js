import mongoose from "mongoose";

const chatLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    query: { type: String, required: true },
    response: { type: String, required: true },
    intent: { type: String, default: null },
  },
  { timestamps: true },
);

chatLogSchema.index({
  organizationId: 1,
  userId: 1,
  conversationId: 1,
  createdAt: -1,
});
chatLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export default mongoose.model("ChatLog", chatLogSchema);
