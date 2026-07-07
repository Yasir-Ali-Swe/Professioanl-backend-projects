import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PORT } from "./config/env.js";
import { connectDB } from "./config/db.connection.js";
import authRoutes from "./routes/auth.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import organizationAdminRoutes from "./routes/organizationAdmin.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import supplierRoutes from "./routes/supplier.route.js";
import productRoutes from "./routes/product.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import purchaseRoutes from "./routes/purchaseOrder.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/organization-admin", organizationAdminRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/supplier", supplierRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/stock", stockRoutes);
app.use("/api/v1/invoice", invoiceRoutes);
app.use("/api/v1/purchse", purchaseRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);