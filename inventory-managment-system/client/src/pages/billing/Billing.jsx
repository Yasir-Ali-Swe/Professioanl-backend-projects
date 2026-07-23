// pages/billing/BillingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, useCreateCheckoutSession, useCancelSubscription } from '@/hooks/useBilling';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Crown,
    Sparkles,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
    Loader2,
    CreditCard,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Status Configuration
const statusConfig = {
    active: { label: 'Active', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    past_due: { label: 'Past Due', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    canceled: { label: 'Canceled', className: 'bg-red-500/10 text-destructive border-red-500/20' },
    incomplete: { label: 'Incomplete', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
};

const BillingPage = () => {
    const navigate = useNavigate();
    const { data: response, isLoading, isError } = useSubscription();
    const checkoutMutation = useCreateCheckoutSession();
    const cancelMutation = useCancelSubscription();

    const [showCancelDialog, setShowCancelDialog] = useState(false);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !response?.success) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load subscription details</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const subscription = response.data || {
        subscriptionPlanId: {
            name: 'free',
            price: 0,
            billingCycle: 'monthly',
            aiFeatures: false,
        },
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null
    };

    const { subscriptionPlanId, stripeCustomerId, stripeSubscriptionId, status } = subscription;
    const isPremium = subscriptionPlanId.name === 'premium';
    const isUpgrading = checkoutMutation.isPending;
    const isCanceling = cancelMutation.isPending;

    const statusBadge = statusConfig[status] || statusConfig.active;

    const formatPrice = (price) => {
        if (price === 0) return 'Free';
        return `$${price.toFixed(2)}`;
    };

    const getBillingCycleLabel = (cycle) => {
        if (cycle === 'monthly') return 'per month';
        if (cycle === 'yearly') return 'per year';
        return 'per month';
    };

    // Handle upgrade
    const handleUpgrade = async () => {
        try {
            await checkoutMutation.mutateAsync();
        } catch (error) {
            // Handled by hook
        }
    };

    // Handle cancel
    const handleCancel = async () => {
        try {
            await cancelMutation.mutateAsync();
            setShowCancelDialog(false);
        } catch (error) {
            // Handled by hook
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage your subscription and billing information.
                    </p>
                </div>
                {/* ✅ Upgrade Button - Top Right (Free Plan Only) */}
                {!isPremium && (
                    <Button
                        className="w-full sm:w-auto"
                        onClick={handleUpgrade}
                        disabled={isUpgrading}
                    >
                        {isUpgrading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Crown className="mr-2 h-4 w-4" />
                                Upgrade to Premium
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Current Plan Card */}
            <Card className={cn(
                "bg-transparent", "border-0", "shadow-none!", "ring-0",
            )}>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {isPremium ? (
                                <Crown className="h-6 w-6 text-primary" />
                            ) : (
                                <Sparkles className="h-6 w-6 text-muted-foreground" />
                            )}
                            <div>
                                <CardTitle className="text-2xl font-bold capitalize">
                                    {subscriptionPlanId.name} Plan
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    {formatPrice(subscriptionPlanId.price)} {getBillingCycleLabel(subscriptionPlanId.billingCycle)}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Features List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Unlimited Products</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Unlimited Categories & Suppliers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Stock Management</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Invoices & Purchase Orders</span>
                        </div>
                        {subscriptionPlanId.aiFeatures ? (
                            <>
                                <div className="flex items-center gap-2 text-primary">
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">AI Forecasting</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary">
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">AI Anomaly Detection</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary">
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">AI Insights</span>
                                </div>
                                <div className="flex items-center gap-2 text-primary">
                                    <CheckCircle className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">AI Reorder Suggestions</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">AI Forecasting</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">AI Anomaly Detection</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">AI Insights</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">AI Reorder Suggestions</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Premium Plan - Cancel Button */}
                    {isPremium && (
                        <div className="pt-4 border-t">
                            <Button
                                variant="destructive"
                                className="w-full sm:w-auto"
                                onClick={() => setShowCancelDialog(true)}
                                disabled={isCanceling}
                            >
                                {isCanceling ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Canceling...
                                    </>
                                ) : (
                                    'Cancel Subscription'
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Your subscription will remain active until the end of the current billing period.
                            </p>
                        </div>
                    )}

                    {/* Free Plan - Upgrade Info */}
                    {!isPremium && (
                        <div className="pt-4 border-t">
                            <div className="bg-primary/5 border border-primary/20 p-4">
                                <div className="flex items-start gap-3">
                                    <Crown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Upgrade to Premium</p>
                                        <p className="text-sm text-muted-foreground">
                                            Get access to AI features, priority support, and more.
                                            <span className="block text-xs mt-1">
                                                Only ${subscriptionPlanId.price === 0 ? '29.99' : subscriptionPlanId.price}/month
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className={cn(
                "bg-transparent", "border-0", "shadow-none!", "ring-0",
            )}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Billing Reference</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        For support and troubleshooting purposes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stripeCustomerId || stripeSubscriptionId ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Customer ID:</span>
                                <code className="text-xs font-mono bg-muted px-2 py-0.5 ">
                                    {stripeCustomerId}
                                </code>
                            </div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Subscription ID:</span>
                                <code className="text-xs font-mono bg-muted px-2 py-0.5 ">
                                    {stripeSubscriptionId}
                                </code>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">Not connected to Stripe</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel your Premium subscription?
                            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 ">
                                <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Your subscription will remain active</p>
                                        <p className="text-xs text-muted-foreground">
                                            You will continue to have access to all Premium features until the end of the current billing period.
                                            After that, you will be downgraded to the Free plan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                This action cannot be undone.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Cancel Subscription
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BillingPage;