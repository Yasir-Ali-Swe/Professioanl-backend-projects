// services/resolvers/supplierResolver.js
import supplierModel from "../../models/supplier.model.js";
import { COLUMN_DEFINITIONS, buildFlatTable } from "../chatResponseFormatter.service.js";
import {
  stripTriggerPhrases,
  escapeRegex,
  buildDisambiguationResult,
  buildNotFoundResult,
} from "./chatEntityExtractor.js";

export const resolveSupplierQuery = async (queryText = "", args = {}, organizationId = null) => {
  const baseFilter = organizationId ? { organizationId } : {};
  const rawSearch = args.identifier || args.supplier || args.search || stripTriggerPhrases(queryText);
  const isGeneric = ["all suppliers", "suppliers", "supplier", "all"].includes((rawSearch || "").toLowerCase().trim());
  const searchTerm = isGeneric ? "" : rawSearch;

  if (searchTerm) {
    const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
    const matchingSuppliers = await supplierModel
      .find({
        ...baseFilter,
        $or: [{ name: searchRegex }, { contactPerson: searchRegex }],
      })
      .populate("createdBy", "name")
      .lean();

    if (matchingSuppliers.length > 1) {
      return buildDisambiguationResult("suppliers", searchTerm, matchingSuppliers);
    }

    if (matchingSuppliers.length === 1) {
      const s = matchingSuppliers[0];
      const enhancedSupplier = [
        {
          supplierName: s.name,
          contactPerson: s.contactPerson,
          email: s.email || "N/A",
          phone: s.phone || "N/A",
          leadTimeDays: s.leadTimeDays || 0,
        },
      ];

      const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.suppliers_compact, enhancedSupplier);

      return {
        success: true,
        data: rows,
        fields: columns,
        count: 1,
        tableTitle: `Supplier Profile: ${s.name}`,
        framingLine: `Here is the profile for supplier ${s.name} (contact: ${s.contactPerson}, lead time: ${s.leadTimeDays || 0} days):`,
        reply: `Here is the profile for supplier ${s.name} (contact: ${s.contactPerson}, lead time: ${s.leadTimeDays || 0} days):`,
        isAnalytical: false, // Record lookup -> NO insight
        summary: {
          supplierName: s.name,
          contactPerson: s.contactPerson,
          leadTimeDays: s.leadTimeDays,
          isEmpty: false,
        },
      };
    }

    return buildNotFoundResult("supplier", searchTerm);
  }

  // All Suppliers List
  const suppliers = await supplierModel.find(baseFilter).lean();
  if (suppliers.length === 0) {
    return buildNotFoundResult("suppliers", "organization");
  }

  const enhancedSuppliers = suppliers.map((s) => ({
    supplierName: s.name,
    contactPerson: s.contactPerson,
    email: s.email || "N/A",
    phone: s.phone || "N/A",
    leadTimeDays: s.leadTimeDays || 0,
  }));

  const { columns, rows } = buildFlatTable(COLUMN_DEFINITIONS.suppliers_compact, enhancedSuppliers);

  return {
    success: true,
    data: rows,
    fields: columns,
    count: suppliers.length,
    tableTitle: "Suppliers List",
    framingLine: `Found ${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} in your organization:`,
    reply: `Found ${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"} in your organization:`,
    isAnalytical: false, // Record lookup -> NO insight
    summary: { totalSuppliers: suppliers.length, isEmpty: false },
  };
};
