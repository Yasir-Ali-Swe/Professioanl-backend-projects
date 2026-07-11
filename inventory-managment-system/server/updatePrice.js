// updatePrice.js
import mongoose from "mongoose";
import subscriptionPlanModel from "./models/organization.subscriptionPlan.js";
import { MONGODB_URI } from "./config/env.js";

async function updatePrice() {
  try {
    await mongoose.connect(MONGODB_URI);

    // Check if premium plan exists
    let premium = await subscriptionPlanModel.findOne({ name: "premium" });
    
    if (!premium) {
      console.log("📋 Premium plan not found. Creating it...");
      
      // Create free plan if it doesn't exist
      const free = await subscriptionPlanModel.findOne({ name: "free" });
      if (!free) {
        await subscriptionPlanModel.create({
          name: "free",
          price: 0,
          billingCycle: "monthly",
          aiFeatures: false,
          stripePriceId: null,
        });
        console.log("✅ Free plan created");
      }
      
      // Create premium plan
      premium = await subscriptionPlanModel.create({
        name: "premium",
        price: 29.99,
        billingCycle: "monthly",
        aiFeatures: true,
        stripePriceId: "price_1TrvftRs50UOzcaGtffrkRUf",
      });
      console.log("✅ Premium plan created with Price ID:", premium.stripePriceId);
    } else {
      // Update existing premium plan (fixed deprecation warning)
      const updated = await subscriptionPlanModel.findOneAndUpdate(
        { name: "premium" },
        { 
          stripePriceId: "price_1TrvftRs50UOzcaGtffrkRUf",
          price: 29.99,
          billingCycle: "monthly",
          aiFeatures: true,
        },
        { 
          new: true,
          returnDocument: 'after' // <-- Fixes the deprecation warning
        }
      );
      console.log("✅ Updated premium plan:", updated);
    }

    // Verify the plans
    const allPlans = await subscriptionPlanModel.find({});
    console.log("\n📋 All plans in database:");
    allPlans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price} (${plan.stripePriceId || 'No Price ID'})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updatePrice();