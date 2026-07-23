import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Boxes, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/hooks/useAuth";

const VerifyEmailForm = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [isLoading, setIsLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState(null); // 'success' | 'error'
    const verifyMutation = useVerifyEmail();

    useEffect(() => {
        if (!token) {
            setVerificationStatus('error');
            setIsLoading(false);
            return;
        }

        verifyMutation.mutate(token, {
            onSuccess: () => {
                setVerificationStatus('success');
                setIsLoading(false);
            },
            onError: () => {
                setVerificationStatus('error');
                setIsLoading(false);
            }
        });
    }, [token]);

    // Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen px-4">
                <div className="text-center">
                    <Boxes className="size-12 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Verifying Your Email</h2>
                    <p className="text-muted-foreground mb-4">Please wait while we verify your email address...</p>
                    <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                </div>
            </div>
        );
    }

    // Success State
    if (verificationStatus === 'success') {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen px-4">
                <div className="text-center max-w-md mx-auto">
                    <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Email Verified! ✅</h2>
                    <p className="text-muted-foreground mb-6">
                        Your email has been successfully verified. You can now login to your account.
                    </p>
                    <Button asChild className="w-full h-10">
                        <Link to="/login">Go to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Error State
    return (
        <div className="flex flex-col justify-center items-center min-h-screen px-4">
            <div className="text-center max-w-md mx-auto">
                <XCircle className="size-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Verification Failed ❌</h2>
                <p className="text-muted-foreground mb-6">
                    {!token
                        ? "Invalid verification link. Please check your email for the correct link."
                        : "We couldn't verify your email. The link may have expired or is invalid."
                    }
                </p>
                <div className="space-y-3">
                    <Button asChild className="w-full h-10">
                        <Link to="/login">Go to Login</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full h-10">
                        <Link to="/resend-verification">Resend Verification Email</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailForm;