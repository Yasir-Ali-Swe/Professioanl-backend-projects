import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformAnalytics } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Bar,
    BarChart,
    Line,
    LineChart,
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Pie,
    PieChart,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    Building2,
    Users,
    Package,
    Crown,
    Sparkles,
    Calendar,
    TrendingUp,
    Activity,
    Tag,
    Truck,
    AlertCircle,
    CheckCircle,
    XCircle,
    User,
    UserPlus,
    Users as UsersIcon,
} from 'lucide-react';

// Dummy Data - Matches API response structure
const dummyAnalytics = {
    success: true,
    data: {
        totalOrganizations: 15,
        activeOrganizations: 12,
        suspendedOrganizations: 1,
        trialOrganizations: 2,
        totalProducts: 345,
        totalUsers: 47,
        userByRole: [
            { _id: 'admin', count: 15 },
            { _id: 'manager', count: 12 },
            { _id: 'staff', count: 18 },
            { _id: 'super_admin', count: 2 },
        ],
        newSignupsThisMonth: 3,
        organizationGrowthTrend: [
            { month: '2025-08', count: 2 },
            { month: '2025-09', count: 1 },
            { month: '2025-10', count: 3 },
            { month: '2025-11', count: 4 },
            { month: '2025-12', count: 2 },
            { month: '2026-01', count: 1 },
            { month: '2026-02', count: 2 },
            { month: '2026-03', count: 1 },
            { month: '2026-04', count: 6 },
            { month: '2026-05', count: 2 },
            { month: '2026-06', count: 1 },
            { month: '2026-07', count: 3 },
        ],
        subscriptionDistribution: {
            free: 12,
            premium: 3,
            premiumSwitchesThisMonth: 1,
        },
        revenueTrend: [
            { month: '2025-08', revenue: 0 },
            { month: '2025-09', revenue: 0 },
            { month: '2025-10', revenue: 29.99 },
            { month: '2025-11', revenue: 29.99 },
            { month: '2025-12', revenue: 59.98 },
            { month: '2026-01', revenue: 59.98 },
            { month: '2026-02', revenue: 89.97 },
            { month: '2026-03', revenue: 89.97 },
            { month: '2026-04', revenue: 89.97 },
            { month: '2026-05', revenue: 89.97 },
            { month: '2026-06', revenue: 89.97 },
            { month: '2026-07', revenue: 89.97 },
        ],
        churnData: {
            canceledThisMonth: 0,
            suspendedThisMonth: 1,
        },
        platformTotals: {
            totalCategories: 25,
            totalSuppliers: 18,
        },
        averageOrganizationSize: {
            avgProductsPerOrg: 23,
            avgUsersPerOrg: 3.13,
        },
        topOrganizations: [
            {
                organizationId: '6a4e74c142be225b0a2c00f7',
                organizationName: 'Prime Stock',
                productCount: 45,
            },
            {
                organizationId: '6a4e74c142be225b0a2c00f8',
                organizationName: 'TechCorp',
                productCount: 32,
            },
            {
                organizationId: '6a4e74c142be225b0a2c00f9',
                organizationName: 'Global Supply',
                productCount: 28,
            },
            {
                organizationId: '6a4e74c142be225b0a2c00fa',
                organizationName: 'Retail Hub',
                productCount: 21,
            },
            {
                organizationId: '6a4e74c142be225b0a2c00fb',
                organizationName: 'Wholesale Direct',
                productCount: 18,
            },
        ],
    },
};

// Chart Configurations
const growthConfig = {
    count: {
        label: 'New Organizations',
        color: 'var(--chart-1)',
    },
};

const revenueConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-2)',
    },
};

const COLORS = ['var(--chart-2)', 'var(--destructive)', 'var(--chart-3)'];
const ROLE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

const SuperAdminAnalytics = () => {
    const { data: response, isLoading, isError } = usePlatformAnalytics();

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
                <p className="text-destructive font-medium">Failed to load platform analytics</p>
                <p className="text-xs text-muted-foreground">Please check your network and try again.</p>
            </div>
        );
    }

    const analytics = response.data;

    const {
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        trialOrganizations,
        totalProducts,
        totalUsers,
        userByRole,
        newSignupsThisMonth,
        organizationGrowthTrend,
        subscriptionDistribution,
        revenueTrend,
        churnData,
        platformTotals,
        averageOrganizationSize,
        topOrganizations,
    } = analytics;

    // Format month labels
    const formatMonth = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Prepare data for charts
    const growthData = organizationGrowthTrend.map((item) => ({
        ...item,
        month: formatMonth(item.month),
    }));

    const revenueData = revenueTrend.map((item) => ({
        ...item,
        month: formatMonth(item.month),
        revenue: Math.round(item.revenue * 100) / 100,
    }));

    // Organization status data
    const statusData = [
        { name: 'Active', value: activeOrganizations },
        { name: 'Suspended', value: suspendedOrganizations },
        { name: 'Trial', value: trialOrganizations },
    ];

    // Subscription distribution data
    const subscriptionData = [
        { name: 'Free', value: subscriptionDistribution.free },
        { name: 'Premium', value: subscriptionDistribution.premium },
    ];

    // User role data
    const roleData = userByRole.map((item) => ({
        name: item._id === 'super_admin' ? 'Super Admin' : item._id.charAt(0).toUpperCase() + item._id.slice(1),
        count: item.count,
    }));

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Platform-wide analytics and trends.
                    </p>
                </div>
            </div>

            {/* Stats Cards - Row 1 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Total Organizations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Organizations</CardTitle>
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalOrganizations}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All organizations</p>
                    </CardContent>
                </Card>

                {/* Active Organizations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{activeOrganizations}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {suspendedOrganizations} suspended, {trialOrganizations} trial
                        </p>
                    </CardContent>
                </Card>

                {/* New Signups */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">New Signups</CardTitle>
                        <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{newSignupsThisMonth}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>

                {/* Total Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalUsers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Across all orgs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - Row 2 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Total Products */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Across all orgs</p>
                    </CardContent>
                </Card>

                {/* Total Categories */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Categories</CardTitle>
                        <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-violet-500">{platformTotals.totalCategories}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total categories</p>
                    </CardContent>
                </Card>

                {/* Total Suppliers */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Suppliers</CardTitle>
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-amber-500">{platformTotals.totalSuppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total suppliers</p>
                    </CardContent>
                </Card>

                {/* Premium Organizations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Premium</CardTitle>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{subscriptionDistribution.premium}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            +{subscriptionDistribution.premiumSwitchesThisMonth} switched this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Avg Products/Org</p>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold">{averageOrganizationSize.avgProductsPerOrg}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Avg Users/Org</p>
                        <UsersIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold">{averageOrganizationSize.avgUsersPerOrg}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Canceled This Month</p>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold">{churnData.canceledThisMonth}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Suspended This Month</p>
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{churnData.suspendedThisMonth}</p>
                </div>
            </div>

            {/* Charts - Row 1: Growth + Revenue */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Organization Growth Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Organization Growth
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            New organizations over time
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer config={growthConfig} className="h-full w-full">
                                <BarChart
                                    data={growthData}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 10,
                                        bottom: 0,
                                    }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="0"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={28}
                                    />

                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />

                                    <Bar
                                        dataKey="count"
                                        fill="var(--color-count)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Revenue Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Monthly subscription revenue
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer config={revenueConfig} className="h-full w-full">
                                <AreaChart
                                    data={revenueData}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 15,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="0"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={30}
                                        tickFormatter={(v) => `${v / 1000}k`}
                                    />

                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        fill="var(--color-revenue)"
                                        fillOpacity={0.3}
                                        stroke="var(--color-revenue)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts - Row 2: 3 Small Charts */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Subscription Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Subscriptions
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Free vs Premium
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer config={revenueConfig} className="h-full w-full">
                                <PieChart>
                                    <Pie
                                        data={subscriptionData}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={2}
                                    >
                                        {subscriptionData.map((entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>

                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-sm font-semibold">Subscriptions</p>
                                    <p className="text-xs text-muted-foreground">
                                        Distribution
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {subscriptionData.map((item, index) => (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="h-3 w-3"
                                        style={{ backgroundColor: COLORS[index] }}
                                    />

                                    <span className="text-xs text-muted-foreground">
                                        {item.name}
                                    </span>

                                    <span className="text-xs font-semibold">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            +{subscriptionDistribution.premiumSwitchesThisMonth} organizations upgraded this month
                        </p>
                    </CardContent>
                </Card>

                {/* Organization Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Organization Status
                        </CardTitle>

                        <CardDescription className="text-xs sm:text-sm">
                            Distribution by status
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer config={revenueConfig} className="h-full w-full">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={2}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>

                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-sm font-semibold">Organization</p>
                                    <p className="text-xs text-muted-foreground">
                                        Status
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {statusData.map((item, index) => (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="h-3 w-3"
                                        style={{ backgroundColor: COLORS[index] }}
                                    />

                                    <span className="text-xs text-muted-foreground">
                                        {item.name}
                                    </span>

                                    <span className="text-xs font-semibold">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            User Roles
                        </CardTitle>

                        <CardDescription className="text-xs sm:text-sm">
                            Distribution by role
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer config={revenueConfig} className="h-full w-full">
                                <BarChart
                                    data={roleData}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 10,
                                        bottom: 0,
                                    }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="0"
                                    />

                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        width={28}
                                    />

                                    <ChartTooltip
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />

                                    <Bar
                                        dataKey="count"
                                        fill="var(--chart-1)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Organizations Table */}
            <Card className={cn("bg-transparent", "ring-0")}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Top Organizations by Products</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Organizations with the most products
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">#</TableHead>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Organization</TableHead>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-right">Products</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topOrganizations.map((org, index) => (
                                <TableRow key={org.organizationId}>
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3">
                                        <Link
                                            to={`/super-admin/organizations/${org.organizationId}`}
                                            className="text-xs sm:text-sm font-medium hover:text-primary transition-colors"
                                        >
                                            {org.organizationName}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm text-right font-medium">
                                        {org.productCount}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
};

export default SuperAdminAnalytics;