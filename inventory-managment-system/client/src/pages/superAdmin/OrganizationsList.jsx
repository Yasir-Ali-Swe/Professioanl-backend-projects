// pages/superAdmin/OrganizationsList.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    Badge,
} from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
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
    Edit,
    Ban,
    ArrowUpDown,
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
        activeOrganizations: 231,
        premiumOrganizations: 98,
        freeOrganizations: 149,
        totalUsers: 1042,
    },
    totalNumberOfOrganizations: 247,
    page: 1,
    limit: 10,
    totalPages: 25,
};

const OrganizationsList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [organizations] = useState(dummyOrganizations);

    // Get current filter values from URL
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const subscriptionPlan = searchParams.get('subscriptionPlan') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const { totalOrganizations, activeOrganizations, premiumOrganizations, freeOrganizations, totalUsers } =
        organizations.aggregateStats;

    const activePercentage = totalOrganizations > 0
        ? Math.round((activeOrganizations / totalOrganizations) * 100)
        : 0;

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

            {/* Stats Cards - No Card wrapper, just divs */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Organizations</p>
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold">{totalOrganizations}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All organizations</p>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active</p>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold text-primary">{activeOrganizations}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {activePercentage}% of total
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Premium</p>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold text-primary">{premiumOrganizations}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Paid subscriptions</p>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Free</p>
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1.5 sm:mt-2">
                        <p className="text-lg sm:text-2xl font-bold text-muted-foreground">{freeOrganizations}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Free plan users</p>
                    </div>
                </div>
            </div>

            {/* Filters - No Card wrapper */}
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
                                    <Sparkles className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Free
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateFilter('subscriptionPlan', 'premium')}>
                                    <Crown className="mr-2 h-3.5 w-3.5 text-primary" />
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
            <div className="rounded-md border overflow-hidden">
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
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <Edit className="mr-2 h-3.5 w-3.5" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            {org.status === 'active' ? (
                                                                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                                                                    <Ban className="mr-2 h-3.5 w-3.5" />
                                                                    Suspend
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem className="cursor-pointer text-primary focus:text-primary">
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
                {/* Footer: count + pagination, outside the table itself */}
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