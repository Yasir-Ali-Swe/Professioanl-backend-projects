// pages/dashboard/AdminDashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
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
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Bar,
    BarChart,
    Area,
    AreaChart,
    XAxis,
    YAxis,
    Pie,
    PieChart,
    Cell,
} from 'recharts';
import {
    Package,
    PackageOpen,
    AlertTriangle,
    DollarSign,
    Tags,
    Truck,
    Users,
    TrendingUp,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// Dummy Data
const dummyDashboard = {
    inventory: {
        totalProducts: 250,
        activeProducts: 200,
        lowStockProducts: 12,
        totalInventoryValue: 350000,
        totalCategories: 20,
        totalSuppliers: 15,
    },
    team: {
        total: 23,
        managers: 3,
        staff: 20,
    },
    financial: {
        totalRevenue: 450000,
        grossProfit: 180000,
        profitMargin: 40.0,
        netProfit: 30000,
        netProfitMargin: 6.67,
        totalTax: 35000,
        totalDiscount: 25000,
        totalCost: 270000,
        monthlyTrend: [
            { month: 'Jan', revenue: 32000, invoiceCount: 45 },
            { month: 'Feb', revenue: 35000, invoiceCount: 48 },
            { month: 'Mar', revenue: 38000, invoiceCount: 52 },
            { month: 'Apr', revenue: 41000, invoiceCount: 55 },
            { month: 'May', revenue: 43000, invoiceCount: 58 },
            { month: 'Jun', revenue: 46000, invoiceCount: 62 },
        ],
        monthlyProfitTrend: [
            { month: 'Jan', revenue: 32000, cost: 18000, profit: 14000 },
            { month: 'Feb', revenue: 35000, cost: 19000, profit: 16000 },
            { month: 'Mar', revenue: 38000, cost: 21000, profit: 17000 },
            { month: 'Apr', revenue: 41000, cost: 22000, profit: 19000 },
            { month: 'May', revenue: 43000, cost: 24000, profit: 19000 },
            { month: 'Jun', revenue: 46000, cost: 25000, profit: 21000 },
        ],
        topProducts: [
            { name: 'Product A', sku: 'SKU-001', quantitySold: 150, revenue: 15000 },
            { name: 'Product B', sku: 'SKU-002', quantitySold: 120, revenue: 12000 },
            { name: 'Product C', sku: 'SKU-003', quantitySold: 100, revenue: 10000 },
            { name: 'Product D', sku: 'SKU-004', quantitySold: 80, revenue: 8000 },
            { name: 'Product E', sku: 'SKU-005', quantitySold: 60, revenue: 6000 },
        ],
    },
    purchaseOrders: {
        totalPOs: 120,
        pendingPOs: 8,
        fulfilledPOs: 92,
        completionRate: 76.67,
    },
    invoices: {
        total: 150,
        paid: 120,
        unpaid: 25,
        void: 5,
    },
    recentActivity: {
        invoices: [
            { id: 'INV-001', customer: 'TechCorp Inc.', total: 2500, createdBy: 'John Doe', date: '2024-01-15' },
            { id: 'INV-002', customer: 'GreenLeaf Solutions', total: 1800, createdBy: 'Jane Smith', date: '2024-01-14' },
            { id: 'INV-003', customer: 'BlueWave Media', total: 3200, createdBy: 'John Doe', date: '2024-01-13' },
            { id: 'INV-004', customer: 'CloudNine Systems', total: 4500, createdBy: 'Sarah Johnson', date: '2024-01-12' },
            { id: 'INV-005', customer: 'StarBridge Consulting', total: 2100, createdBy: 'Jane Smith', date: '2024-01-11' },
        ],
        purchaseOrders: [
            { id: 'PO-001', supplier: 'TechSupply Co.', totalCost: 5000, status: 'fulfilled', createdBy: 'John Doe', date: '2024-01-15' },
            { id: 'PO-002', supplier: 'GreenGoods Ltd.', totalCost: 3200, status: 'pending', createdBy: 'Jane Smith', date: '2024-01-14' },
            { id: 'PO-003', supplier: 'BlueWholesale Inc.', totalCost: 4500, status: 'fulfilled', createdBy: 'John Doe', date: '2024-01-13' },
            { id: 'PO-004', supplier: 'CloudTech Supplies', totalCost: 2800, status: 'pending', createdBy: 'Sarah Johnson', date: '2024-01-12' },
            { id: 'PO-005', supplier: 'StarLogistics Group', totalCost: 3900, status: 'fulfilled', createdBy: 'Jane Smith', date: '2024-01-11' },
        ],
    },
};

// Chart Configurations
const revenueConfig = {
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-1)',
    },
    invoiceCount: {
        label: 'Invoices',
        color: 'var(--chart-2)',
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
        color: 'var(--chart-2)',
    },
};

// const financialBreakdownConfig = {
//     tax: {
//         label: "Tax",
//         color: "var(--chart-2)", // Cyan
//     },
//     discount: {
//         label: "Discount",
//         color: "var(--chart-5)", // Dark green
//     },
//     netProfit: {
//         label: "Net Profit",
//         color: "var(--chart-1)", // Bright green
//     },
//     cost: {
//         label: "Cost",
//         color: "var(--destructive)", // Red
//     },
// };
const financialBreakdownConfig = {
    tax: {
        label: 'Tax',
        color: 'var(--chart-2)',
    },
    discount: {
        label: 'Discount',
        color: 'var(--chart-5)',
    },
    netProfit: {
        label: 'Net Profit',
        color: 'var(--chart-1)',
    },
    cost: {
        label: 'Cost',
        color: 'var(--destructive)',
    },
};

const COLORS = ['var(--chart-1)', 'var(--destructive)', 'var(--chart-3)', 'var(--chart-4)'];

const AdminDashboard = () => {
    const [dashboard] = useState(dummyDashboard);

    const {
        inventory,
        team,
        financial,
        purchaseOrders,
        invoices,
        recentActivity,
    } = dashboard;

    // Financial breakdown data
    const financialBreakdownData = [
        { name: 'Tax', value: financial.totalTax },
        { name: 'Discount', value: financial.totalDiscount },
        { name: 'Net Profit', value: financial.netProfit },
        { name: 'Cost', value: financial.totalCost },
    ];

    // Get status badge
    const getStatusBadge = (status) => {
        const variants = {
            paid: 'default',
            unpaid: 'destructive',
            void: 'secondary',
            fulfilled: 'default',
            pending: 'outline',
        };
        return variants[status] || 'secondary';
    };

    const capitalize = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Overview of your organization's performance.
                    </p>
                </div>
            </div>

            {/* Stats Cards - Row 1 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{inventory.totalProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total products</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active Products</CardTitle>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{inventory.activeProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((inventory.activeProducts / inventory.totalProducts) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Products</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{inventory.lowStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Inventory Value</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${inventory.totalInventoryValue.toLocaleString()}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total inventory value</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - Row 2 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Categories</CardTitle>
                        <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-violet-500">{inventory.totalCategories}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total categories</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Suppliers</CardTitle>
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-amber-500">{inventory.totalSuppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total suppliers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Team Size</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{team.total}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {team.managers} managers, {team.staff} staff
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${financial.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Total revenue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Financial Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Gross Profit</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">
                        ${financial.grossProfit.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Profit Margin</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">
                        {financial.profitMargin}%
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Net Profit</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">
                        ${financial.netProfit.toLocaleString()}
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Net Profit Margin</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">
                        {financial.netProfitMargin}%
                    </p>
                </div>
            </div>

            {/* PO Status + Invoice Status Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Purchase Order Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Purchase Order Status</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Order fulfillment summary</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Total POs</p>
                                <p className="text-xl sm:text-2xl font-bold">{purchaseOrders.totalPOs}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="text-xl sm:text-2xl font-bold text-yellow-500">{purchaseOrders.pendingPOs}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Fulfilled</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-500">{purchaseOrders.fulfilledPOs}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Completion Rate</p>
                                <p className="text-xl sm:text-2xl font-bold text-primary">{purchaseOrders.completionRate}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Invoice Status</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Payment status summary</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Total Invoices</p>
                                <p className="text-xl sm:text-2xl font-bold">{invoices.total}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Paid</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-500">{invoices.paid}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Unpaid</p>
                                <p className="text-xl sm:text-2xl font-bold text-destructive">{invoices.unpaid}</p>
                            </div>
                            <div className="rounded-lg border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Void</p>
                                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">{invoices.void}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts - Revenue + Profit */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Revenue Trend</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Monthly revenue and invoice count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] sm:h-[250px] lg:h-[280px] w-full">
                            <ChartContainer config={revenueConfig} className="h-full w-full">
                                <BarChart data={financial.monthlyTrend}>
                                    <XAxis dataKey="month" className="text-[10px] sm:text-xs" />
                                    <YAxis className="text-[10px] sm:text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Profit Trend</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Revenue vs cost vs profit</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] sm:h-[250px] lg:h-[280px] w-full">
                            <ChartContainer config={profitConfig} className="h-full w-full">
                                <AreaChart data={financial.monthlyProfitTrend}>
                                    <XAxis dataKey="month" className="text-[10px] sm:text-xs" />
                                    <YAxis className="text-[10px] sm:text-xs" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        fill="var(--color-revenue)"
                                        fillOpacity={0.3}
                                        stroke="var(--color-revenue)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="cost"
                                        fill="var(--color-cost)"
                                        fillOpacity={0.3}
                                        stroke="var(--color-cost)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="profit"
                                        fill="var(--color-profit)"
                                        fillOpacity={0.3}
                                        stroke="var(--color-profit)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Breakdown + Top Products */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Financial Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Financial Breakdown</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Where revenue goes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] sm:h-[250px] w-full">
                            <ChartContainer config={financialBreakdownConfig} className="h-full w-full">
                                <PieChart>
                                    <Pie
                                        data={financialBreakdownData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {financialBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>
                        </div>
                        <div className="flex justify-center gap-3 sm:gap-4 mt-1 flex-wrap">
                            {financialBreakdownData.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                    <span className="text-[10px] sm:text-xs">{item.name}</span>
                                    <span className="text-[10px] sm:text-xs font-medium">${item.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Top Products</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Best selling products by revenue</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-[300px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {financial.topProducts.map((product, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{product.name}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {product.sku}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">{product.quantitySold}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${product.revenue.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invoices + Recent Purchase Orders */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Invoices */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Recent Invoices</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Latest invoice activity</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-[350px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Invoice</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">Customer</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Total</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden md:table-cell">Date</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentActivity.invoices.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{inv.id}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {inv.customer}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${inv.total.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell text-muted-foreground">
                                                {inv.date}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                                    <Link to={`/admin/invoices/${inv.id}`}>
                                                        <Eye className="h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Purchase Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Recent Purchase Orders</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Latest purchase order activity</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-[350px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">PO #</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">Supplier</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Total</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden md:table-cell">Status</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentActivity.purchaseOrders.map((po) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{po.id}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {po.supplier}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${po.totalCost.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell">
                                                <Badge variant={getStatusBadge(po.status)} className="text-[10px]">
                                                    {capitalize(po.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                                    <Link to={`/admin/purchase-orders/${po.id}`}>
                                                        <Eye className="h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;