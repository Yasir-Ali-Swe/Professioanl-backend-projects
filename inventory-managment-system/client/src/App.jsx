// App.jsx
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
import SuperAdminProfilePage from "@/pages/superAdmin/SuperAdminProfile";

import ProfilePage from "@/pages/Profile";
import SettingsPage from "@/pages/Settings";

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
          <Route path="/dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="/super-admin/organizations" element={<OrganizationsListPage />} />
          <Route path="/super-admin/organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="/super-admin/analytics" element={<SuperAdminAnalyticsPage />} />
          <Route path="/super-admin/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/super-admin/subscriptions/:id" element={<SubscriptionDetailPage />} />
          <Route path="/profile" element={<SuperAdminProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;