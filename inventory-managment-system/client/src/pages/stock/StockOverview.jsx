// pages/stock/StockOverview.jsx
import { useState } from 'react';
import { useStockSummary } from '@/hooks/useStock';
import { Loader2 } from 'lucide-react';
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
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
// import {
//     Bar,
//     BarChart,
//     XAxis,
//     YAxis,
//     Pie,
//     PieChart,
//     Cell,
// } from 'recharts';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import {
    Package,
    PackageOpen,
    AlertTriangle,
    TrendingUp,
    ArrowDown,
    ArrowUp,
    Activity,
    Clock,
} from 'lucide-react';

// Dummy Data
const dummyStats = {
    totalProducts: 250,
    totalStockValue: 350000,
    lowStockItems: 12,
    outOfStockItems: 5,
    stockMovement: {
        stockIn: 45,
        stockOut: 32,
        thisMonth: 77,
    },
    stockByCategory: [
        { name: 'Electronics', value: 120 },
        { name: 'Cables', value: 45 },
        { name: 'Accessories', value: 30 },
        { name: 'Furniture', value: 25 },
        { name: 'Stationery', value: 30 },
    ],
    monthlyTrend: [
        { month: 'Jan', stockIn: 40, stockOut: 25 },
        { month: 'Feb', stockIn: 35, stockOut: 30 },
        { month: 'Mar', stockIn: 50, stockOut: 28 },
        { month: 'Apr', stockIn: 42, stockOut: 35 },
        { month: 'May', stockIn: 38, stockOut: 32 },
        { month: 'Jun', stockIn: 45, stockOut: 32 },
    ],
};

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const StockOverview = () => {
    const { data: response, isLoading, isError } = useStockSummary();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

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
                <p className="text-destructive font-medium">Failed to load stock overview</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const stats = response.data || {};
    const recentLogs = stats.recentActivity || [];
    const totalItems = recentLogs.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentActivity = recentLogs.slice(startIndex, startIndex + itemsPerPage);

    const stockByCategoryConfig = {};
    (stats.stockByCategory || []).forEach((item, index) => {
        stockByCategoryConfig[item.name.toLowerCase()] = {
            label: item.name,
            color: COLORS[index % COLORS.length]
        };
    });

    const stockMovementConfig = {
        stockIn: { label: 'Stock In', color: 'var(--chart-2)' },
        stockOut: { label: 'Stock Out', color: 'var(--destructive)' },
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stock Overview</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Real-time inventory insights and analytics.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{stats.totalProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All products</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Stock Value</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${stats.totalStockValue.toLocaleString()}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Inventory value</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{stats.lowStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Out of Stock</CardTitle>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{stats.outOfStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Completely out</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Movement Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock In (This Month)</p>
                        <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">{stats.stockMovement?.stockIn || 0}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock Out (This Month)</p>
                        <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{stats.stockMovement?.stockOut || 0}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Movements</p>
                        <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">{stats.stockMovement?.thisMonth || 0}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Turnover Rate</p>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold">4.2x</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Stock Movement Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Stock Movement Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Monthly stock in vs stock out
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={stockMovementConfig}
                                className="h-full w-full"
                            >
                                <BarChart data={stats.monthlyTrend} margin={{
                                    top: 5,
                                    right: 0,
                                    left: -25,
                                    bottom: 0,
                                }}>
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
                                    />

                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />

                                    <Bar
                                        dataKey="stockIn"
                                        fill="var(--color-stockIn)"
                                        radius={[4, 4, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="stockOut"
                                        fill="var(--color-stockOut)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Stock by Category
                        </CardTitle>

                        <CardDescription className="text-xs sm:text-sm">
                            Distribution across categories
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56  w-full">
                            <ChartContainer
                                config={stockByCategoryConfig}
                                className="h-full w-full"
                            >
                                <PieChart>
                                    <Pie
                                        data={stats.stockByCategory}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={2}
                                    >
                                        {stats.stockByCategory.map((entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill={COLORS[index % COLORS.length]}
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
                                        Stock
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        by Category
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {stats.stockByCategory.map((item, index) => (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="h-3 w-3"
                                        style={{
                                            backgroundColor: COLORS[index % COLORS.length],
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
            </div>

            {/* Recent Activity Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Recent Stock Activity</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest stock adjustments logs</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-4">
                    <div className="min-w-125">
                        <table className="w-full text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2 font-medium">Product</th>
                                    <th className="text-left py-2 px-2 font-medium">Type</th>
                                    <th className="text-left py-2 px-2 font-medium">Quantity</th>
                                    <th className="text-left py-2 px-2 font-medium">Reason</th>
                                    <th className="text-left py-2 px-2 font-medium">Performed By</th>
                                    <th className="text-left py-2 px-2 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!stats.recentActivity || stats.recentActivity.length === 0) ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                            No recent stock activity logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    currentActivity.map((log) => {
                                        const date = new Date(log.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        });
                                        return (
                                            <tr key={log._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="py-2 px-2 font-medium">
                                                    {log.productId?.name || 'Deleted Product'}
                                                </td>
                                                <td className="py-2 px-2">
                                                    <Badge variant={log.type === 'in' ? 'default' : 'destructive'} className="text-[10px]">
                                                        {log.type === 'in' ? 'Stock In' : 'Stock Out'}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-2">
                                                    {log.type === 'in' ? '+' : '-'}{log.quantity}
                                                </td>
                                                <td className="py-2 px-2 text-muted-foreground">{log.reason}</td>
                                                <td className="py-2 px-2">{log.performedBy?.name || 'System'}</td>
                                                <td className="py-2 px-2 text-muted-foreground">{date}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4 mt-4">
                            <div className="whitespace-nowrap text-xs text-muted-foreground">
                                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span>{' '}
                                of <span className="font-medium">{totalItems}</span> logs
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 text-xs"
                                >
                                    Previous
                                </Button>
                                <span className="text-xs text-muted-foreground px-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
};

export default StockOverview;