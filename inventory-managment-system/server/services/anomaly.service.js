// services/anomaly.service.js
import productModel from "../models/product.model.js";
import stockLogModel from "../models/stockLog.model.js";
import anomalyModel from "../models/anomaly.model.js";
import organizationModel from "../models/organization.model.js";

const detectDeadStock = async (organizationId) => {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const products = await productModel.find({
    organizationId,
    isActive: true,
    quantity: { $gt: 0 },
  });

  for (const product of products) {
    const recentSales = await stockLogModel.countDocuments({
      organizationId,
      productId: product._id,
      type: "out",
      reason: "sale",
      createdAt: { $gte: sixtyDaysAgo },
    });

    if (recentSales === 0) {
      const existing = await anomalyModel.findOne({
        organizationId,
        productId: product._id,
        type: "dead_stock",
        isResolved: false,
      });

      if (!existing) {
        await anomalyModel.create({
          organizationId,
          type: "dead_stock",
          productId: product._id,
          description: `${product.name} has had no sales in 60 days but has ${product.quantity} units in stock.`,
          severity: "medium",
        });
      }
    }
  }
};

const detectSalesSpikes = async (organizationId) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const products = await productModel.find({ organizationId, isActive: true });

  for (const product of products) {
    const historicalLogs = await stockLogModel.find({
      organizationId,
      productId: product._id,
      type: "out",
      reason: "sale",
      createdAt: { $gte: ninetyDaysAgo, $lt: startOfToday },
    });

    const avgDailySales =
      historicalLogs.reduce((sum, l) => sum + l.quantity, 0) / 90;

    const todaySales = await stockLogModel.aggregate([
      {
        $match: {
          organizationId,
          productId: product._id,
          type: "out",
          reason: "sale",
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$quantity" },
        },
      },
    ]);

    const todayTotal = todaySales[0]?.total || 0;

    if (avgDailySales > 0 && todayTotal > avgDailySales * 3) {
      const existing = await anomalyModel.findOne({
        organizationId,
        productId: product._id,
        type: "sales_spike",
        isResolved: false,
      });

      if (!existing) {
        await anomalyModel.create({
          organizationId,
          type: "sales_spike",
          productId: product._id,
          description: `${product.name} sold ${todayTotal} units today, over 3x the usual average of ${avgDailySales.toFixed(1)}.`,
          severity: "low",
        });
      }
    }
  }
};

const detectSuspiciousAdjustments = async (organizationId) => {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const LARGE_THRESHOLD = 50;

  const adjustments = await stockLogModel.find({
    organizationId,
    reason: "adjustment",
    createdAt: { $gte: last24Hours },
  });

  for (const log of adjustments) {
    if (log.quantity > LARGE_THRESHOLD) {
      const existing = await anomalyModel.findOne({
        organizationId,
        productId: log.productId,
        type: "suspicious_adjustment",
        isResolved: false,
      });

      if (!existing) {
        const product = await productModel.findById(log.productId);
        await anomalyModel.create({
          organizationId,
          type: "suspicious_adjustment",
          productId: log.productId,
          description: `A manual adjustment of ${log.quantity} units was made for ${product?.name || 'product'} — larger than usual, worth reviewing.`,
          severity: "high",
        });
      }
    }
  }
};

const detectUnusualReturns = async (organizationId) => {
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const LARGE_RETURN_THRESHOLD = 10;

  const returns = await stockLogModel.find({
    organizationId,
    reason: "return",
    createdAt: { $gte: last7Days },
  });

  for (const log of returns) {
    if (log.quantity > LARGE_RETURN_THRESHOLD) {
      const existing = await anomalyModel.findOne({
        organizationId,
        productId: log.productId,
        type: "unusual_return",
        isResolved: false,
      });

      if (!existing) {
        const product = await productModel.findById(log.productId);
        await anomalyModel.create({
          organizationId,
          type: "unusual_return",
          productId: log.productId,
          description: `A return of ${log.quantity} units was recorded for ${product?.name || 'product'} — larger than usual, worth reviewing.`,
          severity: "medium",
        });
      }
    }
  }
};


export const runAnomalyDetectionForOrg = async (organizationId) => {
  try {
    await detectDeadStock(organizationId);
    await detectSalesSpikes(organizationId);
    await detectSuspiciousAdjustments(organizationId);
    await detectUnusualReturns(organizationId);
  } catch (error) {
    console.error(`Anomaly detection failed for org ${organizationId}:`, error.message);
    throw error;
  }
};

export const runAnomalyDetectionForAllOrgs = async () => {
  const organizations = await organizationModel.find({ status: "active" });

  for (const org of organizations) {
    try {
      await runAnomalyDetectionForOrg(org._id);
    } catch (error) {
      console.error(
        `Anomaly detection failed for org ${org._id}:`,
        error.message,
      );
    }
  }
};