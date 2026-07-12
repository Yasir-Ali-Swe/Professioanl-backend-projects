import { AuthLeftSection } from "../../components/auth/LeftSection";
import { LoginForm } from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen overflow-hidden">
      <AuthLeftSection />
      <LoginForm />
    </div>
  );
};

export default Login;