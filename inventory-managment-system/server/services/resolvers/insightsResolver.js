import productModel from "../../models/product.model.js";
import invoiceModel from "../../models/invoice.model.js";
import supplierModel from "../../models/supplier.model.js";
import userModel from "../../models/user.model.js";
import categoryModel from "../../models/category.model.js";
import { buildFlatTable } from "../chatResponseFormatter.service.js";

export const resolveInsightsQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};
  const lower = (queryText || "").toLowerCase();

  if (args.type === "abc_analysis" || lower.includes("abc")) {
    const isSupplier = lower.includes("supplier");
    const isCategory = lower.includes("category") || lower.includes("categories");

    if (isSupplier) {
      const products = await productModel.find({ ...baseFilter, isActive: true }).populate("supplierId", "name").lean();
      const supplierMap = new Map();
      for (const p of products) {
        const suppName = p.supplierId?.name || "Unassigned";
        const val = (p.quantity || 0) * (p.sellingPrice || 0);
        supplierMap.set(suppName, (supplierMap.get(suppName) || 0) + val);
      }
      const sorted = Array.from(supplierMap.entries())
        .map(([name, val]) => ({ supplierName: name, totalValue: val }))
        .sort((a, b) => b.totalValue - a.totalValue);

      const totalVal = sorted.reduce((sum, item) => sum + item.totalValue, 0) || 1;
      let cumulative = 0;

      const abcRows = sorted.map((item) => {
        cumulative += item.totalValue;
        const pct = (cumulative / totalVal) * 100;
        let grade = "C";
        if (pct <= 70) grade = "A (Top 70%)";
        else if (pct <= 90) grade = "B (Next 20%)";
        else grade = "C (Bottom 10%)";
        return {
          supplierName: item.supplierName,
          totalValue: `PKR ${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          share: `${Math.round((item.totalValue / totalVal) * 100)}%`,
          abcGrade: grade,
        };
      });

      const { columns, rows } = buildFlatTable(
        [
          { key: "supplierName", label: "Supplier Name", type: "string" },
          { key: "totalValue", label: "Total Stock Value", type: "number", align: "right" },
          { key: "share", label: "Value Share", type: "string", align: "right" },
          { key: "abcGrade", label: "ABC Grade", type: "string", align: "center" },
        ],
        abcRows
      );

      return {
        success: true,
        data: rows,
        fields: columns,
        count: abcRows.length,
        tableTitle: "ABC Analysis of Suppliers",
        framingLine: "ABC inventory classification by supplier (Grade A = Top 70% value, B = 20%, C = 10%):",
        reply: "ABC inventory classification by supplier:",
        isAnalytical: true,
        summary: { totalSuppliers: abcRows.length, totalValue: totalVal, isEmpty: false },
      };
    }

    if (isCategory) {
      const products = await productModel.find({ ...baseFilter, isActive: true }).populate("categoryId", "name").lean();
      const catMap = new Map();
      for (const p of products) {
        const catName = p.categoryId?.name || "Unassigned";
        const val = (p.quantity || 0) * (p.sellingPrice || 0);
        catMap.set(catName, (catMap.get(catName) || 0) + val);
      }
      const sorted = Array.from(catMap.entries())
        .map(([name, val]) => ({ categoryName: name, totalValue: val }))
        .sort((a, b) => b.totalValue - a.totalValue);

      const totalVal = sorted.reduce((sum, item) => sum + item.totalValue, 0) || 1;
      let cumulative = 0;

      const abcRows = sorted.map((item) => {
        cumulative += item.totalValue;
        const pct = (cumulative / totalVal) * 100;
        let grade = "C";
        if (pct <= 70) grade = "A (Top 70%)";
        else if (pct <= 90) grade = "B (Next 20%)";
        else grade = "C (Bottom 10%)";
        return {
          categoryName: item.categoryName,
          totalValue: `PKR ${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          share: `${Math.round((item.totalValue / totalVal) * 100)}%`,
          abcGrade: grade,
        };
      });

      const { columns, rows } = buildFlatTable(
        [
          { key: "categoryName", label: "Category Name", type: "string" },
          { key: "totalValue", label: "Total Stock Value", type: "number", align: "right" },
          { key: "share", label: "Value Share", type: "string", align: "right" },
          { key: "abcGrade", label: "ABC Grade", type: "string", align: "center" },
        ],
        abcRows
      );

      return {
        success: true,
        data: rows,
        fields: columns,
        count: abcRows.length,
        tableTitle: "ABC Analysis of Categories",
        framingLine: "ABC inventory classification by category (Grade A = Top 70% value, B = 20%, C = 10%):",
        reply: "ABC inventory classification by category:",
        isAnalytical: true,
        summary: { totalCategories: abcRows.length, totalValue: totalVal, isEmpty: false },
      };
    }

    // Default ABC Analysis of Products
    const products = await productModel.find({ ...baseFilter, isActive: true }).select("name sku quantity sellingPrice").lean();
    const sorted = products
      .map(p => ({ productName: p.name, sku: p.sku, totalValue: (p.quantity || 0) * (p.sellingPrice || 0) }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const totalVal = sorted.reduce((sum, item) => sum + item.totalValue, 0) || 1;
    let cumulative = 0;

    const abcRows = sorted.map((item) => {
      cumulative += item.totalValue;
      const pct = (cumulative / totalVal) * 100;
      let grade = "C";
      if (pct <= 70) grade = "A (Top 70%)";
      else if (pct <= 90) grade = "B (Next 20%)";
      else grade = "C (Bottom 10%)";
      return {
        productName: item.productName,
        sku: item.sku,
        totalValue: `PKR ${item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        share: `${Math.round((item.totalValue / totalVal) * 100)}%`,
        abcGrade: grade,
      };
    });

    const { columns, rows } = buildFlatTable(
      [
        { key: "productName", label: "Product Name", type: "string" },
        { key: "sku", label: "SKU", type: "string" },
        { key: "totalValue", label: "Stock Value", type: "number", align: "right" },
        { key: "share", label: "Share", type: "string", align: "right" },
        { key: "abcGrade", label: "ABC Grade", type: "string", align: "center" },
      ],
      abcRows
    );

    return {
      success: true,
      data: rows,
      fields: columns,
      count: abcRows.length,
      tableTitle: "ABC Analysis of Products",
      framingLine: "ABC inventory classification of products based on stock value (Grade A = Top 70%, B = 20%, C = 10%):",
      reply: "ABC inventory classification of products:",
      isAnalytical: true,
      summary: { totalProducts: abcRows.length, totalValue: totalVal, isEmpty: false },
    };
  }

  const totalProducts = await productModel.countDocuments({ ...baseFilter, isActive: true });
  const lowStockCount = await productModel.countDocuments({
    ...baseFilter,
    isActive: true,
    $expr: { $lte: ["$quantity", "$reorderThreshold"] },
  });
  const outOfStockCount = await productModel.countDocuments({ ...baseFilter, isActive: true, quantity: 0 });

  const paidSales = await invoiceModel.aggregate([
    { $match: { ...baseFilter, status: "paid" } },
    { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
  ]);

  const totalRevenue = paidSales[0]?.totalRevenue || 0;
  const totalSuppliers = await supplierModel.countDocuments(baseFilter);
  const totalUsers = await userModel.countDocuments(baseFilter);

  const summary = {
    totalProducts,
    lowStockCount,
    outOfStockCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalSuppliers,
    totalUsers,
    isEmpty: false,
  };

  const framingLine = "Here is your overall business intelligence summary:";

  return {
    success: true,
    data: [],
    fields: [],
    count: 1,
    tableTitle: "Business Intelligence Summary",
    framingLine,
    reply: framingLine,
    isAnalytical: true, // Analytical dashboard -> MAY append insight if notable
    summary,
  };
};
