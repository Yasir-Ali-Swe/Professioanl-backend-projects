import anomalyModel from "../models/anomaly.model.js";

export const getAnomalies = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const anomalies = await anomalyModel
      .find({
        organizationId,
        isResolved: false,
      })
      .populate("productId", "name sku quantity")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: anomalies,
    });
  } catch (error) {
    console.error("Error in getAnomalies:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAnomalyById = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const anomalyId = req.params.id;

    if (!anomalyId) {
      return res.status(400).json({
        success: false,
        message: "Anomaly ID is required",
      });
    }

    const anomaly = await anomalyModel
      .findOne({ _id: anomalyId, organizationId })
      .populate("productId", "name sku quantity reorderThreshold")
      .lean();

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found",
      });
    }

    res.status(200).json({
      success: true,
      data: anomaly,
    });
  } catch (error) {
    console.error("Error in getAnomalyById:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const resolveAnomaly = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const anomalyId = req.params.id;

    if (!anomalyId) {
      return res.status(400).json({
        success: false,
        message: "Anomaly ID is required",
      });
    }

    const anomaly = await anomalyModel.findOneAndUpdate(
      { _id: anomalyId, organizationId },
      { isResolved: true },
      { new: true },
    );

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Anomaly resolved successfully",
      data: anomaly,
    });
  } catch (error) {
    console.error("Error in resolveAnomaly:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
