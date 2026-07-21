// routes/index.js
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
};

const ROLE_PREFIX = {
  [ROLES.SUPER_ADMIN]: "super-admin",
  [ROLES.ADMIN]: "admin",
  [ROLES.MANAGER]: "manager",
  [ROLES.STAFF]: "staff",
};

const SIDEBAR_CONFIG = [
  // --- Common for all roles ---
  { label: "Dashboard", icon: "LayoutDashboard", path: "dashboard" },

  // --- Super Admin only ---
  {
    label: "Organizations",
    icon: "Building2",
    path: "organizations",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    label: "Analytics",
    icon: "BarChart3",
    path: "analytics",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    label: "Subscriptions",
    icon: "CreditCard",
    path: "subscriptions",
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    label: "AI Chatbot",
    icon: "Bot",
    path: "chatbot",
    roles: [ROLES.SUPER_ADMIN],
  },
  // --- Inventory-style pages (Admin / Manager / Staff) ---
  {
    label: "Products",
    icon: "Package",
    path: "products",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  },
  {
    label: "Categories",
    icon: "Tags",
    path: "categories",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  },
  {
    label: "Suppliers",
    icon: "Truck",
    path: "suppliers",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  },

  // --- Stock Management ---
  {
    label: "Stock Management",
    icon: "Warehouse",
    path: "stock",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
    children: [
      {
        label: "Overview",
        icon: "LayoutDashboard",
        path: "stock/overview",
        roles: [ROLES.ADMIN, ROLES.MANAGER],
      },
      {
        label: "All Stock",
        icon: "Package",
        path: "stock/list",
        roles: [ROLES.ADMIN, ROLES.MANAGER],
      },
      {
        label: "Low Stock",
        icon: "AlertCircle",
        path: "stock/low-stock",
        roles: [ROLES.ADMIN, ROLES.MANAGER],
      },
      {
        label: "Stock In",
        icon: "ArrowDown",
        path: "stock/in",
      },
      {
        label: "Stock Out",
        icon: "ArrowUp",
        path: "stock/out",
      },
    ],
  },

  // --- Invoices ---
  {
    label: "Invoices",
    icon: "Receipt",
    path: "invoices",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: "All Invoices", icon: "List", path: "invoices" },
      { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
    ],
  },
  {
    label: "Invoices",
    icon: "Receipt",
    path: "invoices",
    roles: [ROLES.STAFF],
    children: [
      { label: "My Invoices", icon: "List", path: "invoices" },
      { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
    ],
  },

  // --- Purchase Orders (Admin / Manager only) ---
  {
    label: "Purchase Orders",
    icon: "ShoppingCart",
    path: "purchase-orders",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: "All POs", icon: "List", path: "purchase-orders" },
      { label: "Create PO", icon: "Plus", path: "purchase-orders/create" },
    ],
  },

  // --- Team (Admin / Manager only) ---
  {
    label: "Team",
    icon: "Users",
    path: "team",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: "Team Members", icon: "Users", path: "team" },
      { label: "Invite User", icon: "UserPlus", path: "team/invite" },
    ],
  },

  // ✅ NEW: AI Section (Admin only)
  {
    label: "AI",
    icon: "Bot",
    path: "ai",
    roles: [ROLES.ADMIN],
    children: [
      { label: "AI Chatbot", icon: "MessageCircle", path: "chatbot" },
      { label: "AI Forecast", icon: "TrendingUp", path: "forecast" },
      { label: "AI Anomalies", icon: "AlertTriangle", path: "anomalies" },
      { label: "AI Insights", icon: "Lightbulb", path: "insights" },
      {
        label: "Reorder Suggestions",
        icon: "ShoppingCart",
        path: "reorder-suggestions",
      },
      {
        label: "Reorder History",
        icon: "ShoppingCart",
        path: "reorder-suggestions/history",
      },
    ],
  },

  // ✅ Billing (Admin only - individual page)
  {
    label: "Billing",
    icon: "CreditCard",
    path: "billing",
    roles: [ROLES.ADMIN],
  },

  // --- Account section ---
  {
    label: "Profile",
    icon: "User",
    path: "profile",
    section: "account",
    children: [
      { label: "My Profile", icon: "User", path: "profile" },
      {
        label: "Organization Profile",
        icon: "Building2",
        path: "organization-profile",
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
      },
    ],
  },
  {
    label: "Invoice Settings",
    icon: "FileText",
    path: "invoice-settings",
    section: "account",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  },
];

const withPrefix = (role, path) => `/${ROLE_PREFIX[role]}/${path}`;

const isVisibleToRole = (entry, role) =>
  !entry.roles || entry.roles.includes(role);

export const getDashboardPath = (role) => withPrefix(role, "dashboard");

export const getDefaultDashboardPath = (role) => getDashboardPath(role);

export const getDashboardRoutes = (role) => {
  return SIDEBAR_CONFIG.filter((route) => isVisibleToRole(route, role)).map(
    (route) => {
      const builtRoute = {
        path: withPrefix(role, route.path),
        label: route.label,
        icon: route.icon,
        ...(route.section && { section: route.section }),
      };

      if (route.children) {
        builtRoute.children = route.children
          .filter((child) => isVisibleToRole(child, role))
          .map((child) => ({
            path: withPrefix(role, child.path),
            label: child.label,
            icon: child.icon,
          }));
      }

      return builtRoute;
    },
  );
};
