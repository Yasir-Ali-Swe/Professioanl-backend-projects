// pages/staff/StaffDashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStaffDashboard } from '@/hooks/useDashboard';
import { Loader2 } from 'lucide-react';
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
    XAxis,
    YAxis,
    Pie,
    PieChart,
    Cell,
    CartesianGrid,
} from 'recharts';
import {
    Receipt,
    DollarSign,
    Activity,
    AlertTriangle,
    Package,
    PackageOpen,
    TrendingUp,
    Calendar,
    Clock,
    Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';

// Dummy Data - Matches Staff Dashboard API response
const dummyStaffDashboard = {
    success: true,
    data: {
        myActivity: {
            invoices: {
                today: 3,
                thisWeek: 12,
                thisMonth: 45,
                total: 89,
                totalRevenue: 42350,
            },
            stockActions: {
                today: 5,
                thisWeek: 28,
                thisMonth: 95,
                total: 187,
                breakdown: [
                    { type: 'in', count: 112, totalQuantity: 345 },
                    { type: 'out', count: 75, totalQuantity: 256 },
                ],
            },
            invoiceStatuses: [
                { status: 'paid', count: 45, totalValue: 25200 },
                { status: 'unpaid', count: 38, totalValue: 15800 },
                { status: 'void', count: 6, totalValue: 1350 },
            ],
            recentInvoices: [
                {
                    _id: 'inv_1',
                    invoiceNumber: 'INV-001',
                    customerName: 'TechCorp Inc.',
                    total: 2500,
                    status: 'paid',
                    createdAt: '2024-07-15T10:30:00Z',
                },
                {
                    _id: 'inv_2',
                    invoiceNumber: 'INV-002',
                    customerName: 'GreenLeaf Solutions',
                    total: 1800,
                    status: 'unpaid',
                    createdAt: '2024-07-14T14:20:00Z',
                },
                {
                    _id: 'inv_3',
                    invoiceNumber: 'INV-003',
                    customerName: 'BlueWave Media',
                    total: 3200,
                    status: 'paid',
                    createdAt: '2024-07-13T09:15:00Z',
                },
                {
                    _id: 'inv_4',
                    invoiceNumber: 'INV-004',
                    customerName: 'CloudNine Systems',
                    total: 4500,
                    status: 'paid',
                    createdAt: '2024-07-12T16:45:00Z',
                },
                {
                    _id: 'inv_5',
                    invoiceNumber: 'INV-005',
                    customerName: 'StarBridge Consulting',
                    total: 2100,
                    status: 'unpaid',
                    createdAt: '2024-07-11T11:00:00Z',
                },
            ],
            recentStockActions: [
                {
                    _id: 'sa_1',
                    productId: { _id: 'p1', name: 'Wireless Mouse', sku: 'SKU-001' },
                    type: 'in',
                    quantity: 20,
                    reason: 'Purchase order fulfilled',
                    createdAt: '2024-07-15T10:30:00Z',
                },
                {
                    _id: 'sa_2',
                    productId: { _id: 'p2', name: 'USB-C Charger', sku: 'SKU-002' },
                    type: 'out',
                    quantity: 5,
                    reason: 'Invoice #INV-001',
                    createdAt: '2024-07-14T14:20:00Z',
                },
                {
                    _id: 'sa_3',
                    productId: { _id: 'p3', name: 'Bluetooth Speaker', sku: 'SKU-003' },
                    type: 'in',
                    quantity: 30,
                    reason: 'Initial stock',
                    createdAt: '2024-07-13T09:15:00Z',
                },
                {
                    _id: 'sa_4',
                    productId: { _id: 'p4', name: 'HDMI Cable', sku: 'SKU-004' },
                    type: 'out',
                    quantity: 10,
                    reason: 'Invoice #INV-002',
                    createdAt: '2024-07-12T16:45:00Z',
                },
                {
                    _id: 'sa_5',
                    productId: { _id: 'p5', name: 'Wireless Keyboard', sku: 'SKU-005' },
                    type: 'in',
                    quantity: 15,
                    reason: 'Purchase order fulfilled',
                    createdAt: '2024-07-11T11:00:00Z',
                },
            ],
        },
        alerts: {
            lowStockProducts: 12,
            outOfStockProducts: 5,
        },
        performance: {
            monthlyTrend: [
                { month: 'Feb 2026', invoices: 8, revenue: 4200, stockActions: 18 },
                { month: 'Mar 2026', invoices: 12, revenue: 5800, stockActions: 22 },
                { month: 'Apr 2026', invoices: 10, revenue: 5100, stockActions: 20 },
                { month: 'May 2026', invoices: 15, revenue: 7200, stockActions: 25 },
                { month: 'Jun 2026', invoices: 18, revenue: 8500, stockActions: 30 },
                { month: 'Jul 2026', invoices: 20, revenue: 9800, stockActions: 35 },
            ],
        },
    },
};

// Chart Configurations
const monthlyConfig = {
    invoices: {
        label: 'Invoices',
        color: 'var(--chart-1)',
    },
    revenue: {
        label: 'Revenue',
        color: 'var(--chart-2)',
    },
    stockActions: {
        label: 'Stock Actions',
        color: 'var(--chart-3)',
    },
};

const invoiceStatusConfig = {
    paid: {
        label: 'Paid',
        color: 'var(--chart-2)',
    },
    unpaid: {
        label: 'Unpaid',
        color: 'var(--chart-3)',
    },
    void: {
        label: 'Void',
        color: 'var(--destructive)',
    },
};

const COLORS = ['var(--chart-2)', 'var(--chart-3)', 'var(--destructive)'];

// Invoice Detail Dialog Component
const InvoiceDetailDialog = ({ invoice, open, onOpenChange }) => {
    if (!invoice) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            paid: 'bg-green-500/10 text-green-500 border-green-500/20',
            unpaid: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            void: 'bg-red-500/10 text-destructive border-red-500/20',
        };
        return variants[status] || variants.unpaid;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {invoice.invoiceNumber}
                        </DialogTitle>
                        <Badge className={getStatusBadge(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created on {formatDate(invoice.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Customer</p>
                            <p className="text-sm font-medium">{invoice.customerName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-sm font-medium text-primary">${invoice.total.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-right">Price</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.products?.map ? (
                                    invoice.products.map((item, index) => (
                                        <TableRow key={item._id || index}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                <div>{item.productId?.name || 'Deleted Product'}</div>
                                                <div className="text-[10px] text-muted-foreground">{item.productId?.sku || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">{item.quantity}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${(item.sellingPrice || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${(item.subtotal || 0).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No product details available</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="border-t pt-3">
                        <div className="flex justify-between text-base font-bold">
                            <span>Total</span>
                            <span className="text-primary">${invoice.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Stock Action Detail Dialog Component
const StockActionDetailDialog = ({ action, open, onOpenChange }) => {
    if (!action) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            Stock Action
                        </DialogTitle>
                        <Badge variant={action.type === 'in' ? 'default' : 'destructive'}>
                            {action.type === 'in' ? 'Stock In' : 'Stock Out'}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Performed on {formatDate(action.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Product</p>
                            <p className="text-sm font-medium">{action.productId.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">SKU</p>
                            <p className="text-sm font-medium">{action.productId.sku}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Quantity</p>
                            <p className={`text-sm font-medium ${action.type === 'in' ? 'text-green-500' : 'text-destructive'}`}>
                                {action.type === 'in' ? '+' : '-'}{action.quantity}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm font-medium">{action.reason || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const StaffDashboard = () => {
    const { data: response, isLoading, isError } = useStaffDashboard();
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedStockAction, setSelectedStockAction] = useState(null);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [stockActionDialogOpen, setStockActionDialogOpen] = useState(false);

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
                <p className="text-destructive font-medium">Failed to load staff dashboard statistics</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const { myActivity, alerts, performance } = response.data;

    // Invoice status data for chart
    const statusData = myActivity.invoiceStatuses.map((item) => ({
        name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
        value: item.count,
    }));

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const variants = {
            paid: 'default',
            unpaid: 'outline',
            void: 'destructive',
        };
        return variants[status] || 'secondary';
    };

    const capitalize = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const openInvoiceDetail = (invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceDialogOpen(true);
    };

    const openStockActionDetail = (action) => {
        setSelectedStockAction(action);
        setStockActionDialogOpen(true);
    };

    // Stock action breakdown
    const stockInCount = myActivity.stockActions.breakdown.find(b => b.type === 'in')?.count || 0;
    const stockOutCount = myActivity.stockActions.breakdown.find(b => b.type === 'out')?.count || 0;
    const stockInQty = myActivity.stockActions.breakdown.find(b => b.type === 'in')?.totalQuantity || 0;
    const stockOutQty = myActivity.stockActions.breakdown.find(b => b.type === 'out')?.totalQuantity || 0;

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Dashboard</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Overview of your daily activities and performance.
                    </p>
                </div>
            </div>

            {/* Stats Cards - Row 1 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Invoices</CardTitle>
                        <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{myActivity.invoices.total}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Created by you</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            ${myActivity.invoices.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">From paid invoices</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Stock Actions</CardTitle>
                        <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{myActivity.stockActions.total}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">In & Out</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{alerts.lowStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {alerts.outOfStockProducts} out of stock
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - Row 2 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Invoices (Today)</CardTitle>
                        <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{myActivity.invoices.today}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Created today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Invoices (This Week)</CardTitle>
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{myActivity.invoices.thisWeek}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Last 7 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Invoices (This Month)</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{myActivity.invoices.thisMonth}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Stock Actions (Today)</CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{myActivity.stockActions.today}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Performed today</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Actions Breakdown */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock In (Count)</p>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">{stockInCount}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock Out (Count)</p>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{stockOutCount}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock In (Qty)</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">{stockInQty}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock Out (Qty)</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{stockOutQty}</p>
                </div>
            </div>

            {/* Charts - Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Monthly Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Monthly Performance
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Your invoices, revenue & stock actions
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={monthlyConfig}
                                className="h-full w-full"
                            >
                                <BarChart
                                    data={performance.monthlyTrend}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 10,
                                        bottom: 0,
                                    }}
                                    barCategoryGap="15%"
                                >
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="0"
                                    />

                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        padding={{ left: 0, right: 0 }}
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
                                        dataKey="invoices"
                                        fill="var(--color-invoices)"
                                        radius={[4, 4, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="stockActions"
                                        fill="var(--color-stockActions)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Invoice Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Invoice Status Distribution
                        </CardTitle>

                        <CardDescription className="text-xs sm:text-sm">
                            Your invoices by status
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={invoiceStatusConfig}
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
                                        Invoice
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        Status
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {statusData.map((item, index) => (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="h-3 w-3"
                                        style={{
                                            backgroundColor: COLORS[index],
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
            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Invoices */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm sm:text-base">Recent Invoices</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Your latest invoices</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                <Link to="/staff/invoices">View All</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-87.5">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Invoice</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">Customer</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Total</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myActivity.recentInvoices.map((inv) => (
                                        <TableRow key={inv._id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{inv.invoiceNumber}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {inv.customerName}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${inv.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => openInvoiceDetail(inv)}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Stock Actions */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm sm:text-base">Recent Stock Actions</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Your latest stock activities</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                <Link to="/staff/stock/list">View All</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-87.5">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Type</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myActivity.recentStockActions.map((action) => (
                                        <TableRow key={action._id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                {action.productId?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {action.productId?.sku || 'N/A'}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">
                                                <Badge variant={action.type === 'in' ? 'default' : 'destructive'} className="text-[10px]">
                                                    {action.type === 'in' ? 'Stock In' : 'Stock Out'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`py-1.5 px-2 text-xs text-center font-medium ${action.type === 'in' ? 'text-green-500' : 'text-destructive'}`}>
                                                {action.type === 'in' ? '+' : '-'}{action.quantity}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => openStockActionDetail(action)}
                                                >
                                                    <Eye className="h-3 w-3" />
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

            {/* Dialogs */}
            <InvoiceDetailDialog
                invoice={selectedInvoice}
                open={invoiceDialogOpen}
                onOpenChange={setInvoiceDialogOpen}
            />

            <StockActionDetailDialog
                action={selectedStockAction}
                open={stockActionDialogOpen}
                onOpenChange={setStockActionDialogOpen}
            />
        </div>
    );
};

export default StaffDashboard;