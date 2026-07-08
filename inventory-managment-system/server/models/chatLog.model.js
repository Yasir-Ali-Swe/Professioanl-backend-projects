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
    query: { type: String, required: true },
    response: { type: String, required: true },
    intent: { type: String, default: null },
  },
  { timestamps: true },
);

chatLogSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export default mongoose.model("ChatLog", chatLogSchema);
