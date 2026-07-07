// services/forecast.service.js
import productModel from "../models/product.model.js";
import stockLogModel from "../models/stockLog.model.js";
import demandForecastModel from "../models/product.forcast.model.js";
import organizationModel from "../models/organization.model.js";

export const generateForecastForProduct = async (organizationId, productId) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const salesLogs = await stockLogModel.find({
    organizationId,
    productId,
    type: "out",
    reason: "sale",
    createdAt: { $gte: ninetyDaysAgo },
  });

  const totalSold = salesLogs.reduce((sum, log) => sum + log.quantity, 0);
  const avgDailySales = totalSold / 90;

  const product = await productModel.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const daysUntilStockout =
    avgDailySales > 0 ? Math.floor(product.quantity / avgDailySales) : null;
  const predictedDemand = Math.round(avgDailySales * 30);

  const confidence = salesLogs.length >= 10 ? 0.8 : salesLogs.length >= 5 ? 0.6 : 0.4;

  const forecast = await demandForecastModel.create({
    organizationId,
    productId,
    predictedDemand,
    forecastPeriod: "30_days",
    daysUntilStockout,
    confidence,
    modelUsed: "moving_average_v1",
  });

  return forecast;
};

export const generateForecastsForAllOrgs = async () => {
  const organizations = await organizationModel.find({ status: "active" });

  for (const org of organizations) {
    const products = await productModel.find({
      organizationId: org._id,
      isActive: true,
    });
    for (const product of products) {
      try {
        await generateForecastForProduct(org._id, product._id);
      } catch (error) {
        console.error(
          `Forecast failed for product ${product._id} in org ${org._id}:`,
          error.message
        );
      }
    }
  }
};