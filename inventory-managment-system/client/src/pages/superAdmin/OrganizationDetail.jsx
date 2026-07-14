// pages/superAdmin/OrganizationDetail.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Building2,
    Users,
    Package,
    Truck,
    Tags,
    ArrowLeft,
    Ban,
    CheckCircle,
    Crown,
    Calendar,
    Mail,
    Phone,
    Sparkles,
    CalendarClock,
    User,
} from 'lucide-react';

// Dummy Data - Matches API response structure
const dummyOrganizationData = {
    success: true,
    data: {
        organizationData: {
            _id: '1',
            name: 'TechCorp Inc.',
            contactEmail: 'admin@techcorp.com',
            phone: '+1 234 567 8900',
            status: 'active',
            subscriptionPlan: {
                _id: 'plan_123',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
                stripePriceId: 'price_abc',
            },
            createdAt: '2024-01-15T10:30:00Z',
        },
        adminUser: {
            _id: 'u1',
            name: 'John Smith',
            email: 'john@techcorp.com',
            role: 'admin',
            isActive: true,
            imageUrl: '',
        },
        allUsers: [
            { _id: 'u1', name: 'John Smith', email: 'john@techcorp.com', role: 'admin', isActive: true, imageUrl: '' },
            { _id: 'u2', name: 'Jane Doe', email: 'jane@techcorp.com', role: 'manager', isActive: true, imageUrl: '' },
            { _id: 'u3', name: 'Bob Wilson', email: 'bob@techcorp.com', role: 'staff', isActive: true, imageUrl: '' },
            { _id: 'u4', name: 'Alice Brown', email: 'alice@techcorp.com', role: 'staff', isActive: false, imageUrl: '' },
            { _id: 'u5', name: 'Charlie Davis', email: 'charlie@techcorp.com', role: 'manager', isActive: true, imageUrl: '' },
        ],
        organizationUsersCount: 5,
        organizationProductsCount: 10,
        organizationSuppliersCount: 3,
        organizationCategoriesCount: 8,
        subscription: {
            subscriptionRecord: {
                id: 'sub_123',
                stripeCustomerId: 'cus_abc',
                stripeSubscriptionId: 'sub_xyz',
                status: 'active',
                currentPeriodEnd: '2026-08-14T00:00:00.000Z',
                createdAt: '2024-01-15T10:30:00Z',
                updatedAt: '2026-07-14T10:30:00Z',
            },
            subscriptionPlan: {
                id: 'plan_123',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
                stripePriceId: 'price_abc',
            },
            subscriptionDetails: {
                isActive: true,
                isPastDue: false,
                isCanceled: false,
                isIncomplete: false,
                daysUntilExpiry: 30,
                isExpiringSoon: false,
            },
        },
    },
};

const OrganizationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [orgData] = useState(dummyOrganizationData.data);

    const { organizationData, adminUser, allUsers, organizationUsersCount, organizationProductsCount, organizationSuppliersCount, organizationCategoriesCount, subscription } = orgData;

    const org = organizationData;

    // Format date
    const formatDateFull = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        return status === 'active' ? 'default' : 'destructive';
    };

    // Get subscription status badge
    const getSubscriptionStatusBadge = (status) => {
        const variants = {
            active: 'default',
            past_due: 'destructive',
            canceled: 'secondary',
            incomplete: 'outline',
        };
        return variants[status] || 'secondary';
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
                        onClick={() => navigate('/super-admin/organizations')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {org.name}
                            </h1>
                            <Badge variant={getStatusBadge(org.status)} className="gap-1 text-[10px] sm:text-xs shrink-0">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${org.status === 'active' ? 'bg-emerald-300' : 'bg-current'
                                        }`}
                                />
                                {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {org.status === 'active' ? (
                        <Button variant="destructive" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Suspend
                        </Button>
                    ) : (
                        <Button variant="default" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Activate
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards - 6 Cards in 3 Columns */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                {/* Users Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Users</p>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold">{organizationUsersCount}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total users</p>
                    </div>
                </div>

                {/* Products Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Products</p>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold">{organizationProductsCount}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total products</p>
                    </div>
                </div>

                {/* Suppliers Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Suppliers</p>
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold">{organizationSuppliersCount}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total suppliers</p>
                    </div>
                </div>

                {/* Categories Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Categories</p>
                        <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold">{organizationCategoriesCount}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total categories</p>
                    </div>
                </div>

                {/* Subscription Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Subscription</p>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold capitalize">
                            {subscription.subscriptionPlan?.name || 'Free'}
                        </p>
                        <Badge
                            variant={subscription.subscriptionRecord ? getSubscriptionStatusBadge(subscription.subscriptionRecord.status) : 'secondary'}
                            className="text-[10px] sm:text-xs mt-1"
                        >
                            {subscription.subscriptionRecord ? subscription.subscriptionRecord.status : 'Inactive'}
                        </Badge>
                    </div>
                </div>

                {/* Admin Card */}
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Admin</p>
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-xl font-bold truncate">{adminUser?.name || 'No Admin'}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{adminUser?.email || ''}</p>
                    </div>
                </div>
            </div>

            {/* Organization Info & Subscription Details - Side by Side */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Organization Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Organization Information</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Basic details about the organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                        {[
                            { icon: Building2, label: 'Name', value: org.name },
                            { icon: User, label: 'Org Admin', value: adminUser?.name || 'N/A' },
                            { icon: Mail, label: 'Admin Email', value: adminUser?.email || 'N/A' },
                            { icon: Phone, label: 'Phone', value: org.phone || 'Not provided' },
                            { icon: Calendar, label: 'Created', value: formatDateFull(org.createdAt) },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="text-sm font-medium truncate sm:text-right">{value}</p>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-start gap-3 py-2.5">
                            <Crown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">Plan</p>
                                <Badge variant={org.subscriptionPlan?.name === 'premium' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                    {org.subscriptionPlan?.name?.charAt(0).toUpperCase() + org.subscriptionPlan?.name?.slice(1) || 'Free'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Subscription Details</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Organization subscription and billing information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {subscription.subscriptionRecord ? (
                            <div className="space-y-0.5">
                                {[
                                    { icon: Crown, label: 'Plan', value: subscription.subscriptionPlan?.name?.charAt(0).toUpperCase() + subscription.subscriptionPlan?.name?.slice(1) || 'Free' },
                                    { icon: Sparkles, label: 'Price', value: `$${subscription.subscriptionPlan?.price || 0}/${subscription.subscriptionPlan?.billingCycle || 'month'}` },
                                    { icon: CalendarClock, label: 'Billing Cycle', value: subscription.subscriptionPlan?.billingCycle?.charAt(0).toUpperCase() + subscription.subscriptionPlan?.billingCycle?.slice(1) || 'Monthly' },
                                    { icon: Calendar, label: 'Current Period End', value: formatDateFull(subscription.subscriptionRecord.currentPeriodEnd) },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
                                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className="text-sm font-medium truncate sm:text-right">{value}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-start gap-3 py-2.5">
                                    <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="min-w-0 flex-1 flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">Status</p>
                                        <Badge variant={getSubscriptionStatusBadge(subscription.subscriptionRecord.status)} className="text-[10px] sm:text-xs">
                                            {subscription.subscriptionRecord.status?.charAt(0).toUpperCase() + subscription.subscriptionRecord.status?.slice(1) || 'Unknown'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No active subscription</p>
                                <p className="text-xs text-muted-foreground">This organization is on the free plan</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* All Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">All Users</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {organizationUsersCount} users in this organization
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 overflow-x-auto">
                    <div className="min-w-120 sm:min-w-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">User</TableHead>
                                    <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Email</TableHead>
                                    <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Role</TableHead>
                                    <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allUsers.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell className="py-2 sm:py-3 px-2 sm:px-3">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                                                    <AvatarFallback className="text-[10px] sm:text-xs bg-muted">
                                                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs sm:text-sm font-medium truncate">{user.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground truncate">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="py-2 sm:py-3 px-2 sm:px-3">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2 sm:py-3 px-2 sm:px-3">
                                            <Badge variant={user.isActive ? 'default' : 'secondary'} className="gap-1 text-[10px] sm:text-xs">
                                                <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-300' : 'bg-current'}`} />
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default OrganizationDetail;