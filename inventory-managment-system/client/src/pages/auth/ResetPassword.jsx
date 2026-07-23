import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Boxes, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from "@/components/ui/field";

import { useResetPassword } from "@/hooks/useAuth";

const resetPasswordSchema = z.object({
    newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const ResetPasswordForm = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const resetPasswordMutation = useResetPassword();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    });

    const newPassword = watch("newPassword");

    const onSubmit = async (data) => {
        if (!token) {
            toast.error("Invalid or missing reset token. Please request a new password reset.");
            return;
        }
        resetPasswordMutation.mutate({ token, newPassword: data.newPassword }, {
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <div className={`flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 lg:px-10 h-full`}>
            <div className="w-full max-w-md mx-auto">
                {/* Go Back Button */}
                <div className="mb-4">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </div>

                {/* Header - Centered */}
                <div className="text-center mb-6 lg:mb-8">
                    <div className="flex items-center justify-center gap-3 mb-1">
                        <Boxes className="size-8 sm:size-9 text-primary" />
                        <h1 className="text-xl sm:text-2xl font-bold">StockPilot</h1>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                        AI-powered inventory management, built for growing businesses.
                    </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-2.5 lg:space-y-3">
                        {/* New Password Field */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="newPassword" className="text-xs sm:text-sm">
                                New Password <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="••••••"
                                        className="h-9 sm:h-10 pr-10 text-sm"
                                        {...register("newPassword")}
                                        aria-invalid={errors.newPassword ? "true" : "false"}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowNewPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 
                             min-h-8 min-w-8 flex items-center justify-center
                             text-muted-foreground hover:text-foreground transition-colors
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff size={18} className="sm:size-5" />
                                        ) : (
                                            <Eye size={18} className="sm:size-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.newPassword && (
                                    <FieldError errors={[errors.newPassword]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Confirm Password Field */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="confirmPassword" className="text-xs sm:text-sm">
                                Confirm Password <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••"
                                        className="h-9 sm:h-10 pr-10 text-sm"
                                        {...register("confirmPassword")}
                                        aria-invalid={errors.confirmPassword ? "true" : "false"}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 
                             min-h-8 min-w-8 flex items-center justify-center
                             text-muted-foreground hover:text-foreground transition-colors
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={18} className="sm:size-5" />
                                        ) : (
                                            <Eye size={18} className="sm:size-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <FieldError errors={[errors.confirmPassword]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Password Strength Indicator (Optional) */}
                        {newPassword && newPassword.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-muted overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${newPassword.length < 6 ? 'bg-destructive w-1/3' :
                                            newPassword.length < 10 ? 'bg-yellow-500 w-2/3' :
                                                'bg-green-500 w-full'
                                            }`}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {newPassword.length < 6 ? 'Weak' :
                                        newPassword.length < 10 ? 'Medium' :
                                            'Strong'}
                                </span>
                            </div>
                        )}

                        {/* Description Text */}
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Enter your new password. It must be at least 6 characters long.
                        </p>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-9 sm:h-10 text-sm mt-1"
                            disabled={resetPasswordMutation.isPending}
                        >
                            {resetPasswordMutation.isPending ? (
                                <>
                                    <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin border-2 border-current border-t-transparent" />
                                    Resetting...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>

                        {/* Back to Login Link */}
                        <div className="text-center pt-1">
                            <Link
                                to="/login"
                                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};
export default ResetPasswordForm;