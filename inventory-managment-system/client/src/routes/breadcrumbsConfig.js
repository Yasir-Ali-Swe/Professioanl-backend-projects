// A simple segment matcher that handles parameters (e.g., :id)
export function matchPattern(pattern, pathname) {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    const pathSeg = pathSegments[i];

    if (patternSeg.startsWith(":")) {
      const paramName = patternSeg.slice(1);
      params[paramName] = pathSeg;
    } else if (patternSeg.toLowerCase() !== pathSeg.toLowerCase()) {
      return null;
    }
  }

  return params;
}

export const BREADCRUMB_CONFIGS = {
  super_admin: [
    {
      pattern: "/super-admin/dashboard",
      trail: [{ label: "Dashboard", path: null }],
    },
    { pattern: "/dashboard", trail: [{ label: "Dashboard", path: null }] },
    {
      pattern: "/super-admin/organizations",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "Organizations", path: null },
      ],
    },
    {
      pattern: "/super-admin/organizations/:id",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "Organizations", path: "/super-admin/organizations" },
        {
          label: (params, state) => {
            try {
              const org = state?.organization?.currentOrganization;
              return org?._id === params?.id && org?.name
                ? org.name
                : "Organization Details";
            } catch (e) {
              return "Organization Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/super-admin/analytics",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "Analytics", path: null },
      ],
    },
    {
      pattern: "/super-admin/subscriptions",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "Subscriptions", path: null },
      ],
    },
    {
      pattern: "/super-admin/subscriptions/:id",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "Subscriptions", path: "/super-admin/subscriptions" },
        { label: "Subscription Details", path: null },
      ],
    },
    {
      pattern: "/super-admin/chatbot",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "AI Chatbot", path: null },
      ],
    },
    {
      pattern: "/super-admin/profile",
      trail: [
        { label: "Dashboard", path: "/super-admin/dashboard" },
        { label: "My Profile", path: null },
      ],
    },
  ],

  admin: [
    {
      pattern: "/admin/dashboard",
      trail: [{ label: "Dashboard", path: null }],
    },
    {
      pattern: "/admin/products",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Products", path: null },
      ],
    },
    {
      pattern: "/admin/products/add",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Products", path: "/admin/products" },
        { label: "Add Product", path: null },
      ],
    },
    {
      pattern: "/admin/products/edit/:id",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Products", path: "/admin/products" },
        { label: "Edit Product", path: null },
      ],
    },
    {
      pattern: "/admin/products/:id",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Products", path: "/admin/products" },
        {
          label: (params, state) => {
            try {
              const product = state?.product?.selectedProduct;
              return product?._id === params?.id && product?.name
                ? product.name
                : "Product Details";
            } catch (e) {
              return "Product Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/admin/categories",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Categories", path: null },
      ],
    },
    {
      pattern: "/admin/categories/add",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Categories", path: "/admin/categories" },
        { label: "Add Category", path: null },
      ],
    },
    {
      pattern: "/admin/categories/:id/edit",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Categories", path: "/admin/categories" },
        { label: "Edit Category", path: null },
      ],
    },
    {
      pattern: "/admin/categories/:id",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Categories", path: "/admin/categories" },
        {
          label: (params, state) => {
            try {
              const category = state?.category?.selectedCategory;
              return category?._id === params?.id && category?.name
                ? category.name
                : "Category Details";
            } catch (e) {
              return "Category Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/admin/suppliers",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Suppliers", path: null },
      ],
    },
    {
      pattern: "/admin/suppliers/add",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Suppliers", path: "/admin/suppliers" },
        { label: "Add Supplier", path: null },
      ],
    },
    {
      pattern: "/admin/suppliers/:id/edit",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Suppliers", path: "/admin/suppliers" },
        { label: "Edit Supplier", path: null },
      ],
    },
    {
      pattern: "/admin/suppliers/:id",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Suppliers", path: "/admin/suppliers" },
        {
          label: (params, state) => {
            try {
              const supplier = state?.supplier?.selectedSupplier;
              return supplier?._id === params?.id && supplier?.name
                ? supplier.name
                : "Supplier Details";
            } catch (e) {
              return "Supplier Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/admin/stock",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: null },
      ],
    },
    {
      pattern: "/admin/stock/overview",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: "/admin/stock" },
        { label: "Overview", path: null },
      ],
    },
    {
      pattern: "/admin/stock/list",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: "/admin/stock" },
        { label: "All Stock", path: null },
      ],
    },
    {
      pattern: "/admin/stock/low-stock",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: "/admin/stock" },
        { label: "Low Stock", path: null },
      ],
    },
    {
      pattern: "/admin/stock/in",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: "/admin/stock" },
        { label: "Stock In", path: null },
      ],
    },
    {
      pattern: "/admin/stock/out",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Stock Management", path: "/admin/stock" },
        { label: "Stock Out", path: null },
      ],
    },
    {
      pattern: "/admin/invoices",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Invoices", path: null },
      ],
    },
    {
      pattern: "/admin/invoices/generate",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Invoices", path: "/admin/invoices" },
        { label: "Generate Invoice", path: null },
      ],
    },
    {
      pattern: "/admin/invoice-settings",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Invoice Settings", path: null },
      ],
    },
    {
      pattern: "/admin/purchase-orders",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Purchase Orders", path: null },
      ],
    },
    {
      pattern: "/admin/purchase-orders/create",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Purchase Orders", path: "/admin/purchase-orders" },
        { label: "Create PO", path: null },
      ],
    },
    {
      pattern: "/admin/team",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Team", path: null },
      ],
    },
    {
      pattern: "/admin/team/invite",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Team", path: "/admin/team" },
        { label: "Invite Team Member", path: null },
      ],
    },
    {
      pattern: "/admin/chatbot",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "AI Chatbot", path: null },
      ],
    },
    {
      pattern: "/admin/forecast",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "AI Forecast", path: null },
      ],
    },
    {
      pattern: "/admin/anomalies",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "AI Anomalies", path: null },
      ],
    },
    {
      pattern: "/admin/insights",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "AI Insights", path: null },
      ],
    },
    {
      pattern: "/admin/reorder-suggestions",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Reorder Suggestions", path: null },
      ],
    },
    {
      pattern: "/admin/reorder-suggestions/history",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Reorder Suggestions", path: "/admin/reorder-suggestions" },
        { label: "Reorder Suggestion History", path: null },
      ],
    },
    {
      pattern: "/admin/billing",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "Billing", path: null },
      ],
    },
    {
      pattern: "/admin/profile",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "My Profile", path: null },
      ],
    },
    {
      pattern: "/admin/organization-profile",
      trail: [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "My Profile", path: "/admin/profile" },
        { label: "Organization Profile", path: null },
      ],
    },
  ],

  manager: [
    {
      pattern: "/manager/dashboard",
      trail: [{ label: "Dashboard", path: null }],
    },
    {
      pattern: "/manager/products",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Products", path: null },
      ],
    },
    {
      pattern: "/manager/products/add",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Products", path: "/manager/products" },
        { label: "Add Product", path: null },
      ],
    },
    {
      pattern: "/manager/products/edit/:id",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Products", path: "/manager/products" },
        { label: "Edit Product", path: null },
      ],
    },
    {
      pattern: "/manager/products/:id",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Products", path: "/manager/products" },
        {
          label: (params, state) => {
            try {
              const product = state?.product?.selectedProduct;
              return product?._id === params?.id && product?.name
                ? product.name
                : "Product Details";
            } catch (e) {
              return "Product Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/manager/categories",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Categories", path: null },
      ],
    },
    {
      pattern: "/manager/categories/add",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Categories", path: "/manager/categories" },
        { label: "Add Category", path: null },
      ],
    },
    {
      pattern: "/manager/categories/:id/edit",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Categories", path: "/manager/categories" },
        { label: "Edit Category", path: null },
      ],
    },
    {
      pattern: "/manager/categories/:id",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Categories", path: "/manager/categories" },
        {
          label: (params, state) => {
            try {
              const category = state?.category?.selectedCategory;
              return category?._id === params?.id && category?.name
                ? category.name
                : "Category Details";
            } catch (e) {
              return "Category Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/manager/suppliers",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Suppliers", path: null },
      ],
    },
    {
      pattern: "/manager/suppliers/add",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Suppliers", path: "/manager/suppliers" },
        { label: "Add Supplier", path: null },
      ],
    },
    {
      pattern: "/manager/suppliers/:id/edit",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Suppliers", path: "/manager/suppliers" },
        { label: "Edit Supplier", path: null },
      ],
    },
    {
      pattern: "/manager/suppliers/:id",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Suppliers", path: "/manager/suppliers" },
        {
          label: (params, state) => {
            try {
              const supplier = state?.supplier?.selectedSupplier;
              return supplier?._id === params?.id && supplier?.name
                ? supplier.name
                : "Supplier Details";
            } catch (e) {
              return "Supplier Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/manager/stock",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: null },
      ],
    },
    {
      pattern: "/manager/stock/overview",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: "/manager/stock" },
        { label: "Overview", path: null },
      ],
    },
    {
      pattern: "/manager/stock/list",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: "/manager/stock" },
        { label: "All Stock", path: null },
      ],
    },
    {
      pattern: "/manager/stock/low-stock",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: "/manager/stock" },
        { label: "Low Stock", path: null },
      ],
    },
    {
      pattern: "/manager/stock/in",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: "/manager/stock" },
        { label: "Stock In", path: null },
      ],
    },
    {
      pattern: "/manager/stock/out",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Stock Management", path: "/manager/stock" },
        { label: "Stock Out", path: null },
      ],
    },
    {
      pattern: "/manager/invoices",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Invoices", path: null },
      ],
    },
    {
      pattern: "/manager/invoices/generate",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Invoices", path: "/manager/invoices" },
        { label: "Generate Invoice", path: null },
      ],
    },
    {
      pattern: "/manager/invoice-settings",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Invoice Settings", path: null },
      ],
    },
    {
      pattern: "/manager/purchase-orders",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Purchase Orders", path: null },
      ],
    },
    {
      pattern: "/manager/purchase-orders/create",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Purchase Orders", path: "/manager/purchase-orders" },
        { label: "Create PO", path: null },
      ],
    },
    {
      pattern: "/manager/team",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Team", path: null },
      ],
    },
    {
      pattern: "/manager/team/invite",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "Team", path: "/manager/team" },
        { label: "Invite Team Member", path: null },
      ],
    },
    {
      pattern: "/manager/profile",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "My Profile", path: null },
      ],
    },
    {
      pattern: "/manager/organization-profile",
      trail: [
        { label: "Dashboard", path: "/manager/dashboard" },
        { label: "My Profile", path: "/manager/profile" },
        { label: "Organization Profile", path: null },
      ],
    },
  ],

  staff: [
    {
      pattern: "/staff/dashboard",
      trail: [{ label: "Dashboard", path: null }],
    },
    {
      pattern: "/staff/products",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Products", path: null },
      ],
    },
    {
      pattern: "/staff/products/:id",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Products", path: "/staff/products" },
        {
          label: (params, state) => {
            try {
              const product = state?.product?.selectedProduct;
              return product?._id === params?.id && product?.name
                ? product.name
                : "Product Details";
            } catch (e) {
              return "Product Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/staff/categories",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Categories", path: null },
      ],
    },
    {
      pattern: "/staff/categories/:id",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Categories", path: "/staff/categories" },
        {
          label: (params, state) => {
            try {
              const category = state?.category?.selectedCategory;
              return category?._id === params?.id && category?.name
                ? category.name
                : "Category Details";
            } catch (e) {
              return "Category Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/staff/suppliers",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Suppliers", path: null },
      ],
    },
    {
      pattern: "/staff/suppliers/:id",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Suppliers", path: "/staff/suppliers" },
        {
          label: (params, state) => {
            try {
              const supplier = state?.supplier?.selectedSupplier;
              return supplier?._id === params?.id && supplier?.name
                ? supplier.name
                : "Supplier Details";
            } catch (e) {
              return "Supplier Details";
            }
          },
          path: null,
        },
      ],
    },
    {
      pattern: "/staff/stock/in",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Stock In", path: null },
      ],
    },
    {
      pattern: "/staff/stock/out",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Stock Out", path: null },
      ],
    },
    {
      pattern: "/staff/invoices",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "My Invoices", path: null },
      ],
    },
    {
      pattern: "/staff/invoices/generate",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "My Invoices", path: "/staff/invoices" },
        { label: "Generate Invoice", path: null },
      ],
    },
    {
      pattern: "/staff/invoice-settings",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Invoice Settings", path: null },
      ],
    },
    {
      pattern: "/staff/profile",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "My Profile", path: null },
      ],
    },
    {
      pattern: "/staff/organization-profile",
      trail: [
        { label: "Dashboard", path: "/staff/dashboard" },
        { label: "Profile", path: "/staff/profile" },
        { label: "Organization Profile", path: null },
      ],
    },
  ],
};

export function getBreadcrumbs(pathname, role, storeState) {
  if (!role) return [{ label: "Dashboard", path: null }];

  const roleConfig = BREADCRUMB_CONFIGS[role] || [];
  for (const route of roleConfig) {
    const params = matchPattern(route.pattern, pathname);
    if (params) {
      return route.trail.map((segment) => {
        const label =
          typeof segment.label === "function"
            ? segment.label(params, storeState)
            : segment.label;
        return {
          label,
          path: segment.path,
        };
      });
    }
  }

  return [{ label: "Dashboard", path: null }];
}
