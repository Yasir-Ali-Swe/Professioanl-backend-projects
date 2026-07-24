// // services/insights.service.js
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import invoiceModel from "../models/invoice.model.js";
// import productModel from "../models/product.model.js";
// import aiInsightsModel from "../models/insights.model.js";
// import organizationModel from "../models/organization.model.js";
// import { GEMINI_API_KEY,GEMINI_MODEL } from "../config/env.js";

// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// const getDateRange = (period) => {
//   const now = new Date();
//   const start = new Date();
//   if (period === "weekly") {
//     start.setDate(now.getDate() - 7);
//   } else if (period === "monthly") {
//     start.setMonth(now.getMonth() - 1);
//   } else {
//     start.setDate(now.getDate() - 7); // Default to weekly
//   }
//   start.setHours(0, 0, 0, 0);
//   return { start, end: now };
// };

// export const generateInsightsForOrg = async (
//   organizationId,
//   period = "weekly",
// ) => {
//   // Validate period
//   if (!["weekly", "monthly"].includes(period)) {
//     throw { status: 400, message: "Period must be 'weekly' or 'monthly'" };
//   }

//   const { start, end } = getDateRange(period);

//   // Get paid invoices for the period
//   const invoices = await invoiceModel.find({
//     organizationId,
//     status: "paid",
//     createdAt: { $gte: start, $lte: end },
//   });

//   // Calculate metrics
//   const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
//   const totalOrders = invoices.length;

//   // Calculate product sales
//   const productSales = {};
//   invoices.forEach((inv) => {
//     inv.products.forEach((item) => {
//       const id = item.productId.toString();
//       productSales[id] = (productSales[id] || 0) + item.quantity;
//     });
//   });

//   // Find top selling product
//   const sortedProducts = Object.entries(productSales).sort(
//     (a, b) => b[1] - a[1],
//   );
//   const topSellingProductId = sortedProducts[0]?.[0] || null;

//   // Calculate previous period for declining product
//   const prevStart = new Date(start);
//   if (period === "weekly") {
//     prevStart.setDate(prevStart.getDate() - 7);
//   } else {
//     prevStart.setMonth(prevStart.getMonth() - 1);
//   }

//   const prevInvoices = await invoiceModel.find({
//     organizationId,
//     status: "paid",
//     createdAt: { $gte: prevStart, $lt: start },
//   });

//   const prevProductSales = {};
//   prevInvoices.forEach((inv) => {
//     inv.products.forEach((item) => {
//       const id = item.productId.toString();
//       prevProductSales[id] = (prevProductSales[id] || 0) + item.quantity;
//     });
//   });

//   // Find declining product
//   let decliningProductId = null;
//   let biggestDrop = 0;
//   for (const id in prevProductSales) {
//     const current = productSales[id] || 0;
//     const drop = prevProductSales[id] - current;
//     if (drop > biggestDrop && drop > 0) {
//       biggestDrop = drop;
//       decliningProductId = id;
//     }
//   }

//   // Fetch product details for the prompt
//   const topProduct = topSellingProductId
//     ? await productModel.findById(topSellingProductId).select("name sku")
//     : null;
//   const decliningProduct = decliningProductId
//     ? await productModel.findById(decliningProductId).select("name sku")
//     : null;

//   // Generate AI summary
//   let summaryText = "";
//   try {
//     const prompt = `
// You are a business analyst. Write a short, plain-English 2-4 sentence summary for a store manager based on this data:
// - Total revenue: $${totalRevenue.toFixed(2)}
// - Total orders: ${totalOrders}
// - Top selling product: ${topProduct?.name || "No sales yet"}
// - Declining product: ${decliningProduct?.name || "None detected"} ${decliningProduct ? `(dropped by ${biggestDrop} units)` : ""}
// ${totalOrders === 0 ? "Note: No sales data available for this period." : ""}
// Keep it concise and actionable. No greetings, just the summary.
// `;

//     const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
//     const result = await model.generateContent(prompt);
//     console.log("AI generation result:", result);
//     summaryText = result.response.text();
//   } catch (error) {
//     console.error("AI generation failed:", error.message);
//     // Fallback summary if AI fails
//     summaryText = `Period summary: ${totalOrders} orders totaling $${totalRevenue.toFixed(2)}. ${
//       topProduct
//         ? `Top product: ${topProduct.name}.`
//         : "No sales data available."
//     }`;
//   }

//   // Create insight record
//   const insight = await aiInsightsModel.create({
//     organizationId,
//     period,
//     summaryText,
//     keyMetrics: {
//       topSellingProductId,
//       decliningProductId,
//       totalRevenue,
//       totalOrders,
//     },
//   });

//   return insight;
// };

// export const generateInsightsForAllOrgs = async (period = "weekly") => {
//   const organizations = await organizationModel.find({ status: "active" });

//   for (const org of organizations) {
//     try {
//       await generateInsightsForOrg(org._id, period);
//       console.log(`Insights generated for org ${org._id} (${period})`);
//     } catch (error) {
//       console.error(
//         `Insights generation failed for org ${org._id}:`,
//         error.message,
//       );
//     }
//   }
// };

// services/insights.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import invoiceModel from "../models/invoice.model.js";
import productModel from "../models/product.model.js";
import aiInsightsModel from "../models/insights.model.js";
import organizationModel from "../models/organization.model.js";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../config/env.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  if (period === "weekly") {
    start.setDate(now.getDate() - 7);
  } else if (period === "monthly") {
    start.setMonth(now.getMonth() - 1);
  } else {
    start.setDate(now.getDate() - 7);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
};

// NEW: Get insights data without generating AI summary
export const getInsightsData = async (organizationId, period = "weekly") => {
  if (!["weekly", "monthly"].includes(period)) {
    throw { status: 400, message: "Period must be 'weekly' or 'monthly'" };
  }

  const { start, end } = getDateRange(period);

  const invoices = await invoiceModel.find({
    organizationId,
    status: "paid",
    createdAt: { $gte: start, $lte: end },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalOrders = invoices.length;

  const productSales = {};
  invoices.forEach((inv) => {
    inv.products.forEach((item) => {
      if (item.productId) {
        const id = item.productId.toString();
        productSales[id] = (productSales[id] || 0) + item.quantity;
      }
    });
  });

  const sortedProducts = Object.entries(productSales).sort(
    (a, b) => b[1] - a[1],
  );
  const topSellingProductId = sortedProducts[0]?.[0] || null;

  const prevStart = new Date(start);
  if (period === "weekly") {
    prevStart.setDate(prevStart.getDate() - 7);
  } else {
    prevStart.setMonth(prevStart.getMonth() - 1);
  }

  const prevInvoices = await invoiceModel.find({
    organizationId,
    status: "paid",
    createdAt: { $gte: prevStart, $lt: start },
  });

  const prevProductSales = {};
  prevInvoices.forEach((inv) => {
    inv.products.forEach((item) => {
      if (item.productId) {
        const id = item.productId.toString();
        prevProductSales[id] = (prevProductSales[id] || 0) + item.quantity;
      }
    });
  });

  let decliningProductId = null;
  let biggestDrop = 0;
  for (const id in prevProductSales) {
    const current = productSales[id] || 0;
    const drop = prevProductSales[id] - current;
    if (drop > biggestDrop && drop > 0) {
      biggestDrop = drop;
      decliningProductId = id;
    }
  }

  const topProduct = topSellingProductId
    ? await productModel.findById(topSellingProductId).select("name sku")
    : null;
  const decliningProduct = decliningProductId
    ? await productModel.findById(decliningProductId).select("name sku")
    : null;

  return {
    totalRevenue,
    totalOrders,
    topSellingProductId,
    decliningProductId,
    topProduct,
    decliningProduct,
    biggestDrop,
  };
};

// Generate AI summary (for non-streaming)
export const generateInsightsForOrg = async (
  organizationId,
  period = "weekly",
) => {
  const data = await getInsightsData(organizationId, period);

  let summaryText = "";
  try {
    const prompt = `
You are a business analyst. Write a short, plain-English 2-4 sentence summary for a store manager based on this data:
- Total revenue: $${data.totalRevenue.toFixed(2)}
- Total orders: ${data.totalOrders}
- Top selling product: ${data.topProduct?.name || "No sales yet"}
- Declining product: ${data.decliningProduct?.name || "None detected"} ${data.decliningProduct ? `(dropped by ${data.biggestDrop} units)` : ""}
${data.totalOrders === 0 ? "Note: No sales data available for this period." : ""}
Keep it concise and actionable. No greetings, just the summary.
`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    summaryText = result.response.text();
  } catch (error) {
    console.error("AI generation failed:", error.message);
    summaryText = `Period summary: ${data.totalOrders} orders totaling $${data.totalRevenue.toFixed(2)}. ${data.topProduct
      ? `Top product: ${data.topProduct.name}.`
      : "No sales data available."
      }`;
  }

  const insight = await aiInsightsModel.create({
    organizationId,
    period,
    summaryText,
    keyMetrics: {
      topSellingProductId: data.topSellingProductId,
      decliningProductId: data.decliningProductId,
      totalRevenue: data.totalRevenue,
      totalOrders: data.totalOrders,
    },
  });

  return insight;
};

// NEW: Generate streaming AI summary
export const generateInsightsStream = async (
  organizationId,
  period = "weekly",
  res,
) => {
  try {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.flushHeaders();

    // Send start event
    res.write(
      `data: ${JSON.stringify({
        type: "start",
        message: "Generating insights...",
      })}\n\n`,
    );

    // Get insights data
    const data = await getInsightsData(organizationId, period);

    // Send metrics event
    res.write(
      `data: ${JSON.stringify({
        type: "metrics",
        data: {
          totalRevenue: data.totalRevenue,
          totalOrders: data.totalOrders,
          topProduct: data.topProduct?.name || null,
          topProductId: data.topSellingProductId,
          decliningProduct: data.decliningProduct?.name || null,
          decliningProductId: data.decliningProductId,
        },
      })}\n\n`,
    );

    // If no orders, send fallback immediately
    if (data.totalOrders === 0) {
      const fallbackText = `No sales data available for this period. Total revenue: $${data.totalRevenue.toFixed(2)}.`;
      res.write(
        `data: ${JSON.stringify({
          type: "chunk",
          content: fallbackText,
        })}\n\n`,
      );

      // Save insight with fallback
      const insight = await aiInsightsModel.create({
        organizationId,
        period,
        summaryText: fallbackText,
        keyMetrics: {
          topSellingProductId: data.topSellingProductId,
          decliningProductId: data.decliningProductId,
          totalRevenue: data.totalRevenue,
          totalOrders: data.totalOrders,
        },
      });

      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          insightId: insight._id,
        })}\n\n`,
      );
      res.end();
      return;
    }

    // Generate AI summary with streaming
    const prompt = `
You are a business analyst. Write a short, plain-English 2-4 sentence summary for a store manager based on this data:
- Total revenue: $${data.totalRevenue.toFixed(2)}
- Total orders: ${data.totalOrders}
- Top selling product: ${data.topProduct?.name || "No sales yet"}
- Declining product: ${data.decliningProduct?.name || "None detected"} ${data.decliningProduct ? `(dropped by ${data.biggestDrop} units)` : ""}
Keep it concise and actionable. No greetings, just the summary.
`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Use streaming API
    const result = await model.generateContentStream(prompt);

    let fullSummary = "";
    let chunkCount = 0;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullSummary += chunkText;
      chunkCount++;

      // Send each chunk to client
      res.write(
        `data: ${JSON.stringify({
          type: "chunk",
          content: chunkText,
          chunkNumber: chunkCount,
        })}\n\n`,
      );
    }

    // Save the complete insight to database
    const insight = await aiInsightsModel.create({
      organizationId,
      period,
      summaryText: fullSummary,
      keyMetrics: {
        topSellingProductId: data.topSellingProductId,
        decliningProductId: data.decliningProductId,
        totalRevenue: data.totalRevenue,
        totalOrders: data.totalOrders,
      },
    });

    // Send completion event with insight ID
    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        insightId: insight._id,
        fullSummary,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("Error in generateInsightsStream:", error.message);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: error.message,
      })}\n\n`,
    );
    res.end();
  }
};

export const generateInsightsForAllOrgs = async (period = "weekly") => {
  const organizations = await organizationModel.find({ status: "active" });

  for (const org of organizations) {
    try {
      await generateInsightsForOrg(org._id, period);
      console.log(`Insights generated for org ${org._id} (${period})`);
    } catch (error) {
      console.error(
        `Insights generation failed for org ${org._id}:`,
        error.message,
      );
    }
  }
};
