import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PORT } from "./config/env.js";
import { connectDB } from "./config/db.connection.js";
import authRoutes from "./routes/auth.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import organizationAdminRoutes from "./routes/organization.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import supplierRoutes from "./routes/supplier.route.js";
import productRoutes from "./routes/product.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import purchaseRoutes from "./routes/purchaseOrder.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import forecastRoutes from "./routes/forecast.routes.js";
import anomalyRoutes from "./routes/anomaly.routes.js";
import userRoutes from "./routes/user.routes.js";
import insightsRoutes from "./routes/insights.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import { scheduleForecastJob } from "./jobs/forecast.cron.js";
import { scheduleAnomalyJob } from "./jobs/anomaly.cron.js";
import { scheduleInsightsJob } from "./jobs/insights.cron.js";
import { scheduleReorderSuggestionJob } from "./jobs/reorderSuggestion.cron.js";
import morgan from "morgan";
import { createIndexes } from "./config/indexes.js";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());

app.use("/api/v1/billing", billingRoutes);

app.use(express.json());

// ============ ROUTES ============
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/organization", organizationAdminRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/supplier", supplierRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/stock", stockRoutes);
app.use("/api/v1/invoice", invoiceRoutes);
app.use("/api/v1/purchase", purchaseRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/forecast", forecastRoutes);
app.use("/api/v1/anomaly", anomalyRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/ai", insightsRoutes);
app.use("/api/v1/ai", chatRoutes);

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
await createIndexes();

// ============ BACKGROUND JOBS ============
scheduleForecastJob();
scheduleReorderSuggestionJob();
scheduleAnomalyJob();
scheduleInsightsJob();
