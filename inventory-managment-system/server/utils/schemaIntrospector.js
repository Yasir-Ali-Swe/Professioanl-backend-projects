import mongoose from "mongoose";

export const generateSchemaDescription = () => {
  const models = mongoose.modelNames();
  const parts = [];
  const orderedModels = ['Organization', ...models.filter(m => m !== 'Organization')];
  for (const modelName of models) {
    const model = mongoose.model(modelName);
    const schema = model.schema;
    const paths = schema.paths;

    const fields = [];
    const refs = [];

    for (const [pathName, path] of Object.entries(paths)) {
      if (pathName === "__v" || pathName === "_id") continue;

      let type = "?";
      if (path.instance) {
        type = path.instance;
      } else if (path.options && path.options.type) {
        if (Array.isArray(path.options.type)) {
          type = "Array";
        } else if (path.options.type.name) {
          type = path.options.type.name;
        } else {
          type = String(path.options.type);
        }
      }

      // Check enum
      if (path.enumValues && path.enumValues.length > 0) {
        type += `[${path.enumValues.join("|")}]`;
      }

      // Check ref
      if (path.options && path.options.ref) {
        const ref = path.options.ref;
        refs.push(`${pathName}->${ref}`);
        type += `->${ref}`;
      }

      const required = path.isRequired ? "*" : "";
      fields.push(`${pathName}${required}:${type}`);
    }

    let line = `${modelName}: ${fields.join(", ")}`;
    if (refs.length > 0) {
      line += ` | refs: ${refs.join(", ")}`;
    }
    parts.push(line);
  }

  // Security notes
  parts.push(
    "SECURITY: NEVER return password, tokenVersion, __v, stripe* fields",
  );
  parts.push(
    "Settings: Organization.invoiceSettings: {taxRate, defaultDiscount, invoicePrefix, nextInvoiceNumber}",
  );
  parts.push("\nKEY DATA TYPES:");
  parts.push("- Organization: Company information (name, contactEmail, address, phone, status, invoiceSettings)");
  parts.push("- Product: Inventory items (SKU, quantity, pricing, category, supplier)");
  parts.push("- Invoice: Sales records (customerName, total, status, products)");
  parts.push("- Supplier: Vendor information (name, contactPerson, email, phone, leadTimeDays)");
  parts.push("- Category: Product categories (name, categorySlug)");
  parts.push("- User: System users (name, email, role, isActive, isVerified)");
  parts.push("- StockLog: Inventory movements (type, reason, quantity)");
  parts.push("- PurchaseOrder: Purchase records (poNumber, supplier, items, status)");

  return parts.join("\n");
};

let cachedSchemaDescription = null;

export const getSchemaDescription = (forceRefresh = false) => {
  if (!cachedSchemaDescription || forceRefresh) {
    cachedSchemaDescription = generateSchemaDescription();
  }
  return cachedSchemaDescription;
};
