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
  { label: "Dashboard", icon: "LayoutDashboard", path: "dashboard" }, // visible to all roles

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
  {
    label: "Stock",
    icon: "Warehouse",
    path: "stock",
    roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
  },
  {
    label: "Invoices",
    icon: "Receipt",
    path: "invoices",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    label: "My Invoices",
    icon: "Receipt",
    path: "invoices",
    roles: [ROLES.STAFF],
  },
  {
    label: "Purchase Orders",
    icon: "ShoppingCart",
    path: "purchase-orders",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
  {
    label: "Team",
    icon: "Users",
    path: "team",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },

  { label: "AI Chatbot", icon: "Bot", path: "chatbot" }, // visible to all roles

  // --- Account section ---
  {
    label: "Profile",
    icon: "User",
    path: "profile",
    section: "account",
    children: [
      { label: "My Profile", icon: "User", path: "profile" }, // every role
      {
        label: "Organization Profile",
        icon: "Building2",
        path: "organization-profile",
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF], // not super_admin
      },
    ],
  },
  {
    label: "Invoice Settings",
    icon: "FileText",
    path: "invoice-settings",
    section: "account",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
  },
];

const withPrefix = (role, path) => `/${ROLE_PREFIX[role]}/${path}`;

// An entry is visible to a role if it has no "roles" restriction,
// or the role is explicitly listed.
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
