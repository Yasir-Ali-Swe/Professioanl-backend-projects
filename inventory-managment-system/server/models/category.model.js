import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    categorySlug: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ organizationId: 1, name: 1 }, { unique: true });
const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
