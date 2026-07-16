// pages/stock/StockOverview.jsx
import { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    ResponsiveContainer,
} from 'recharts';
import {
    Package,
    PackageOpen,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
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
    const [stats] = useState(dummyStats);

    const stockByCategoryConfig = {
        electronics: { label: 'Electronics', color: 'var(--chart-1)' },
        cables: { label: 'Cables', color: 'var(--chart-2)' },
        accessories: { label: 'Accessories', color: 'var(--chart-3)' },
        furniture: { label: 'Furniture', color: 'var(--chart-4)' },
        stationery: { label: 'Stationery', color: 'var(--chart-5)' },
    };

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
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{stats.lowStockItems}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Out of Stock</CardTitle>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{stats.outOfStockItems}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Completely out</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Movement Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock In (This Month)</p>
                        <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">{stats.stockMovement.stockIn}</p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock Out (This Month)</p>
                        <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{stats.stockMovement.stockOut}</p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Movements</p>
                        <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">{stats.stockMovement.thisMonth}</p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
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
                        <CardTitle className="text-sm sm:text-base">Stock Movement Trend</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Monthly stock in vs stock out</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-50 sm:h-62.5 lg:h-70 w-full">
                            <ChartContainer config={stockMovementConfig} className="h-full w-full">
                                <BarChart data={stats.monthlyTrend}>
                                    <XAxis dataKey="month" className="text-[10px] sm:text-xs" />
                                    <YAxis className="text-[10px] sm:text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="stockIn" fill="var(--color-stockIn)" radius={4} />
                                    <Bar dataKey="stockOut" fill="var(--color-stockOut)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Stock by Category</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Distribution across categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-50 sm:h-62.5 lg:h-70 w-full">
                            <ChartContainer config={stockByCategoryConfig} className="h-full w-full">
                                <PieChart>
                                    <Pie
                                        data={stats.stockByCategory}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={80}
                                        outerRadius={115}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {stats.stockByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>
                        </div>
                        <div className="flex justify-center gap-3 sm:gap-4 mt-1 flex-wrap">
                            {stats.stockByCategory.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                    <span className="text-[10px] sm:text-xs">{item.name}</span>
                                    <span className="text-[10px] sm:text-xs font-medium">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Stock Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Recent Stock Activity</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest stock movements</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 overflow-x-auto">
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
                                <tr className="border-b last:border-0">
                                    <td className="py-2 px-2 font-medium">Wireless Mouse</td>
                                    <td className="py-2 px-2">
                                        <Badge variant="default" className="text-[10px]">Stock In</Badge>
                                    </td>
                                    <td className="py-2 px-2">+20</td>
                                    <td className="py-2 px-2 text-muted-foreground">PO #PO-001</td>
                                    <td className="py-2 px-2">John Doe</td>
                                    <td className="py-2 px-2 text-muted-foreground">2024-07-14</td>
                                </tr>
                                <tr className="border-b last:border-0">
                                    <td className="py-2 px-2 font-medium">USB-C Charger</td>
                                    <td className="py-2 px-2">
                                        <Badge variant="destructive" className="text-[10px]">Stock Out</Badge>
                                    </td>
                                    <td className="py-2 px-2">-5</td>
                                    <td className="py-2 px-2 text-muted-foreground">Invoice #INV-001</td>
                                    <td className="py-2 px-2">Jane Smith</td>
                                    <td className="py-2 px-2 text-muted-foreground">2024-07-13</td>
                                </tr>
                                <tr className="border-b last:border-0">
                                    <td className="py-2 px-2 font-medium">Bluetooth Speaker</td>
                                    <td className="py-2 px-2">
                                        <Badge variant="default" className="text-[10px]">Stock In</Badge>
                                    </td>
                                    <td className="py-2 px-2">+50</td>
                                    <td className="py-2 px-2 text-muted-foreground">Initial stock</td>
                                    <td className="py-2 px-2">John Doe</td>
                                    <td className="py-2 px-2 text-muted-foreground">2024-07-12</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StockOverview;