// services/reorderSuggestion.service.js
import Product from "../models/product.model.js";
import Supplier from "../models/supplier.model.js";
import DemandForecast from "../models/product.forcast.model.js";
import ReorderSuggestion from "../models/reorder.suggestion.model.js";
import Organization from "../models/organization.model.js";

export const generateReorderSuggestionForProduct = async (
  organizationId,
  productId,
) => {
  // 1. Get the latest forecast for this product
  const forecast = await DemandForecast.findOne({
    organizationId,
    productId,
  }).sort({ createdAt: -1 });

  if (!forecast || forecast.daysUntilStockout === null) {
    return null; // No data to base a suggestion on
  }

  const product = await Product.findById(productId);
  if (!product) return null;

  const supplier = await Supplier.findById(product.supplierId);
  const leadTimeDays = supplier?.leadTimeDays ?? 7; // Fallback if not set

  // 2. Only suggest reorder if stock will run out before a new order would arrive
  if (forecast.daysUntilStockout > leadTimeDays) {
    return null; // Plenty of time, no suggestion needed
  }

  // 3. Avoid duplicate pending suggestions for the same product
  const existing = await ReorderSuggestion.findOne({
    organizationId,
    productId,
    status: "pending",
  });
  if (existing) return existing;

  // 4. Calculate suggested quantity — cover predicted demand minus what's currently in stock
  const suggestedQuantity = Math.max(
    forecast.predictedDemand - product.quantity,
    product.reorderThreshold,
  );

  const suggestedReorderDate = new Date(); // Urgent — order today

  const reasoning = `Stock will run out in ${forecast.daysUntilStockout} day(s), but supplier lead time is ${leadTimeDays} day(s). Reorder now to avoid a stockout.`;

  const suggestion = await ReorderSuggestion.create({
    organizationId,
    productId,
    suggestedQuantity,
    suggestedReorderDate,
    reasoning,
    status: "pending",
  });

  return suggestion;
};

export const generateReorderSuggestionsForAllOrgs = async () => {
  const organizations = await Organization.find({ status: "active" });

  for (const org of organizations) {
    const products = await Product.find({
      organizationId: org._id,
      isActive: true,
    });
    for (const product of products) {
      try {
        await generateReorderSuggestionForProduct(org._id, product._id);
      } catch (error) {
        console.error(
          `Reorder suggestion failed for product ${product._id}:`,
          error.message,
        );
      }
    }
  }
};
