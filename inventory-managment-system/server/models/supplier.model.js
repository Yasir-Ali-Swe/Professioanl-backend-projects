import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
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
    contactPerson: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || v === '' || /^\S+@\S+\.\S+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    leadTimeDays: {
      type: Number,
      default: null,
      min: [0, 'Lead time cannot be negative']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const supplierModel = mongoose.model("Supplier", supplierSchema);
export default supplierModel;
