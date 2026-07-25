// controllers/anomaly.controller.js
import anomalyModel from "../models/anomaly.model.js";
import productModel from "../models/product.model.js";
import stockLogModel from "../models/stockLog.model.js";
import { runAnomalyDetectionForOrg } from "../services/anomaly.service.js";

// GET /api/v1/anomaly/anomalies
export const getAnomalies = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { resolved, type, severity, page = 1, limit = 20 } = req.query;

    const query = { organizationId };

    // Filter by resolved status
    if (resolved === "true") {
      query.isResolved = true;
    } else if (resolved === "false" || !resolved) {
      query.isResolved = false; // Default: show only unresolved
    }

    // Filter by type
    if (type) {
      const validTypes = [
        "dead_stock",
        "sales_spike",
        "suspicious_adjustment",
        "unusual_return",
      ];
      if (validTypes.includes(type)) {
        query.type = type;
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Type must be one of: dead_stock, sales_spike, suspicious_adjustment, unusual_return",
        });
      }
    }

    // Filter by severity
    if (severity) {
      const validSeverities = ["low", "medium", "high"];
      if (validSeverities.includes(severity)) {
        query.severity = severity;
      } else {
        return res.status(400).json({
          success: false,
          message: "Severity must be one of: low, medium, high",
        });
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalAnomalies = await anomalyModel.countDocuments(query);

    // Get anomalies with population
    const anomalies = await anomalyModel
      .find(query)
      .populate("productId", "name sku quantity sellingPrice unit imageUrl")
      .populate({
        path: "productId",
        populate: [
          { path: "categoryId", select: "name categorySlug" },
          { path: "supplierId", select: "name contactPerson phone email" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Enrich anomaly data with product details
    const enrichedAnomalies = anomalies.map((anomaly) => ({
      ...anomaly,
      product: anomaly.productId || null,
      productId: anomaly.productId?._id || null,
    }));

    // Calculate summary statistics
    const summary = {
      total: totalAnomalies,
      unresolved: await anomalyModel.countDocuments({
        organizationId,
        isResolved: false,
      }),
      resolved: await anomalyModel.countDocuments({
        organizationId,
        isResolved: true,
      }),
      byType: {
        dead_stock: await anomalyModel.countDocuments({
          organizationId,
          type: "dead_stock",
          isResolved: false,
        }),
        sales_spike: await anomalyModel.countDocuments({
          organizationId,
          type: "sales_spike",
          isResolved: false,
        }),
        suspicious_adjustment: await anomalyModel.countDocuments({
          organizationId,
          type: "suspicious_adjustment",
          isResolved: false,
        }),
        unusual_return: await anomalyModel.countDocuments({
          organizationId,
          type: "unusual_return",
          isResolved: false,
        }),
      },
      bySeverity: {
        low: await anomalyModel.countDocuments({
          organizationId,
          severity: "low",
          isResolved: false,
        }),
        medium: await anomalyModel.countDocuments({
          organizationId,
          severity: "medium",
          isResolved: false,
        }),
        high: await anomalyModel.countDocuments({
          organizationId,
          severity: "high",
          isResolved: false,
        }),
      },
    };

    res.status(200).json({
      success: true,
      data: enrichedAnomalies,
      pagination: {
        total: totalAnomalies,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalAnomalies / Number(limit)),
        hasNextPage: Number(page) < Math.ceil(totalAnomalies / Number(limit)),
        hasPrevPage: Number(page) > 1,
      },
      summary,
    });
  } catch (error) {
    console.error("Error in getAnomalies:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// GET /api/v1/anomaly/anomalies/:id
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
      .populate(
        "productId",
        "name sku quantity sellingPrice unit costPrice imageUrl",
      )
      .populate({
        path: "productId",
        populate: [
          { path: "categoryId", select: "name categorySlug" },
          { path: "supplierId", select: "name contactPerson phone email" },
        ],
      })
      .lean();

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found",
      });
    }

    // Get recent stock logs for this product (for context)
    const recentStockLogs = await stockLogModel
      .find({
        organizationId,
        productId: anomaly.productId?._id || anomaly.productId,
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("performedBy", "name email")
      .lean();

    // Enrich response
    const enrichedAnomaly = {
      ...anomaly,
      product: anomaly.productId || null,
      productId: anomaly.productId?._id || null,
      recentStockLogs: recentStockLogs || [],
      age: Math.floor(
        (Date.now() - new Date(anomaly.createdAt)) / (1000 * 60 * 60 * 24),
      ),
    };

    res.status(200).json({
      success: true,
      data: enrichedAnomaly,
    });
  } catch (error) {
    console.error("Error in getAnomalyById:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// // PATCH /api/v1/anomaly/anomalies/:id/resolve
// export const resolveAnomaly = async (req, res) => {
//   try {
//     const organizationId = req.organizationId;
//     const anomalyId = req.params.id;
//     const { resolutionNote } = req.body;

//     if (!anomalyId) {
//       return res.status(400).json({
//         success: false,
//         message: "Anomaly ID is required",
//       });
//     }

//     const anomaly = await anomalyModel.findOne({
//       _id: anomalyId,
//       organizationId,
//     });

//     if (!anomaly) {
//       return res.status(404).json({
//         success: false,
//         message: "Anomaly not found",
//       });
//     }

//     // Check if already resolved
//     if (anomaly.isResolved) {
//       return res.status(400).json({
//         success: false,
//         message: "Anomaly is already resolved",
//       });
//     }

//     // Update the anomaly
//     const updateData = { isResolved: true };
//     if (resolutionNote) {
//       updateData.resolutionNote = resolutionNote;
//     }

//     const updatedAnomaly = await anomalyModel.findOneAndUpdate(
//       { _id: anomalyId, organizationId },
//       updateData,
//       { new: true },
//     );

//     res.status(200).json({
//       success: true,
//       message: "Anomaly resolved successfully",
//       data: updatedAnomaly,
//     });
//   } catch (error) {
//     console.error("Error in resolveAnomaly:", error.message);
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

// controllers/anomaly.controller.js
// PATCH /api/v1/anomaly/anomalies/:id/resolve
export const resolveAnomaly = async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const anomalyId = req.params.id;
    // ✅ Fix: Provide default empty object if req.body is undefined
    const { resolutionNote } = req.body || {};

    if (!anomalyId) {
      return res.status(400).json({
        success: false,
        message: "Anomaly ID is required",
      });
    }

    const anomaly = await anomalyModel.findOne({
      _id: anomalyId,
      organizationId,
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found",
      });
    }

    // Check if already resolved
    if (anomaly.isResolved) {
      return res.status(400).json({
        success: false,
        message: "Anomaly is already resolved",
      });
    }

    // ✅ Fix: Update description with resolution note instead of using non-existent field
    const updateData = {
      isResolved: true,
      description: resolutionNote
        ? `${anomaly.description}\n\n--- Resolution: ${resolutionNote}`
        : anomaly.description
    };

    const updatedAnomaly = await anomalyModel.findOneAndUpdate(
      { _id: anomalyId, organizationId },
      updateData,
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Anomaly resolved successfully",
      data: updatedAnomaly,
    });
  } catch (error) {
    console.error("Error in resolveAnomaly:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// POST /api/v1/anomaly/anomalies/run-detection (Manual Trigger - Testing Helper)
export const runAnomalyDetection = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    // Run detection for this specific organization
    await runAnomalyDetectionForOrg(organizationId);

    // Count how many anomalies were created in the last minute
    const createdAnomalies = await anomalyModel
      .find({
        organizationId,
        createdAt: { $gte: new Date(Date.now() - 60000) }, // Last minute
      })
      .lean();

    res.status(200).json({
      success: true,
      message: `Anomaly detection completed. ${createdAnomalies.length} new anomalies found.`,
      data: {
        detected: createdAnomalies.length,
        anomalies: createdAnomalies,
      },
    });
  } catch (error) {
    console.error("Error in runAnomalyDetection:", error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
