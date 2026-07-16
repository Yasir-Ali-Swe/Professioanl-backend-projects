import { Routes, Route } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage";

// Auth Pages
import LoginPage from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/Register";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword";
import ResetPasswordPage from "@/pages/auth/ResetPassword";
import VerifyEmailPage from "@/pages/auth/VerifyEmail";

// Layouts
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";

// Super Admin Pages
import SuperAdminDashboardPage from "@/pages/superAdmin/SuperAdminDashboard";
import OrganizationsListPage from "@/pages/superAdmin/OrganizationsList";
import OrganizationDetailPage from "@/pages/superAdmin/OrganizationDetail";
import SuperAdminAnalyticsPage from "@/pages/superAdmin/SuperAdminAnalytics";
import SubscriptionsPage from "@/pages/superAdmin/Subscriptions";
import SubscriptionDetailPage from "@/pages/superAdmin/SubscriptionDetail";

// Admin Pages
import AdminDashboardPage from "@/pages/admin/AdminDashboard";
import AdminProductsPage from "@/pages/products/ProductsList";
import AdminProductDetailsPage from "@/pages/products/ProductDetails";
import AdminAddProductPage from "@/pages/products/ProductAdd";
import AdminEditProductPage from "@/pages/products/ProductEdit";

// Category Pages
import CategoryAddPage from "@/pages/categories/CategoryAdd";
import CategoryEditPage from "@/pages/categories/CategoryEdit";
import CategoryListPage from "@/pages/categories/CategoriesList";
import CategoryDetailsPage from "@/pages/categories/CategoryDetail";

// Supplier Pages
import SuppliersListPage from "@/pages/suppliers/SuppliersList";
import SupplierAddPage from "@/pages/suppliers/SupplierAdd";
import SupplierEditPage from "@/pages/suppliers/SupplierEdit";
import SupplierDetailPage from "@/pages/suppliers/SupplierDetail";

// Stock Pages
import StockOverviewPage from "@/pages/stock/StockOverview";
import StockListPage from "@/pages/stock/StockList";
import LowStockPage from "@/pages/stock/LowStock";
import StockInPage from "@/pages/stock/StockIn";
import StockOutPage from "@/pages/stock/StockOut";

// Invoice Pages
import GenerateInvoicePage from "@/pages/invoices/GenerateInvoice";
import AllInvoicesPage from "@/pages/invoices/AllInvoices";
import InvoiceSettingsPage from "@/pages/invoices/InvoiceSettings";

// Purchase Order Pages
import CreatePurchaseOrderPage from "@/pages/purchaseOrders/CreatePurchaseOrder";
import AllPurchaseOrdersPage from "@/pages/purchaseOrders/AllPurchaseOrders";

// Team Pages
import TeamListPage from "@/pages/team/TeamList";
import InviteUserPage from "@/pages/team/InviteUser";

// Common Pages
import ProfilePage from "@/pages/Profile";
import OrganizationProfilePage from "@/pages/admin/OrganizationProfile";
import ChatbotPage from "@/pages/Chatbot";

const App = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* Protected Routes - Dashboard Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Super Admin Routes */}
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="/super-admin/organizations" element={<OrganizationsListPage />} />
          <Route path="/super-admin/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/super-admin/analytics" element={<SuperAdminAnalyticsPage />} />
          <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/super-admin/subscriptions/:id" element={<SubscriptionDetailPage />} />
          <Route path="/super-admin/chatbot" element={<ChatbotPage />} />
          <Route path="/super-admin/profile" element={<ProfilePage />} />

          {/* Admin Dashboard */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

          {/* Invoice Routes */}
          <Route path="/admin/invoices/generate" element={<GenerateInvoicePage />} />
          <Route path="/admin/invoices" element={<AllInvoicesPage />} />
          <Route path="/admin/invoice-settings" element={<InvoiceSettingsPage />} />

          {/* Purchase Order Routes - ORDER MATTERS! */}
          <Route path="/admin/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
          <Route path="/admin/purchase-orders" element={<AllPurchaseOrdersPage />} />

          {/* Team Routes - ORDER MATTERS! */}
          <Route path="/admin/team/invite" element={<InviteUserPage />} />
          <Route path="/admin/team" element={<TeamListPage />} />

          {/* Category Routes */}
          <Route path="/admin/categories/add" element={<CategoryAddPage />} />
          <Route path="/admin/categories/:id/edit" element={<CategoryEditPage />} />
          <Route path="/admin/categories/:id" element={<CategoryDetailsPage />} />
          <Route path="/admin/categories" element={<CategoryListPage />} />

          {/* Supplier Routes */}
          <Route path="/admin/suppliers/add" element={<SupplierAddPage />} />
          <Route path="/admin/suppliers/:id/edit" element={<SupplierEditPage />} />
          <Route path="/admin/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="/admin/suppliers" element={<SuppliersListPage />} />

          {/* Stock Routes */}
          <Route path="/admin/stock/overview" element={<StockOverviewPage />} />
          <Route path="/admin/stock/list" element={<StockListPage />} />
          <Route path="/admin/stock/low-stock" element={<LowStockPage />} />
          <Route path="/admin/stock/in" element={<StockInPage />} />
          <Route path="/admin/stock/out" element={<StockOutPage />} />
          <Route path="/admin/stock" element={<StockOverviewPage />} />

          {/* Product Routes */}
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/add" element={<AdminAddProductPage />} />
          <Route path="/admin/products/edit/:id" element={<AdminEditProductPage />} />
          <Route path="/admin/products/:id" element={<AdminProductDetailsPage />} />

          {/* Other Admin Routes */}
          <Route path="/admin/chatbot" element={<ChatbotPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/admin/organization-profile" element={<OrganizationProfilePage />} />

          {/* Manager Routes - Commented out */}
          {/* <Route path="/manager/dashboard" element={<ManagerDashboardPage />} /> */}
          {/* <Route path="/manager/products" element={<ManagerProductsPage />} /> */}
          {/* <Route path="/manager/categories" element={<ManagerCategoriesPage />} /> */}
          {/* <Route path="/manager/suppliers" element={<ManagerSuppliersPage />} /> */}
          {/* <Route path="/manager/stock" element={<ManagerStockPage />} /> */}
          {/* <Route path="/manager/invoices" element={<ManagerInvoicesPage />} /> */}
          {/* <Route path="/manager/purchase-orders" element={<ManagerPurchaseOrdersPage />} /> */}
          {/* <Route path="/manager/team" element={<ManagerTeamPage />} /> */}
          {/* <Route path="/manager/chatbot" element={<ChatbotPage />} /> */}
          {/* <Route path="/manager/profile" element={<ProfilePage />} /> */}
          {/* <Route path="/manager/organization-profile" element={<OrganizationProfilePage />} /> */}
          {/* <Route path="/manager/invoice-settings" element={<InvoiceSettingsPage />} /> */}

          {/* Staff Routes - Commented out */}
          {/* <Route path="/staff/dashboard" element={<StaffDashboardPage />} /> */}
          {/* <Route path="/staff/products" element={<StaffProductsPage />} /> */}
          {/* <Route path="/staff/categories" element={<StaffCategoriesPage />} /> */}
          {/* <Route path="/staff/suppliers" element={<StaffSuppliersPage />} /> */}
          {/* <Route path="/staff/stock" element={<StaffStockPage />} /> */}
          {/* <Route path="/staff/invoices" element={<StaffInvoicesPage />} /> */}
          {/* <Route path="/staff/chatbot" element={<ChatbotPage />} /> */}
          {/* <Route path="/staff/profile" element={<ProfilePage />} /> */}
          {/* <Route path="/staff/organization-profile" element={<OrganizationProfilePage />} /> */}

          {/* Redirect old dashboard to Super Admin dashboard */}
          <Route path="/dashboard" element={<SuperAdminDashboardPage />} />
        </Route>
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;