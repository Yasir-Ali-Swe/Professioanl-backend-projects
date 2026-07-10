import {
  generateInsightsForOrg,
  generateInsightsStream,
} from "../services/insights.service.js";
import aiInsightsModel from "../models/insights.model.js";

export const getLatestInsight = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const period = req.query.period || "weekly";

    const insight = await aiInsightsModel
      .findOne({
        organizationId,
        period,
      })
      .populate("keyMetrics.topSellingProductId", "name sku")
      .populate("keyMetrics.decliningProductId", "name sku")
      .sort({ createdAt: -1 });

    if (!insight) {
      return res.status(404).json({
        success: false,
        message: "No insights generated yet",
      });
    }

    res.status(200).json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error("Error in getLatestInsight:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getInsightsHistory = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { limit = 20 } = req.query;

    const insights = await aiInsightsModel
      .find({ organizationId })
      .populate("keyMetrics.topSellingProductId", "name sku")
      .populate("keyMetrics.decliningProductId", "name sku")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("Error in getInsightsHistory:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const generateInsightNow = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const period = req.body.period || "weekly";

    const insight = await generateInsightsForOrg(organizationId, period);

    res.status(201).json({
      success: true,
      message: "Insight generated successfully",
      data: insight,
    });
  } catch (error) {
    console.error("Error in generateInsightNow:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const generateInsightStream = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const period = req.body.period || "weekly";

    await generateInsightsStream(organizationId, period, res);
  } catch (error) {
    console.error("Error in generateInsightStream:", error.message);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: error.message,
        })}\n\n`,
      );
      res.end();
    }
  }
};
