import { Routes, Route, Navigate } from "react-router-dom";
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
import { ChatLayout } from "@/layouts/ChatLayout";
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

// Product Pages
import ProductsPage from "@/pages/products/ProductsList";
import ProductDetailsPage from "@/pages/products/ProductDetails";
import AddProductPage from "@/pages/products/ProductAdd";
import EditProductPage from "@/pages/products/ProductEdit";

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
import MyInvoicesPage from "@/pages/invoices/MyInvoices";

// Purchase Order Pages
import CreatePurchaseOrderPage from "@/pages/purchaseOrders/CreatePurchaseOrder";
import AllPurchaseOrdersPage from "@/pages/purchaseOrders/AllPurchaseOrders";

// Team Pages
import TeamListPage from "@/pages/team/TeamList";
import InviteUserPage from "@/pages/team/InviteUser";

// Manager Pages 
import ManagerDashboardPage from "@/pages/manager/ManagerDashboard";

// Staff Pages
import StaffDashboardPage from "@/pages/staff/StaffDashboard";

// AI Pages
import ChatbotPage from "@/pages/ai/Chatbot";
import ForecastPage from "@/pages/ai/Forecast";
import AnomalyDetectionPage from "@/pages/ai/Anomalies";
import InsightsPage from "@/pages/ai/Insights";
import ReorderSuggestionsPage from "@/pages/ai/ReorderSuggestions";
import ReorderSuggestionsHistoryPage from "@/pages/ai/ReorderSuggestionsHistory";

// Billing Page
import BillingPage from "@/pages/billing/Billing";
import BillingSuccessPage from "@/pages/billing/BillingSuccess";
import BillingCancelPage from "@/pages/billing/BillingCancel";

// Common Pages
import ProfilePage from "@/pages/Profile";
import OrganizationProfilePage from "@/pages/admin/OrganizationProfile";

import { useLoginUser } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

import { useSelector } from "react-redux";
import { selectIsAuthenticated, selectUser } from "@/store/slices/authSlice";
import { getRolePrefix } from "@/lib/rolePaths";

const RootRedirect = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  if (isAuthenticated && user?.role) {
    const prefix = getRolePrefix(user.role);
    return <Navigate to={`/${prefix}/dashboard`} replace />;
  }

  return <Navigate to="/login" replace />;
};

const App = () => {
  const { isLoading } = useLoginUser({
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      {/* Auth Routes - Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* ✅ Protected Routes - Chat Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ChatLayout />}>
          <Route path="/admin/chatbot" element={<ChatbotPage />} />
          <Route path="/super-admin/chatbot" element={<ChatbotPage />} />
          {/* <Route path="/manager/chatbot" element={<ChatbotPage />} /> */}
        </Route>
      </Route>

      {/* ✅ Protected Routes - Dashboard Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Super Admin Routes */}
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="/super-admin/organizations" element={<OrganizationsListPage />} />
          <Route path="/super-admin/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/super-admin/analytics" element={<SuperAdminAnalyticsPage />} />
          <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/super-admin/subscriptions/:id" element={<SubscriptionDetailPage />} />
          <Route path="/super-admin/profile" element={<ProfilePage />} />

          {/* Admin Dashboard */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

          {/* Invoice Routes */}
          <Route path="/admin/invoices/generate" element={<GenerateInvoicePage />} />
          <Route path="/admin/invoices" element={<AllInvoicesPage />} />
          <Route path="/admin/invoice-settings" element={<InvoiceSettingsPage />} />

          {/* Purchase Order Routes */}
          <Route path="/admin/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
          <Route path="/admin/purchase-orders" element={<AllPurchaseOrdersPage />} />

          {/* Team Routes */}
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
          <Route path="/admin/products" element={<ProductsPage />} />
          <Route path="/admin/products/add" element={<AddProductPage />} />
          <Route path="/admin/products/edit/:id" element={<EditProductPage />} />
          <Route path="/admin/products/:id" element={<ProductDetailsPage />} />

          {/* AI Admin Routes (Non-Chat) */}
          <Route path="/admin/forecast" element={<ForecastPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/admin/anomalies" element={<AnomalyDetectionPage />} />
          <Route path="/admin/insights" element={<InsightsPage />} />
          <Route path="/admin/reorder-suggestions" element={<ReorderSuggestionsPage />} />
          <Route path="/admin/reorder-suggestions/history" element={<ReorderSuggestionsHistoryPage />} />

          {/* Billing Route */}
          <Route path="/admin/billing" element={<BillingPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />

          {/* Admin Organization Profile Route */}
          <Route path="/admin/organization-profile" element={<OrganizationProfilePage />} />

          {/* Manager Routes */}
          <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
          <Route path="/manager/products" element={<ProductsPage />} />
          <Route path="/manager/products/add" element={<AddProductPage />} />
          <Route path="/manager/products/edit/:id" element={<EditProductPage />} />
          <Route path="/manager/products/:id" element={<ProductDetailsPage />} />
          <Route path="/manager/suppliers/add" element={<SupplierAddPage />} />
          <Route path="/manager/suppliers/:id/edit" element={<SupplierEditPage />} />
          <Route path="/manager/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="/manager/suppliers" element={<SuppliersListPage />} />
          <Route path="/manager/categories/add" element={<CategoryAddPage />} />
          <Route path="/manager/categories/:id/edit" element={<CategoryEditPage />} />
          <Route path="/manager/categories/:id" element={<CategoryDetailsPage />} />
          <Route path="/manager/categories" element={<CategoryListPage />} />
          <Route path="/manager/stock/overview" element={<StockOverviewPage />} />
          <Route path="/manager/stock/list" element={<StockListPage />} />
          <Route path="/manager/stock/low-stock" element={<LowStockPage />} />
          <Route path="/manager/stock/in" element={<StockInPage />} />
          <Route path="/manager/stock/out" element={<StockOutPage />} />
          <Route path="/manager/stock" element={<StockOverviewPage />} />
          <Route path="/manager/invoices/generate" element={<GenerateInvoicePage />} />
          <Route path="/manager/invoices" element={<AllInvoicesPage />} />
          <Route path="/manager/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
          <Route path="/manager/purchase-orders" element={<AllPurchaseOrdersPage />} />
          <Route path="/manager/team/invite" element={<InviteUserPage />} />
          <Route path="/manager/team" element={<TeamListPage />} />
          <Route path="/manager/profile" element={<ProfilePage />} />
          <Route path="/manager/organization-profile" element={<OrganizationProfilePage />} />
          <Route path="/manager/invoice-settings" element={<InvoiceSettingsPage />} />

          {/* Staff Routes */}
          <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
          <Route path="/staff/products" element={<ProductsPage />} />
          <Route path="/staff/products/:id" element={<ProductDetailsPage />} />
          <Route path="/staff/categories" element={<CategoryListPage />} />
          <Route path="/staff/categories/:id" element={<CategoryDetailsPage />} />
          <Route path="/staff/suppliers" element={<SuppliersListPage />} />
          <Route path="/staff/suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="/staff/stock/in" element={<StockInPage />} />
          <Route path="/staff/stock/out" element={<StockOutPage />} />
          <Route path="/staff/invoices/generate" element={<GenerateInvoicePage />} />
          <Route path="/staff/invoices" element={<MyInvoicesPage />} />
          <Route path="/staff/profile" element={<ProfilePage />} />
          <Route path="/staff/organization-profile" element={<OrganizationProfilePage />} />
          <Route path="/staff/invoice-settings" element={<InvoiceSettingsPage />} />

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