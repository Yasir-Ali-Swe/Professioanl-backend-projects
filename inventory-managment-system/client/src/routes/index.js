// routes/index.js
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
};

// Super Admin Routes - All routes with labels and icons
export const getDashboardRoutes = (role) => {
  // Super Admin specific routes
  const superAdminRoutes = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "LayoutDashboard",
    },
    {
      path: "/super-admin/organizations",
      label: "Organizations",
      icon: "Building2",
    },
    {
      path: "/super-admin/analytics",
      label: "Analytics",
      icon: "BarChart3",
    },
    {
      path: "/super-admin/subscriptions",
      label: "Subscriptions",
      icon: "CreditCard",
    },
  ];

  // Profile & Settings - Separate from main
  const userRoutes = [
    {
      path: "/profile",
      label: "Profile",
      icon: "User",
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "Settings",
    },
  ];

  switch (role) {
    case ROLES.SUPER_ADMIN:
      return [...superAdminRoutes, ...userRoutes];
    case ROLES.ADMIN:
      return [
        { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { path: "/admin/products", label: "Products", icon: "Package" },
        { path: "/admin/categories", label: "Categories", icon: "Tags" },
        { path: "/admin/suppliers", label: "Suppliers", icon: "Truck" },
        { path: "/admin/stock", label: "Stock", icon: "Warehouse" },
        { path: "/admin/invoices", label: "Invoices", icon: "Receipt" },
        {
          path: "/admin/purchase-orders",
          label: "Purchase Orders",
          icon: "ShoppingCart",
        },
        { path: "/admin/team", label: "Team", icon: "Users" },
        { path: "/admin/chatbot", label: "AI Chatbot", icon: "Bot" },
        ...userRoutes,
      ];
    case ROLES.MANAGER:
      return [
        { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { path: "/manager/products", label: "Products", icon: "Package" },
        { path: "/manager/categories", label: "Categories", icon: "Tags" },
        { path: "/manager/suppliers", label: "Suppliers", icon: "Truck" },
        { path: "/manager/stock", label: "Stock", icon: "Warehouse" },
        { path: "/manager/invoices", label: "Invoices", icon: "Receipt" },
        {
          path: "/manager/purchase-orders",
          label: "Purchase Orders",
          icon: "ShoppingCart",
        },
        { path: "/manager/team", label: "Team", icon: "Users" },
        { path: "/manager/chatbot", label: "AI Chatbot", icon: "Bot" },
        ...userRoutes,
      ];
    case ROLES.STAFF:
      return [
        { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
        { path: "/staff/products", label: "Products", icon: "Package" },
        { path: "/staff/categories", label: "Categories", icon: "Tags" },
        { path: "/staff/suppliers", label: "Suppliers", icon: "Truck" },
        { path: "/staff/stock", label: "Stock", icon: "Warehouse" },
        { path: "/staff/invoices", label: "My Invoices", icon: "Receipt" },
        { path: "/staff/chatbot", label: "AI Chatbot", icon: "Bot" },
        ...userRoutes,
      ];
    default:
      return superAdminRoutes;
  }
};

export const getDefaultDashboardPath = (role) => {
  return "/dashboard";
};
