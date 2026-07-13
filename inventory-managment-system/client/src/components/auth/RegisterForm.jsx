import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from "@/components/ui/field";

// Registration Form Schema
const registerSchema = z.object({
    companyName: z.string().min(2, { message: "Company name is required" }),
    companyEmail: z.string().email({ message: "Invalid email address" }),
    companyAddress: z.string().min(5, { message: "Company address is required" }),
    companyPhone: z.string().min(10, { message: "Invalid phone number" }),
    ownerName: z.string().min(2, { message: "Owner name is required" }),
    ownerEmail: z.string().email({ message: "Invalid email address" }),
    ownerPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const RegisterForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            companyName: "",
            companyEmail: "",
            companyAddress: "",
            companyPhone: "",
            ownerName: "",
            ownerEmail: "",
            ownerPassword: "",
        },
    });

    const onSubmit = async (data) => {
        console.log("📤 Registration form submitted with data:", data);

        setIsLoading(true);
        try {
            // TODO: Replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success("Registration successful! 🎉");
            reset();
        } catch (error) {
            toast.error(error.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 lg:py-8 `}>
            {/* Registration Form - No border, no rounded corners, no shadow */}
            < div className="w-full max-w-3xl mx-auto h-full flex flex-col justify-center">
                {/* Header - Centered */}
                <div className="text-center mb-4 lg:mb-6">
                    <div className="flex items-center justify-center gap-3 mb-1">
                        <Boxes className="size-8 sm:size-9" />
                        <h1 className="text-xl sm:text-2xl font-bold">StockPilot</h1>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                        AI-powered inventory management, built for growing businesses.
                    </p>
                </div>

                {/* Form Content - Compact spacing */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-center">
                    <FieldGroup className="space-y-3 lg:space-y-3.5">
                        {/* Row 1: Company Name & Company Email */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="companyName" className="text-xs sm:text-sm">
                                    Company Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="companyName"
                                        type="text"
                                        placeholder="Acme Inc."
                                        className="h-9 sm:h-10 text-sm rounded-none"
                                        {...register("companyName")}
                                        aria-invalid={errors.companyName ? "true" : "false"}
                                    />
                                    {errors.companyName && (
                                        <FieldError errors={[errors.companyName]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="companyEmail" className="text-xs sm:text-sm">
                                    Company Email <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="companyEmail"
                                        type="email"
                                        placeholder="company@example.com"
                                        className="h-9 sm:h-10 text-sm rounded-none"
                                        {...register("companyEmail")}
                                        aria-invalid={errors.companyEmail ? "true" : "false"}
                                    />
                                    {errors.companyEmail && (
                                        <FieldError errors={[errors.companyEmail]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: Company Phone & Owner Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="companyPhone" className="text-xs sm:text-sm">
                                    Company Phone <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="companyPhone"
                                        type="tel"
                                        placeholder="+1 234 567 8900"
                                        className="h-9 sm:h-10 text-sm rounded-none"
                                        {...register("companyPhone")}
                                        aria-invalid={errors.companyPhone ? "true" : "false"}
                                    />
                                    {errors.companyPhone && (
                                        <FieldError errors={[errors.companyPhone]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="ownerName" className="text-xs sm:text-sm">
                                    Owner Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="ownerName"
                                        type="text"
                                        placeholder="John Doe"
                                        className="h-9 sm:h-10 text-sm rounded-none"
                                        {...register("ownerName")}
                                        aria-invalid={errors.ownerName ? "true" : "false"}
                                    />
                                    {errors.ownerName && (
                                        <FieldError errors={[errors.ownerName]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 3: Owner Email & Owner Password */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="ownerEmail" className="text-xs sm:text-sm">
                                    Owner Email <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="ownerEmail"
                                        type="email"
                                        placeholder="owner@example.com"
                                        className="h-9 sm:h-10 text-sm rounded-none"
                                        {...register("ownerEmail")}
                                        aria-invalid={errors.ownerEmail ? "true" : "false"}
                                    />
                                    {errors.ownerEmail && (
                                        <FieldError errors={[errors.ownerEmail]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="ownerPassword" className="text-xs sm:text-sm">
                                    Owner Password <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <Input
                                            id="ownerPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••"
                                            className="h-9 sm:h-10 pr-10 text-sm rounded-none"
                                            {...register("ownerPassword")}
                                            aria-invalid={errors.ownerPassword ? "true" : "false"}
                                        />
                                        <button
                                            type="button"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 
                                                     min-h-8 min-w-8 flex items-center justify-center
                                                     text-muted-foreground hover:text-foreground transition-colors
                                                     focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-none"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={18} className="sm:size-5" />
                                            ) : (
                                                <Eye size={18} className="sm:size-5" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.ownerPassword && (
                                        <FieldError errors={[errors.ownerPassword]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 4: Company Address (Full Width) - Using Textarea */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="companyAddress" className="text-xs sm:text-sm">
                                Company Address <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Textarea
                                    id="companyAddress"
                                    placeholder="123 Business St, City, State, ZIP"
                                    className="min-h-15 sm:min-h-17.5 text-sm rounded-none resize-none"
                                    {...register("companyAddress")}
                                    aria-invalid={errors.companyAddress ? "true" : "false"}
                                />
                                {errors.companyAddress && (
                                    <FieldError errors={[errors.companyAddress]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-9 sm:h-10 text-sm mt-1 rounded-none"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Registering...
                                </>
                            ) : (
                                "Register"
                            )}
                        </Button>

                        {/* Login Link */}
                        <div className="text-center pt-1">
                            <Link
                                to="/login"
                                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                            >
                                Already have an account? Login
                            </Link>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div >
    );
};