// pages/superAdmin/SuperAdminDashboard.jsx
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    Building2,
    Users,
    Package,
    Crown,
    Sparkles,
    DollarSign,
    TrendingUp,
    CheckCircle,
} from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Pie,
    PieChart,
    Cell,
} from 'recharts';

// Dummy Data
const dummyStats = {
    organizations: {
        total: 247,
        active: 198,
        suspended: 32,
        createdThisMonth: 18,
        growthPercentage: 12.5,
        byStatus: {
            active: 198,
            suspended: 32,
        },
    },
    platformTotals: {
        totalProducts: 12450,
        totalCategories: 890,
        totalSuppliers: 456,
        totalUsers: 3452,
    },
    subscriptions: {
        freeCount: 158,
        premiumCount: 89,
        switchedToPremiumThisMonth: 12,
        monthlySubscriptionRevenue: 42980,
        monthlyRevenueTrend: [
            { month: 'Jan', revenue: 32000, premiumCount: 72 },
            { month: 'Feb', revenue: 34500, premiumCount: 75 },
            { month: 'Mar', revenue: 36800, premiumCount: 78 },
            { month: 'Apr', revenue: 39200, premiumCount: 82 },
            { month: 'May', revenue: 41200, premiumCount: 85 },
            { month: 'Jun', revenue: 42980, premiumCount: 89 },
        ],
    },
    platformProfit: {
        revenue: 42980,
        cost: 12890,
        profit: 30090,
        profitMargin: 70.0,
        invoiceRevenue: 85600,
        invoiceCost: 48900,
        invoiceProfit: 36700,
        invoiceProfitMargin: 42.87,
    },
    recentOrganizations: [
        { _id: '1', name: 'TechCorp Inc.', status: 'active', createdAt: '2024-01-15' },
        { _id: '2', name: 'GreenLeaf Solutions', status: 'active', createdAt: '2024-01-14' },
        { _id: '3', name: 'BlueWave Media', status: 'active', createdAt: '2024-01-13' },
        { _id: '4', name: 'CloudNine Systems', status: 'active', createdAt: '2024-01-12' },
        { _id: '5', name: 'StarBridge Consulting', status: 'suspended', createdAt: '2024-01-11' },
    ],
};

const revenueConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-1)',
    },
};

const profitConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-1)',
    },
    cost: {
        label: 'Cost',
        color: 'var(--destructive)',
    },
    profit: {
        label: 'Profit',
        color: 'var(--chart-3)',
    },
};

const statusConfig = {
    active: {
        label: 'Active',
        color: 'var(--chart-1)',
    },
    suspended: {
        label: 'Suspended',
        color: 'var(--destructive)',
    },
};

import { usePlatformDashboardStats } from '@/hooks/useSuperAdmin';
import { Loader2 } from 'lucide-react';

const STATUS_COLORS = ['var(--chart-1)', 'var(--destructive)'];

const SuperAdminDashboard = () => {
    const { data: response, isLoading, isError } = usePlatformDashboardStats();

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
                <p className="text-destructive font-medium">Failed to load platform stats</p>
                <p className="text-xs text-muted-foreground">Please verify your session and try again.</p>
            </div>
        );
    }

    const { organizations, platformTotals, subscriptions, platformProfit, recentOrganizations } = response.data;

    // Organization status data for pie chart
    const statusData = [
        { name: 'Active', value: organizations.byStatus?.active || 0 },
        { name: 'Suspended', value: organizations.byStatus?.suspended || 0 },
    ];

    // Profit data for bar chart
    const profitData = [
        {
            name: 'Platform',
            revenue: platformProfit.revenue || 0,
            cost: platformProfit.cost || 0,
            profit: platformProfit.profit || 0
        },
        {
            name: 'Invoices',
            revenue: platformProfit.invoiceRevenue || 0,
            cost: platformProfit.invoiceCost || 0,
            profit: platformProfit.invoiceProfit || 0
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Platform Overview</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Monitor all organizations and platform activity across the system.
                    </p>
                </div>
            </div>

            {/* Stats Grid - Row 1 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Total Organizations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Organizations</CardTitle>
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{organizations.total}</div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                                +{organizations.createdThisMonth} this month
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs text-green-500 border-green-500/30">
                                +{organizations.growthPercentage}%
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Organizations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{organizations.active}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((organizations.active / organizations.total) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                {/* Total Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{platformTotals.totalUsers.toLocaleString()}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Across all orgs</p>
                    </CardContent>
                </Card>

                {/* Total Products */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{platformTotals.totalProducts.toLocaleString()}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Across all orgs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Grid - Row 2 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Premium Subscriptions */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Premium</CardTitle>
                        <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{subscriptions.premiumCount}</div>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                            +{subscriptions.switchedToPremiumThisMonth} upgraded
                        </Badge>
                    </CardContent>
                </Card>

                {/* Free Subscriptions */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Free</CardTitle>
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{subscriptions.freeCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((subscriptions.freeCount / (subscriptions.freeCount + subscriptions.premiumCount)) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                {/* Platform Revenue */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${platformProfit.revenue.toLocaleString()}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">From subscriptions</p>
                    </CardContent>
                </Card>

                {/* Platform Profit */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Platform Profit</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${platformProfit.profit.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-[10px] sm:text-xs text-green-500 border-green-500/30">
                            Margin: {platformProfit.profitMargin}%
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">
                            Revenue Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Monthly subscription revenue (last 6 months)
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={revenueConfig}
                                className="h-full w-full"
                            >
                                <AreaChart
                                    data={subscriptions.monthlyRevenueTrend}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 5,
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
                                        tickFormatter={(value) => `${value / 1000}k`}
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

                {/* Organization Status */}
                <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">
                            Organization Status
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Distribution of organizations by status
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={statusConfig}
                                className="h-full w-full"
                            >
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
                                                fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />
                                </PieChart>
                            </ChartContainer>

                            {/* Center Text */}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-sm sm:text-base font-semibold leading-none">
                                        Organization
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
                                        style={{
                                            backgroundColor: STATUS_COLORS[index],
                                        }}
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

                {/* Profit Breakdown */}
                <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">
                            Profit Breakdown
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Platform revenue vs cost vs profit
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={profitConfig}
                                className="h-full w-full"
                            >
                                <BarChart
                                    data={profitData}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 5,
                                        bottom: 0,
                                    }}
                                    barCategoryGap="15%"
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
                                        width={30}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />

                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />

                                    <Bar
                                        dataKey="revenue"
                                        fill="var(--color-revenue)"
                                        radius={[4, 4, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="cost"
                                        fill="var(--color-cost)"
                                        radius={[4, 4, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="profit"
                                        fill="var(--color-profit)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Platform Totals */}
                <Card>
                    <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">Platform Totals</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Overview of platform resources</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Total Organizations</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold">{organizations.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                                    <span className="text-xs sm:text-sm">Active Organizations</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold text-green-500">{organizations.active.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Monthly Profit</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold text-green-500">${platformProfit.profit.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Products</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold">{platformTotals.totalProducts.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Categories</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold">{platformTotals.totalCategories.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Suppliers</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold">{platformTotals.totalSuppliers.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="text-xs sm:text-sm">Users</span>
                                </div>
                                <span className="text-sm sm:text-base font-bold">{platformTotals.totalUsers.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Organizations Table - Using shadcn Table components */}
            <Card className={cn("bg-transparent", "ring-0")}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Recent Organizations</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest organizations registered on the platform</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Organization Name</TableHead>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Status</TableHead>
                                <TableHead className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm">Created Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrganizations.map((org) => (
                                <TableRow key={org._id} className="border-b last:border-0">
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium">
                                        {org.name}
                                    </TableCell>
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3">
                                        <Badge
                                            variant={org.status === 'active' ? 'default' : 'destructive'}
                                            className="text-[10px] sm:text-xs"
                                        >
                                            {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 sm:py-3 px-2 sm:px-3 text-muted-foreground text-[10px] sm:text-xs">
                                        {new Date(org.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SuperAdminDashboard;