import { AuthLeftSection } from "../../components/auth/LeftSection";
import { LoginForm } from "@/components/auth/LoginForm";

const Login = () => {
  return (
    // <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <AuthLeftSection />
      <LoginForm />
    </div>
  );
};

export default Login;