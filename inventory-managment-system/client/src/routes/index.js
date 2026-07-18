// // // routes/index.js
// // export const ROLES = {
// //   SUPER_ADMIN: "super_admin",
// //   ADMIN: "admin",
// //   MANAGER: "manager",
// //   STAFF: "staff",
// // };

// // const ROLE_PREFIX = {
// //   [ROLES.SUPER_ADMIN]: "super-admin",
// //   [ROLES.ADMIN]: "admin",
// //   [ROLES.MANAGER]: "manager",
// //   [ROLES.STAFF]: "staff",
// // };

// // const SIDEBAR_CONFIG = [
// //   { label: "Dashboard", icon: "LayoutDashboard", path: "dashboard" }, // visible to all roles
// //   {
// //     label: "Organizations",
// //     icon: "Building2",
// //     path: "organizations",
// //     roles: [ROLES.SUPER_ADMIN],
// //   },
// //   {
// //     label: "Analytics",
// //     icon: "BarChart3",
// //     path: "analytics",
// //     roles: [ROLES.SUPER_ADMIN],
// //   },
// //   {
// //     label: "Subscriptions",
// //     icon: "CreditCard",
// //     path: "subscriptions",
// //     roles: [ROLES.SUPER_ADMIN],
// //   },
// //   {
// //     label: "Products",
// //     icon: "Package",
// //     path: "products",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
// //   },
// //   {
// //     label: "Categories",
// //     icon: "Tags",
// //     path: "categories",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
// //   },
// //   {
// //     label: "Suppliers",
// //     icon: "Truck",
// //     path: "suppliers",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
// //   },
// //   {
// //     label: "Stock Management",
// //     icon: "Warehouse",
// //     path: "stock",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
// //     children: [
// //       { label: "Overview", icon: "LayoutDashboard", path: "stock/overview" },
// //       { label: "All Stock", icon: "Package", path: "stock/list" },
// //       { label: "Low Stock", icon: "AlertCircle", path: "stock/low-stock" },
// //       { label: "Stock In", icon: "ArrowDown", path: "stock/in" },
// //       { label: "Stock Out", icon: "ArrowUp", path: "stock/out" },
// //     ],
// //   },
// //   {
// //     label: "Invoices",
// //     icon: "Receipt",
// //     path: "invoices",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER],
// //     children: [
// //       { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
// //       { label: "All Invoices", icon: "List", path: "invoices" },
// //     ],
// //   },
// //   {
// //     label: "My Invoices",
// //     icon: "Receipt",
// //     path: "invoices",
// //     roles: [ROLES.STAFF],
// //   },
// //   {
// //     label: "Purchase Orders",
// //     icon: "ShoppingCart",
// //     path: "purchase-orders",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER],
// //     children: [
// //       { label: "Create PO", icon: "Plus", path: "purchase-orders/create" },
// //       { label: "All POs", icon: "List", path: "purchase-orders" },
// //     ],
// //   },
// //   {
// //     label: "Team",
// //     icon: "Users",
// //     path: "team",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER],
// //     children: [
// //       { label: "Team Members", icon: "Users", path: "team" },
// //       { label: "Invite User", icon: "UserPlus", path: "team/invite" },
// //     ],
// //   },

// //   { label: "AI Chatbot", icon: "Bot", path: "chatbot" },

// //   {
// //     label: "Profile",
// //     icon: "User",
// //     path: "profile",
// //     section: "account",
// //     children: [
// //       { label: "My Profile", icon: "User", path: "profile" },
// //       {
// //         label: "Organization Profile",
// //         icon: "Building2",
// //         path: "organization-profile",
// //         roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
// //       },
// //     ],
// //   },
// //   {
// //     label: "Invoice",
// //     icon: "FileText",
// //     path: "invoice-settings",
// //     section: "account",
// //     roles: [ROLES.ADMIN, ROLES.MANAGER],
// //   },
// // ];

// // const withPrefix = (role, path) => `/${ROLE_PREFIX[role]}/${path}`;
// // const isVisibleToRole = (entry, role) =>
// //   !entry.roles || entry.roles.includes(role);

// // export const getDashboardPath = (role) => withPrefix(role, "dashboard");

// // export const getDefaultDashboardPath = (role) => getDashboardPath(role);

// // export const getDashboardRoutes = (role) => {
// //   return SIDEBAR_CONFIG.filter((route) => isVisibleToRole(route, role)).map(
// //     (route) => {
// //       const builtRoute = {
// //         path: withPrefix(role, route.path),
// //         label: route.label,
// //         icon: route.icon,
// //         ...(route.section && { section: route.section }),
// //       };

// //       if (route.children) {
// //         builtRoute.children = route.children
// //           .filter((child) => isVisibleToRole(child, role))
// //           .map((child) => ({
// //             path: withPrefix(role, child.path),
// //             label: child.label,
// //             icon: child.icon,
// //           }));
// //       }

// //       return builtRoute;
// //     },
// //   );
// // };

// // routes/index.js
// export const ROLES = {
//   SUPER_ADMIN: "super_admin",
//   ADMIN: "admin",
//   MANAGER: "manager",
//   STAFF: "staff",
// };

// const ROLE_PREFIX = {
//   [ROLES.SUPER_ADMIN]: "super-admin",
//   [ROLES.ADMIN]: "admin",
//   [ROLES.MANAGER]: "manager",
//   [ROLES.STAFF]: "staff",
// };

// const SIDEBAR_CONFIG = [
//   { label: "Dashboard", icon: "LayoutDashboard", path: "dashboard" },
//   {
//     label: "Organizations",
//     icon: "Building2",
//     path: "organizations",
//     roles: [ROLES.SUPER_ADMIN],
//   },
//   {
//     label: "Analytics",
//     icon: "BarChart3",
//     path: "analytics",
//     roles: [ROLES.SUPER_ADMIN],
//   },
//   {
//     label: "Subscriptions",
//     icon: "CreditCard",
//     path: "subscriptions",
//     roles: [ROLES.SUPER_ADMIN],
//   },
//   {
//     label: "Products",
//     icon: "Package",
//     path: "products",
//     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//   },
//   {
//     label: "Categories",
//     icon: "Tags",
//     path: "categories",
//     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//   },
//   {
//     label: "Suppliers",
//     icon: "Truck",
//     path: "suppliers",
//     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//   },
//   {
//     label: "Stock Management",
//     icon: "Warehouse",
//     path: "stock",
//     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//     children: [
//       { label: "Overview", icon: "LayoutDashboard", path: "stock/overview" },
//       { label: "All Stock", icon: "Package", path: "stock/list" },
//       { label: "Low Stock", icon: "AlertCircle", path: "stock/low-stock" },
//       { label: "Stock In", icon: "ArrowDown", path: "stock/in" },
//       { label: "Stock Out", icon: "ArrowUp", path: "stock/out" },
//     ],
//   },
//   {
//     label: "Invoices",
//     icon: "Receipt",
//     path: "invoices",
//     roles: [ROLES.ADMIN, ROLES.MANAGER],
//     children: [
//       { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
//       { label: "All Invoices", icon: "List", path: "invoices" },
//     ],
//   },
//   {
//     label: "My Invoices",
//     icon: "Receipt",
//     path: "invoices",
//     roles: [ROLES.STAFF],
//     children: [
//       { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
//       { label: "My Invoices", icon: "List", path: "invoices" },
//     ],
//   },

//   {
//     label: "Purchase Orders",
//     icon: "ShoppingCart",
//     path: "purchase-orders",
//     roles: [ROLES.ADMIN, ROLES.MANAGER],
//     children: [
//       { label: "Create PO", icon: "Plus", path: "purchase-orders/create" },
//       { label: "All POs", icon: "List", path: "purchase-orders" },
//     ],
//   },

//   {
//     label: "Team",
//     icon: "Users",
//     path: "team",
//     roles: [ROLES.ADMIN, ROLES.MANAGER],
//     children: [
//       { label: "Team Members", icon: "Users", path: "team" },
//       { label: "Invite User", icon: "UserPlus", path: "team/invite" },
//     ],
//   },
//   {
//     label: "AI Chatbot",
//     icon: "Bot",
//     path: "chatbot",
//     roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
//   },
//   {
//     label: "Profile",
//     icon: "User",
//     path: "profile",
//     section: "account",
//     children: [
//       { label: "My Profile", icon: "User", path: "profile" },
//       {
//         label: "Organization Profile",
//         icon: "Building2",
//         path: "organization-profile",
//         roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//       },
//     ],
//   },
//   {
//     label: "Invoice Settings",
//     icon: "FileText",
//     path: "invoice-settings",
//     section: "account",
//     roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
//   },
// ];

// const withPrefix = (role, path) => `/${ROLE_PREFIX[role]}/${path}`;

// const isVisibleToRole = (entry, role) =>
//   !entry.roles || entry.roles.includes(role);

// export const getDashboardPath = (role) => withPrefix(role, "dashboard");

// export const getDefaultDashboardPath = (role) => getDashboardPath(role);

// export const getDashboardRoutes = (role) => {
//   return SIDEBAR_CONFIG.filter((route) => isVisibleToRole(route, role)).map(
//     (route) => {
//       const builtRoute = {
//         path: withPrefix(role, route.path),
//         label: route.label,
//         icon: route.icon,
//         ...(route.section && { section: route.section }),
//       };

//       if (route.children) {
//         builtRoute.children = route.children
//           .filter((child) => isVisibleToRole(child, role))
//           .map((child) => ({
//             path: withPrefix(role, child.path),
//             label: child.label,
//             icon: child.icon,
//           }));
//       }

//       return builtRoute;
//     },
//   );
// };

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
      // ✅ Admin and Manager can access all stock pages
      // ✅ Staff can only access Stock In and Stock Out
      {
        label: "Overview",
        icon: "LayoutDashboard",
        path: "stock/overview",
        roles: [ROLES.ADMIN, ROLES.MANAGER], // ✅ Admin & Manager only
      },
      {
        label: "All Stock",
        icon: "Package",
        path: "stock/list",
        roles: [ROLES.ADMIN, ROLES.MANAGER], // ✅ Admin & Manager only
      },
      {
        label: "Low Stock",
        icon: "AlertCircle",
        path: "stock/low-stock",
        roles: [ROLES.ADMIN, ROLES.MANAGER], // ✅ Admin & Manager only
      },
      {
        label: "Stock In",
        icon: "ArrowDown",
        path: "stock/in",
        // ✅ All roles can access Stock In (Admin, Manager, Staff)
      },
      {
        label: "Stock Out",
        icon: "ArrowUp",
        path: "stock/out",
        // ✅ All roles can access Stock Out (Admin, Manager, Staff)
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
      { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
      { label: "All Invoices", icon: "List", path: "invoices" },
    ],
  },
  {
    label: "My Invoices",
    icon: "Receipt",
    path: "invoices",
    roles: [ROLES.STAFF],
    children: [
      { label: "Generate Invoice", icon: "Plus", path: "invoices/generate" },
      { label: "My Invoices", icon: "List", path: "invoices" },
    ],
  },

  // --- Purchase Orders (Admin / Manager only) ---
  {
    label: "Purchase Orders",
    icon: "ShoppingCart",
    path: "purchase-orders",
    roles: [ROLES.ADMIN, ROLES.MANAGER],
    children: [
      { label: "Create PO", icon: "Plus", path: "purchase-orders/create" },
      { label: "All POs", icon: "List", path: "purchase-orders" },
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

  // --- AI Chatbot (Super Admin, Admin, Manager only) ---
  {
    label: "AI Chatbot",
    icon: "Bot",
    path: "chatbot",
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
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
