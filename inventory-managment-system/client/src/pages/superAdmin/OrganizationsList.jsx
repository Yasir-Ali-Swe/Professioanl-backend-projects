import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrganizations, useUpdateOrganizationStatus } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';
import {
    Badge,
} from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    MoreVertical,
    CheckCircle,
    XCircle,
    Ban,
    ArrowUpDown,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const dummyOrganizations = {
    data: [
        {
            organizationData: {
                _id: '1',
                name: 'TechCorp Inc.',
                contactEmail: 'admin@techcorp.com',
                phone: '+1 234 567 8900',
                status: 'active',
                subscriptionPlan: { name: 'premium' },
                createdAt: '2024-01-15T10:30:00Z',
            },
            organizationUsersData: [
                { _id: 'u1', name: 'John Smith', email: 'john@techcorp.com', role: 'admin' },
                { _id: 'u2', name: 'Jane Doe', email: 'jane@techcorp.com', role: 'manager' },
                { _id: 'u3', name: 'Bob Wilson', email: 'bob@techcorp.com', role: 'staff' },
            ],
        },
        {
            organizationData: {
                _id: '2',
                name: 'GreenLeaf Solutions',
                contactEmail: 'admin@greenleaf.com',
                phone: '+1 234 567 8901',
                status: 'active',
                subscriptionPlan: { name: 'free' },
                createdAt: '2024-01-14T14:20:00Z',
            },
            organizationUsersData: [
                { _id: 'u4', name: 'Sarah Johnson', email: 'sarah@greenleaf.com', role: 'admin' },
                { _id: 'u5', name: 'Mike Davis', email: 'mike@greenleaf.com', role: 'manager' },
            ],
        },
        {
            organizationData: {
                _id: '3',
                name: 'BlueWave Media',
                contactEmail: 'admin@bluewave.com',
                phone: '+1 234 567 8902',
                status: 'active',
                subscriptionPlan: { name: 'free' },
                createdAt: '2024-01-13T09:15:00Z',
            },
            organizationUsersData: [
                { _id: 'u6', name: 'Emily Brown', email: 'emily@bluewave.com', role: 'admin' },
            ],
        },
        {
            organizationData: {
                _id: '4',
                name: 'CloudNine Systems',
                contactEmail: 'admin@cloudnine.com',
                phone: '+1 234 567 8903',
                status: 'suspended',
                subscriptionPlan: { name: 'premium' },
                createdAt: '2024-01-12T16:45:00Z',
            },
            organizationUsersData: [
                { _id: 'u7', name: 'David Miller', email: 'david@cloudnine.com', role: 'admin' },
                { _id: 'u8', name: 'Lisa Taylor', email: 'lisa@cloudnine.com', role: 'manager' },
                { _id: 'u9', name: 'Tom Harris', email: 'tom@cloudnine.com', role: 'staff' },
                { _id: 'u10', name: 'Anna White', email: 'anna@cloudnine.com', role: 'staff' },
            ],
        },
        {
            organizationData: {
                _id: '5',
                name: 'StarBridge Consulting',
                contactEmail: 'admin@starbridge.com',
                phone: '+1 234 567 8904',
                status: 'suspended',
                subscriptionPlan: { name: 'premium' },
                createdAt: '2024-01-11T11:00:00Z',
            },
            organizationUsersData: [
                { _id: 'u11', name: 'Robert Clark', email: 'robert@starbridge.com', role: 'admin' },
                { _id: 'u12', name: 'Maria Garcia', email: 'maria@starbridge.com', role: 'staff' },
            ],
        },
    ],
    // Platform-wide totals (would come from the backend's aggregate/summary endpoint)
    aggregateStats: {
        totalOrganizations: 247,
        activeOrganizations: 198,
        suspendedOrganizations: 32,
        premiumOrganizations: 89,
        freeOrganizations: 158,
        totalUsers: 3452,
        // Growth metrics
        totalGrowth: 12.5,
        activeGrowth: 8.3,
        premiumGrowth: 15.7,
        freeGrowth: 4.2,
        activeThisMonth: 18,
        activePercentage: 80,
    },
    totalNumberOfOrganizations: 247,
    page: 1,
    limit: 10,
    totalPages: 25,
};

const OrganizationsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Get current filter values from URL
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const subscriptionPlan = searchParams.get('subscriptionPlan') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const { data: response, isLoading, isError } = useOrganizations({
        page,
        limit,
        search,
        status,
        subscriptionPlan,
        sortBy,
        order,
    });

    const updateStatusMutation = useUpdateOrganizationStatus();

    const handleUpdateStatus = (id, newStatus) => {
        updateStatusMutation.mutate({ id, data: { status: newStatus } });
    };

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
                <p className="text-destructive font-medium">Failed to load organizations</p>
                <p className="text-xs text-muted-foreground">Please check your network and try again.</p>
            </div>
        );
    }

    const organizations = response;

    const {
        totalOrganizations,
        activeOrganizations,
        premiumOrganizations,
        freeOrganizations,
        totalUsers,
        totalGrowth,
        activeGrowth,
        premiumGrowth,
        freeGrowth,
        activeThisMonth,
        activePercentage,
    } = organizations.aggregateStats;

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
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        return status === 'active' ? 'default' : 'destructive';
    };

    const getPlanBadge = (plan) => {
        return plan === 'premium' ? 'default' : 'secondary';
    };
    const capitalize = (value) => {
        if (!value) return 'Free';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    // Pagination helper
    const getPageNumbers = () => {
        const total = organizations.totalPages;
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
        <div className="space-y-4 sm:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Organizations</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage all organizations across the platform.
                    </p>
                </div>
            </div>

            {/* Stats Cards - Row 1 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Total Organizations Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Organizations</CardTitle>
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalOrganizations}</div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-green-500 border-green-500/30">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                +{totalGrowth}% growth
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                                +{activeThisMonth} this month
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Organizations Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{activeOrganizations}</div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-primary border-primary/30">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                +{activeGrowth}% growth
                            </Badge>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {activePercentage}% of total
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Premium Organizations Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Premium</CardTitle>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{premiumOrganizations}</div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-yellow-500 border-yellow-500/30">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                +{premiumGrowth}% growth
                            </Badge>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {Math.round((premiumOrganizations / totalOrganizations) * 100)}% of total
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Free Organizations Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Free</CardTitle>
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{freeOrganizations}</div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-blue-500 border-blue-500/30">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                +{freeGrowth}% growth
                            </Badge>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {Math.round((freeOrganizations / totalOrganizations) * 100)}% of total
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations..."
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
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Plan Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                    Plan: {subscriptionPlan === 'all' ? 'All' : capitalize(subscriptionPlan)}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Plan</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateFilter('subscriptionPlan', 'all')}>
                                    All
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('subscriptionPlan', 'free')}>
                                    <Sparkles className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                    Free
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('subscriptionPlan', 'premium')}>
                                    <Crown className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                    Premium
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort By */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    Sort: {sortBy === 'createdAt' ? 'Date' : capitalize(sortBy)}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateFilter('sortBy', 'name')}>
                                    Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('sortBy', 'createdAt')}>
                                    Created Date
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('sortBy', 'status')}>
                                    Status
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Order */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                    Order: {order === 'asc' ? 'Ascending' : 'Descending'}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel>Order</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateFilter('order', 'asc')}>
                                    Ascending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('order', 'desc')}>
                                    Descending
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Clear Filters */}
                    {(search || status !== 'all' || subscriptionPlan !== 'all' || sortBy !== 'createdAt' || order !== 'desc') && (
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
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-45 sm:w-50">Organization</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="w-25">Status</TableHead>
                                <TableHead className="hidden md:table-cell w-25">Plan</TableHead>
                                <TableHead className="hidden lg:table-cell w-20 text-center">Users</TableHead>
                                <TableHead className="hidden lg:table-cell">Created</TableHead>
                                <TableHead className="text-right w-15">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        No organizations found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                organizations.data.map((item) => {
                                    const org = item.organizationData;
                                    const users = item.organizationUsersData;
                                    return (
                                        <TableRow key={org._id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to={`/super-admin/organizations/${org._id}`}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {org.name}
                                                </Link>
                                                <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                                                    {org.contactEmail}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                                                {org.contactEmail}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getStatusBadge(org.status)}
                                                    className="text-[10px] sm:text-xs"
                                                >
                                                    {capitalize(org.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge
                                                    variant={getPlanBadge(org.subscriptionPlan?.name)}
                                                    className="text-[10px] sm:text-xs"
                                                >
                                                    {capitalize(org.subscriptionPlan?.name)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Users className="h-3 w-3 text-muted-foreground" />
                                                    <span>{users.length}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-muted-foreground text-xs sm:text-sm">
                                                {formatDate(org.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                                                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuItem
                                                                render={
                                                                    <Link to={`/super-admin/organizations/${org._id}`} className="cursor-pointer">
                                                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                                                        View Details
                                                                    </Link>
                                                                }
                                                            />
                                                            <DropdownMenuSeparator />
                                                            {org.status === 'active' ? (
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(org._id, 'suspended')} className="cursor-pointer text-destructive focus:text-destructive">
                                                                    <Ban className="mr-2 h-3.5 w-3.5" />
                                                                    Suspend
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onClick={() => handleUpdateStatus(org._id, 'active')} className="cursor-pointer text-primary focus:text-primary">
                                                                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                                                    Activate
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Footer: count + pagination */}
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, totalOrganizations)}</span>{' '}
                        of <span className="font-medium">{totalOrganizations}</span> results
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
                                        if (page < organizations.totalPages) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= organizations.totalPages && 'pointer-events-none opacity-50'
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

export default OrganizationsList;