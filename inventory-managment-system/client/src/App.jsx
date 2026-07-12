import { Routes, Route } from "react-router-dom"
import NotFoundPage from "@/pages/NotFoundPage";
import LoginPage from "@/pages/auth/Login";
import { AuthLayout } from "@/components/auth/AuthLayout";
import RegisterPage from "@/pages/auth/Register";
import ForgotPasswordPage from "@/pages/auth/ForgotPassword";
import ResetPasswordPage from "@/pages/auth/ResetPassword";
import VerifyEmailPage from "@/pages/auth/VerifyEmail";
const App = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App