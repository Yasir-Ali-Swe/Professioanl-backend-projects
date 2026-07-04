import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    contactEmail:{
        type: String,
        required: true,
        unique: true
    },
    address:{
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: true
    },
    logoUrl:{
        type: String,
        default: null
    },
    status:{
        type: String,
        enum: ["active", "suspended", "trial"],
        default: "trial"
    },
    subscriptionPlan:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPlan",
        default: null
    }
}, { timestamps: true });

const organizationModel = mongoose.model("Organization", organizationSchema);
export default organizationModel;


