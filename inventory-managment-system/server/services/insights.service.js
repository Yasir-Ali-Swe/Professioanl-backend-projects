// services/insights.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import invoiceModel from "../models/invoice.model.js";
import productModel from "../models/product.model.js";
import aiInsightsModel from "../models/insights.model.js";
import organizationModel from "../models/organization.model.js";
import { GEMINI_API_KEY } from "../config/env.js";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  if (period === "weekly") {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
};

export const generateInsightsForOrg = async (
  organizationId,
  period = "weekly",
) => {
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
      const id = item.productId.toString();
      productSales[id] = (productSales[id] || 0) + item.quantity;
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
      const id = item.productId.toString();
      prevProductSales[id] = (prevProductSales[id] || 0) + item.quantity;
    });
  });

  let decliningProductId = null;
  let biggestDrop = 0;
  for (const id in prevProductSales) {
    const drop = prevProductSales[id] - (productSales[id] || 0);
    if (drop > biggestDrop) {
      biggestDrop = drop;
      decliningProductId = id;
    }
  }

  const topProduct = topSellingProductId
    ? await productModel.findById(topSellingProductId)
    : null;
  const decliningProduct = decliningProductId
    ? await productModel.findById(decliningProductId)
    : null;

  const prompt = `
You are a business analyst. Write a short, plain-English 2-4 sentence summary for a store manager based on this data:
- Total revenue: $${totalRevenue}
- Total orders: ${totalOrders}
- Top selling product: ${topProduct?.name || "N/A"}
- Declining product: ${decliningProduct?.name || "N/A"} (dropped by ${biggestDrop} units)
Keep it concise and actionable. No greetings, just the summary.
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const summaryText = result.response.text();

  const insight = await aiInsightsModel.create({
    organizationId,
    period,
    summaryText,
    keyMetrics: {
      topSellingProductId,
      decliningProductId,
      totalRevenue,
      totalOrders,
    },
  });

  return insight;
};

export const generateInsightsForAllOrgs = async (period = "weekly") => {
  const organizations = await organizationModel.find({ status: "active" });
  for (const org of organizations) {
    try {
      await generateInsightsForOrg(org._id, period);
    } catch (error) {
      console.error(
        `Insights generation failed for org ${org._id}:`,
        error.message,
      );
    }
  }
};
