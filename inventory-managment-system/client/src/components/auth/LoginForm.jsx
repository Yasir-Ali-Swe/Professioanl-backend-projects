import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldContent,
} from "@/components/ui/field";
import { useLoginUserMutation } from "@/hooks/useAuth";
import { getRolePrefix } from "@/lib/rolePaths";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const loginMutation = useLoginUserMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        reset();
        const role = res.loginUser?.role || "admin";
        const prefix = getRolePrefix(role);
        navigate(`/${prefix}/dashboard`);
      },
    });
  };

  return (
    <div className={`flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 lg:px-10 h-full`}>
      <div className="w-full max-w-md mx-auto">
        {/* Header - Centered */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Boxes className="size-8 sm:size-9 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">StockPilot</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            AI-powered inventory management, built for growing businesses.
          </p>
        </div>

        {/* Form Content - Compact spacing */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="space-y-2.5 lg:space-y-3">
            {/* Email Field */}
            <Field orientation="vertical">
              <FieldLabel htmlFor="email" className="text-xs sm:text-sm">
                Email <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  className="h-9 sm:h-10 text-sm"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <FieldError errors={[errors.email]} />
                )}
              </FieldContent>
            </Field>

            {/* Password Field */}
            <Field orientation="vertical">
              <FieldLabel htmlFor="password" className="text-xs sm:text-sm">
                Password <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••"
                    className="h-9 sm:h-10 pr-10 text-sm"
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 
                             min-h-8 min-w-8 flex items-center justify-center
                             text-muted-foreground hover:text-foreground transition-colors
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {showPassword ? (
                      <EyeOff size={18} className="sm:size-5" />
                    ) : (
                      <Eye size={18} className="sm:size-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <FieldError errors={[errors.password]} />
                )}
              </FieldContent>
            </Field>

            {/* Forgot Password Link */}
            <div className="flex justify-start">
              <Link
                to="/forgot-password"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-9 sm:h-10 text-sm mt-1"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            {/* Register Link */}
            <div className="text-center pt-1">
              <Link
                to="/register"
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Don't have an account? Register
              </Link>
            </div>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
};