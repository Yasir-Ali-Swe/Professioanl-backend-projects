import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrganizationSubscriptionDetails, useUpdateOrganizationSubscription } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Building2,
    Mail,
    Phone,
    Crown,
    Sparkles,
    Calendar,
    CreditCard,
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertCircle,
    DollarSign,
    Clock,
    Info,
} from 'lucide-react';
import { toast } from 'sonner';

// Dummy Data - Matches API response structure
const dummySubscriptionDetail = {
    success: true,
    data: {
        organization: {
            _id: '6a4e74c142be225b0a2c00f7',
            name: 'Prime Stock',
            contactEmail: 'info@primestock.com',
            phone: '03301766870',
            status: 'active',
            logoUrl: null,
            invoiceSettings: {
                taxRate: 10,
                defaultDiscount: 5,
                invoicePrefix: 'INV',
                nextInvoiceNumber: 45,
            },
        },
        currentPlan: {
            _id: '6a4e74c142be225b0a2c00f9',
            name: 'premium',
            price: 29.99,
            billingCycle: 'monthly',
            aiFeatures: true,
            stripePriceId: 'price_xxxxx',
        },
        subscription: {
            subscriptionPlanId: {
                _id: '6a4e74c142be225b0a2c00f9',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
                stripePriceId: 'price_xxxxx',
            },
            stripeCustomerId: 'cus_xxxxx',
            stripeSubscriptionId: 'sub_xxxxx',
            status: 'active',
            currentPeriodEnd: '2026-08-14T10:00:00.000Z',
            createdAt: '2026-07-14T10:00:00.000Z',
            updatedAt: '2026-07-14T10:00:00.000Z',
        },
        availablePlans: [
            {
                _id: '6a4e74c142be225b0a2c00fa',
                name: 'free',
                price: 0,
                billingCycle: 'monthly',
                aiFeatures: false,
            },
            {
                _id: '6a4e74c142be225b0a2c00f9',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
            },
        ],
    },
};

const SubscriptionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState('');

    const { data: response, isLoading, isError } = useOrganizationSubscriptionDetails(id);
    const updateSubscriptionMutation = useUpdateOrganizationSubscription();

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !response?.success) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load subscription details</p>
                <p className="text-xs text-muted-foreground">Please try again.</p>
            </div>
        );
    }

    const { organization, currentPlan, subscription, availablePlans } = response.data;
    const isUpdating = updateSubscriptionMutation.isPending;

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Calculate days remaining
    const getDaysRemaining = () => {
        if (!subscription.currentPeriodEnd) return null;
        const now = new Date();
        const end = new Date(subscription.currentPeriodEnd);
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const daysRemaining = getDaysRemaining();

    // Get status badge variant
    const getStatusBadge = (status) => {
        const variants = {
            active: 'default',
            suspended: 'destructive',
            trial: 'outline',
        };
        return variants[status] || 'secondary';
    };

    const getSubscriptionStatusBadge = (status) => {
        const variants = {
            active: 'default',
            past_due: 'destructive',
            canceled: 'secondary',
            incomplete: 'outline',
        };
        return variants[status] || 'secondary';
    };

    const getPlanBadge = (plan) => {
        return plan === 'premium' ? 'default' : 'secondary';
    };

    const capitalize = (value) => {
        if (!value) return 'Free';
        return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');
    };

    // Handle plan update
    const handleUpdatePlan = async () => {
        if (!selectedPlan) {
            toast.error('Please select a plan');
            return;
        }

        updateSubscriptionMutation.mutate({
            id,
            data: { subscriptionPlanId: selectedPlan }
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 mt-0.5"
                        onClick={() => navigate('/super-admin/subscriptions')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {organization.name}
                            </h1>
                            <Badge variant={getStatusBadge(organization.status)} className="text-[10px] sm:text-xs shrink-0">
                                {capitalize(organization.status)}
                            </Badge>
                            <Badge variant={getPlanBadge(currentPlan?.name)} className="text-[10px] sm:text-xs shrink-0">
                                {capitalize(currentPlan?.name)}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Subscription Details
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards Grid - 2 columns */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Organization Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Organization Information</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Basic details about the organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Name</p>
                                <p className="text-sm font-medium truncate sm:text-right">{organization.name}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="text-sm font-medium truncate sm:text-right">{organization.contactEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="text-sm font-medium truncate sm:text-right">{organization.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Current Plan Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Current Plan</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Organization's active subscription plan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Crown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Plan</p>
                                <Badge variant={getPlanBadge(currentPlan?.name)} className="text-[10px] sm:text-xs">
                                    {capitalize(currentPlan?.name)}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="text-sm font-medium">${currentPlan?.price || 0}/{currentPlan?.billingCycle || 'month'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Billing Cycle</p>
                                <p className="text-sm font-medium capitalize">{currentPlan?.billingCycle || 'Monthly'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5">
                            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">AI Features</p>
                                <Badge variant={currentPlan?.aiFeatures ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                    {currentPlan?.aiFeatures ? 'Included' : 'Not included'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Subscription Status</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Current subscription state and timeline</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Status</p>
                                <Badge variant={getSubscriptionStatusBadge(subscription.status)} className="text-[10px] sm:text-xs">
                                    {capitalize(subscription.status)}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Current Period End</p>
                                <p className="text-sm font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Days Remaining</p>
                                {daysRemaining !== null ? (
                                    <p className={`text-sm font-medium ${daysRemaining <= 7 ? 'text-destructive' : daysRemaining <= 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                                        {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                                    </p>
                                ) : (
                                    <p className="text-sm font-medium text-muted-foreground">—</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-3 py-2.5">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="text-sm font-medium">{formatDate(subscription.createdAt)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing Reference Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Billing Reference</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Stripe payment information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                        {subscription.stripeCustomerId || subscription.stripeSubscriptionId ? (
                            <>
                                <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                        <p className="text-xs text-muted-foreground">Stripe Customer ID</p>
                                        <p className="text-xs font-mono truncate sm:text-right">{subscription.stripeCustomerId}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 py-2.5">
                                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                        <p className="text-xs text-muted-foreground">Stripe Subscription ID</p>
                                        <p className="text-xs font-mono truncate sm:text-right">{subscription.stripeSubscriptionId}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 py-4 text-muted-foreground">
                                <Info className="h-4 w-4 shrink-0" />
                                <p className="text-sm">Not connected to Stripe (manually assigned plan)</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SubscriptionDetail;