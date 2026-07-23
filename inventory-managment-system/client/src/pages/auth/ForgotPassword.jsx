import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { ArrowLeft, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from "@/components/ui/field";
import { useForgetPassword } from "@/hooks/useAuth";

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
});

const ForgotPasswordForm = () => {
    const forgetPasswordMutation = useForgetPassword();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data) => {
        forgetPasswordMutation.mutate(data, {
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
                        <Boxes className="size-8 sm:size-9" />
                        <h1 className="text-xl sm:text-2xl font-bold">StockPilot</h1>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                        AI-powered inventory management, built for growing businesses.
                    </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-2.5 lg:space-y-3">
                        {/* Email Field */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="email" className="text-xs sm:text-sm">
                                Email Address <span className="text-destructive">*</span>
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

                        {/* Description Text */}
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-9 sm:h-10 text-sm mt-1"
                            disabled={forgetPasswordMutation.isPending}
                        >
                            {forgetPasswordMutation.isPending ? (
                                <>
                                    <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin border-2 border-current border-t-transparent" />
                                    Sending...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </Button>

                        {/* Back to Login Link */}
                        <div className="text-center pt-1">
                            <Link
                                to="/login"
                                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                            >
                                Remember your password? Login
                            </Link>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordForm;