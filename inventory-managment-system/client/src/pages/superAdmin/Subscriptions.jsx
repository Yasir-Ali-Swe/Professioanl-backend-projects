import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrganizationSubscriptions } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import {
    Building2,
    Users,
    Crown,
    Sparkles,
    Search,
    Filter,
    ChevronDown,
    Eye,
    CheckCircle,
    XCircle,
    AlertCircle,
    DollarSign,
    ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dummy Data - Matches API response structure
const dummySubscriptions = {
    success: true,
    data: [
        {
            organizationId: '6a4e74c142be225b0a2c00f7',
            organizationName: 'Prime Stock',
            contactEmail: 'info@primestock.com',
            phone: '03301766870',
            organizationStatus: 'active',
            logoUrl: null,
            planName: 'premium',
            subscriptionStatus: 'active',
            currentPeriodEnd: '2026-08-14T10:00:00.000Z',
            subscriptionPlanDetails: {
                _id: '6a4e74c142be225b0a2c00f9',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
            },
            createdAt: '2026-07-08T16:03:14.009Z',
        },
        {
            organizationId: '6a4e74c142be225b0a2c00f8',
            organizationName: 'TechCorp',
            contactEmail: 'info@techcorp.com',
            phone: '03301766871',
            organizationStatus: 'trial',
            logoUrl: null,
            planName: 'free',
            subscriptionStatus: 'inactive',
            currentPeriodEnd: null,
            subscriptionPlanDetails: null,
            createdAt: '2026-07-09T10:00:00.000Z',
        },
        {
            organizationId: '6a4e74c142be225b0a2c00f9',
            organizationName: 'Global Supply',
            contactEmail: 'info@globalsupply.com',
            phone: '03301766872',
            organizationStatus: 'suspended',
            logoUrl: 'https://res.cloudinary.com/...',
            planName: 'free',
            subscriptionStatus: 'canceled',
            currentPeriodEnd: '2026-07-01T10:00:00.000Z',
            subscriptionPlanDetails: {
                _id: '6a4e74c142be225b0a2c00fa',
                name: 'free',
                price: 0,
                billingCycle: 'monthly',
                aiFeatures: false,
            },
            createdAt: '2026-06-01T10:00:00.000Z',
        },
        {
            organizationId: '6a4e74c142be225b0a2c00fa',
            organizationName: 'Retail Hub',
            contactEmail: 'info@retailhub.com',
            phone: '03301766873',
            organizationStatus: 'active',
            logoUrl: null,
            planName: 'premium',
            subscriptionStatus: 'active',
            currentPeriodEnd: '2026-08-10T10:00:00.000Z',
            subscriptionPlanDetails: {
                _id: '6a4e74c142be225b0a2c00f9',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
            },
            createdAt: '2026-06-15T10:00:00.000Z',
        },
        {
            organizationId: '6a4e74c142be225b0a2c00fb',
            organizationName: 'Wholesale Direct',
            contactEmail: 'info@wholesaledirect.com',
            phone: '03301766874',
            organizationStatus: 'active',
            logoUrl: null,
            planName: 'premium',
            subscriptionStatus: 'past_due',
            currentPeriodEnd: '2026-07-01T10:00:00.000Z',
            subscriptionPlanDetails: {
                _id: '6a4e74c142be225b0a2c00f9',
                name: 'premium',
                price: 29.99,
                billingCycle: 'monthly',
                aiFeatures: true,
            },
            createdAt: '2026-05-01T10:00:00.000Z',
        },
    ],
    summary: {
        totalOrganizations: 15,
        freeCount: 12,
        premiumCount: 3,
        activeSubscriptions: 3,
        pastDueSubscriptions: 1,
        platformRevenue: 89.97,
    },
    total: 5,
    page: 1,
    limit: 10,
    totalPages: 1,
};

const Subscriptions = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Get current filter values from URL
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const plan = searchParams.get('plan') || 'all';

    const { data: response, isLoading, isError } = useOrganizationSubscriptions({
        page,
        limit,
        search,
        status,
        plan,
    });

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
                <p className="text-destructive font-medium">Failed to load subscriptions</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const subscriptions = response;

    const { summary, data, total, totalPages } = subscriptions;

    // Update URL params
    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== 'all' && value !== '') {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        if (key !== 'page') {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

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
            inactive: 'secondary',
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

    // Pagination helper
    const getPageNumbers = () => {
        const total = totalPages;
        const current = page;
        const pages = [];
        const maxVisible = 5;

        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (current > 3) {
                pages.push('ellipsis');
            }
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }
            if (current < total - 2) {
                pages.push('ellipsis');
            }
            if (!pages.includes(total)) {
                pages.push(total);
            }
        }
        return pages;
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Subscriptions</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage all organization subscriptions across the platform.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Organizations</CardTitle>
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{summary.totalOrganizations}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All organizations</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Free Plan</CardTitle>
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{summary.freeCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((summary.freeCount / summary.totalOrganizations) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Premium Plan</CardTitle>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{summary.premiumCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((summary.premiumCount / summary.totalOrganizations) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Platform Revenue</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${summary.platformRevenue.toFixed(2)}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-green-500 border-green-500/30">
                                {summary.activeSubscriptions} active
                            </Badge>
                            {summary.pastDueSubscriptions > 0 && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs text-destructive border-destructive/30">
                                    {summary.pastDueSubscriptions} past due
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by organization..."
                        value={search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                </div>

                {/* Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Status: {status === 'all' ? 'All' : capitalize(status)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('status', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'active')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-primary" />
                                Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'suspended')}>
                                <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                Suspended
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'trial')}>
                                <AlertCircle className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                Trial
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Plan Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                Plan: {plan === 'all' ? 'All' : capitalize(plan)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Plan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('plan', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('plan', 'free')}>
                                <Sparkles className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Free
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('plan', 'premium')}>
                                <Crown className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                Premium
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Filters */}
                {(search || status !== 'all' || plan !== 'all') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={() => {
                            const newParams = new URLSearchParams();
                            newParams.set('page', '1');
                            newParams.set('limit', '10');
                            setSearchParams(newParams);
                        }}
                    >
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-50">Organization</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="w-25">Org Status</TableHead>
                                <TableHead className="w-25">Plan</TableHead>
                                <TableHead className="hidden md:table-cell w-32.5">Subscription Status</TableHead>
                                <TableHead className="hidden lg:table-cell w-32.5">Period End</TableHead>
                                <TableHead className="text-right w-25">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        No subscriptions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.organizationId}>
                                        <TableCell className="font-medium">
                                            <Link
                                                to={`/super-admin/subscriptions/${item.organizationId}`}
                                                className="hover:text-primary transition-colors"
                                            >
                                                {item.organizationName}
                                            </Link>
                                            <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                                                {item.contactEmail}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                                            {item.contactEmail}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getStatusBadge(item.organizationStatus)}
                                                className="text-[10px] sm:text-xs"
                                            >
                                                {capitalize(item.organizationStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getPlanBadge(item.planName)}
                                                className="text-[10px] sm:text-xs"
                                            >
                                                {capitalize(item.planName)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge
                                                variant={getSubscriptionStatusBadge(item.subscriptionStatus)}
                                                className="text-[10px] sm:text-xs"
                                            >
                                                {capitalize(item.subscriptionStatus)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                                            {formatDate(item.currentPeriodEnd)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 sm:h-8 sm:w-8"
                                                asChild
                                            >
                                                <Link to={`/super-admin/subscriptions/${item.organizationId}`}>
                                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Footer: count + pagination */}
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, total)}</span>{' '}
                        of <span className="font-medium">{total}</span> results
                    </div>

                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page > 1) updateFilter('page', page - 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page <= 1 && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>

                            {getPageNumbers().map((p, index) => (
                                <PaginationItem key={index}>
                                    {p === 'ellipsis' ? (
                                        <PaginationEllipsis className="h-8 sm:h-9" />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={p === page}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                updateFilter('page', p);
                                            }}
                                            className="h-8 sm:h-9 min-w-8 sm:min-w-9 text-xs sm:text-sm"
                                        >
                                            {p}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page < totalPages) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= totalPages && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;