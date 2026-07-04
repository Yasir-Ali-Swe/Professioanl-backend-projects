import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    name:{
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true,
  },
);

const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
