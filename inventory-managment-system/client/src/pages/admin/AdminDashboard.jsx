// pages/dashboard/AdminDashboard.jsx
import { useState } from 'react';
import { useAdminDashboard } from '@/hooks/useDashboard';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    CartesianGrid,
    PieChart,
    Cell,
    Label,
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
    FileText,
    ShoppingCart,
    Calendar,
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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
            { id: 'INV-001', customer: 'TechCorp Inc.', total: 2500, createdBy: 'John Doe', date: '2024-01-15', items: 3, status: 'paid' },
            { id: 'INV-002', customer: 'GreenLeaf Solutions', total: 1800, createdBy: 'Jane Smith', date: '2024-01-14', items: 2, status: 'unpaid' },
            { id: 'INV-003', customer: 'BlueWave Media', total: 3200, createdBy: 'John Doe', date: '2024-01-13', items: 4, status: 'paid' },
            { id: 'INV-004', customer: 'CloudNine Systems', total: 4500, createdBy: 'Sarah Johnson', date: '2024-01-12', items: 5, status: 'paid' },
            { id: 'INV-005', customer: 'StarBridge Consulting', total: 2100, createdBy: 'Jane Smith', date: '2024-01-11', items: 2, status: 'unpaid' },
        ],
        purchaseOrders: [
            { id: 'PO-001', supplier: 'TechSupply Co.', totalCost: 5000, status: 'fulfilled', createdBy: 'John Doe', date: '2024-01-15', items: 3 },
            { id: 'PO-002', supplier: 'GreenGoods Ltd.', totalCost: 3200, status: 'pending', createdBy: 'Jane Smith', date: '2024-01-14', items: 2 },
            { id: 'PO-003', supplier: 'BlueWholesale Inc.', totalCost: 4500, status: 'fulfilled', createdBy: 'John Doe', date: '2024-01-13', items: 4 },
            { id: 'PO-004', supplier: 'CloudTech Supplies', totalCost: 2800, status: 'pending', createdBy: 'Sarah Johnson', date: '2024-01-12', items: 3 },
            { id: 'PO-005', supplier: 'StarLogistics Group', totalCost: 3900, status: 'fulfilled', createdBy: 'Jane Smith', date: '2024-01-11', items: 2 },
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
            paid: 'default',
            unpaid: 'destructive',
            void: 'secondary',
        };
        return variants[status] || 'secondary';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {invoice.invoiceNumber || invoice.id}
                        </DialogTitle>
                        <Badge variant={getStatusBadge(invoice.status)} className="text-[10px]">
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created by {invoice.createdBy?.name || invoice.createdBy} on {formatDate(invoice.createdAt || invoice.date)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Customer</p>
                            <p className="text-sm font-medium">{invoice.customerName || invoice.customer}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Items</p>
                            <p className="text-sm font-medium">{invoice.products?.length || invoice.items}</p>
                        </div>
                    </div>

                    {/* Invoice Items */}
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
                                    [...Array(invoice.items || 0)].map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                Product {index + 1}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">1</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right">
                                                ${((invoice.total || 0) / (invoice.items || 1)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${((invoice.total || 0) / (invoice.items || 1)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary */}
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

// Purchase Order Detail Dialog Component
const PurchaseOrderDetailDialog = ({ po, open, onOpenChange }) => {
    if (!po) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'outline',
            approved: 'default',
            rejected: 'destructive',
            fulfilled: 'secondary',
        };
        return variants[status] || 'secondary';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {po.poNumber || po.id}
                        </DialogTitle>
                        <Badge variant={getStatusBadge(po.status)} className="text-[10px]">
                            {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created by {po.createdBy?.name || po.createdBy} on {formatDate(po.createdAt || po.date)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Supplier Info */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="text-sm font-medium">{po.supplierId?.name || po.supplier}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Items</p>
                            <p className="text-sm font-medium">{po.items?.length || po.items}</p>
                        </div>
                    </div>

                    {/* PO Items */}
                    <div className="border rounded-xl overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-right">Unit Cost</TableHead>
                                    <TableHead className="py-1.5 px-2 text-xs text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {po.items?.map ? (
                                    po.items.map((item, index) => (
                                        <TableRow key={item._id || index}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                <div>{item.productId?.name || 'Deleted Product'}</div>
                                                <div className="text-[10px] text-muted-foreground">{item.productId?.sku || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">{item.quantity}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${(item.unitCost || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    [...Array(po.items || 0)].map((_, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                Product {index + 1}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-center">1</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right">
                                                ${((po.totalCost || 0) / (po.items || 1)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${((po.totalCost || 0) / (po.items || 1)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary */}
                    <div className="border-t pt-3">
                        <div className="flex justify-between text-base font-bold">
                            <span>Total Cost</span>
                            <span className="text-primary">${po.totalCost.toFixed(2)}</span>
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

const AdminDashboard = () => {
    const { data: response, isLoading, isError } = useAdminDashboard();
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedPO, setSelectedPO] = useState(null);
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [poDialogOpen, setPODialogOpen] = useState(false);

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
                <p className="text-destructive font-medium">Failed to load admin dashboard statistics</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const dashboard = response.data;

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

    const openInvoiceDetail = (invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceDialogOpen(true);
    };

    const openPODetail = (po) => {
        setSelectedPO(po);
        setPODialogOpen(true);
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
                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Gross Profit</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">
                        ${financial.grossProfit.toLocaleString()}
                    </p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Profit Margin</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">
                        {financial.profitMargin}%
                    </p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Net Profit</p>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-primary">
                        ${financial.netProfit.toLocaleString()}
                    </p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
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
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Total POs</p>
                                <p className="text-xl sm:text-2xl font-bold">{purchaseOrders.totalPOs}</p>
                            </div>
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="text-xl sm:text-2xl font-bold text-yellow-500">{purchaseOrders.pendingPOs}</p>
                            </div>
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Fulfilled</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-500">{purchaseOrders.fulfilledPOs}</p>
                            </div>
                            <div className="border p-3 text-center">
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
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Total Invoices</p>
                                <p className="text-xl sm:text-2xl font-bold">{invoices.total}</p>
                            </div>
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Paid</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-500">{invoices.paid}</p>
                            </div>
                            <div className="border p-3 text-center">
                                <p className="text-xs text-muted-foreground">Unpaid</p>
                                <p className="text-xl sm:text-2xl font-bold text-destructive">{invoices.unpaid}</p>
                            </div>
                            <div className="border p-3 text-center">
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
                        <CardTitle className="text-sm sm:text-base">
                            Revenue Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Monthly revenue
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-50 sm:h-62.5 lg:h-70 w-full">
                            <ChartContainer
                                config={revenueConfig}
                                className="h-full w-full"
                            >
                                <BarChart data={financial.monthlyTrend} margin={{
                                    top: 5,
                                    right: 0,
                                    left: -25,
                                    bottom: 0,
                                }}>
                                    {/* Horizontal grid lines only */}
                                    <CartesianGrid
                                        vertical={false}
                                    />

                                    {/* X Axis */}
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    {/* Y Axis */}
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
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
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Profit Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Revenue vs Cost vs Profit
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-50 sm:h-62.5 lg:h-70 w-full">
                            <ChartContainer
                                config={profitConfig}
                                className="h-full w-full"
                            >
                                <AreaChart data={financial.monthlyProfitTrend} margin={{
                                    top: 5,
                                    right: 0,
                                    left: -25,
                                    bottom: 0,
                                }}>
                                    {/* Horizontal grid lines only */}
                                    <CartesianGrid
                                        vertical={false}
                                        strokeDasharray="0"
                                    />

                                    {/* X Axis */}
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    {/* Y Axis */}
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
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
                        <CardTitle className="text-sm sm:text-base">
                            Financial Breakdown
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Where revenue goes
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56  w-full">
                            <ChartContainer
                                config={financialBreakdownConfig}
                                className="h-full w-full"
                            >
                                <PieChart>
                                    <Pie
                                        data={financialBreakdownData}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={2}
                                    >
                                        {financialBreakdownData.map((entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>

                            {/* Center Text */}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-sm sm:text-base font-semibold leading-none">
                                        Financial
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        Breakdown
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {financialBreakdownData.map((item, index) => (
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
                                        ${item.value.toLocaleString()}
                                    </span>
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
                        <div className="min-w-75">
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
                        <div className="min-w-87.5">
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
                                        <TableRow key={inv._id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{inv.invoiceNumber}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {inv.customerName}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                ${inv.total.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell text-muted-foreground">
                                                {new Date(inv.createdAt).toLocaleDateString()}
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

                {/* Recent Purchase Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Recent Purchase Orders</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Latest purchase order activity</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-87.5">
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
                                        <TableRow key={po._id}>
                                            <TableCell className="py-1.5 px-2 text-xs font-medium">{po.poNumber}</TableCell>
                                            <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                {po.supplierId?.name || 'N/A'}
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => openPODetail(po)}
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

            <PurchaseOrderDetailDialog
                po={selectedPO}
                open={poDialogOpen}
                onOpenChange={setPODialogOpen}
            />
        </div>
    );
};

export default AdminDashboard;