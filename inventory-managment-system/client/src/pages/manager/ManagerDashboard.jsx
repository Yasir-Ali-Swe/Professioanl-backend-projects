// pages/dashboard/ManagerDashboard.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useManagerDashboard } from '@/hooks/useDashboard';
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Area,
    AreaChart,
    XAxis,
    YAxis,
    Pie,
    PieChart,
    Cell,
    CartesianGrid,
} from 'recharts';
import {
    Package,
    PackageOpen,
    AlertTriangle,
    ShoppingCart,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Receipt,
    Tags,
    Truck,
    Eye,
    Calendar,
    User,
    Building2,
    DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dummy Data - Matches Manager Dashboard API response
const dummyManagerDashboard = {
    success: true,
    data: {
        inventory: {
            totalProducts: 250,
            lowStockProducts: 12,
            outOfStockProducts: 5,
            totalCategories: 20,
            totalSuppliers: 15,
            lowStockAlert: [
                { _id: '1', name: 'USB-C Charger', sku: 'SKU-002', quantity: 8, reorderThreshold: 15, unit: 'pcs' },
                { _id: '2', name: 'Bluetooth Speaker', sku: 'SKU-003', quantity: 2, reorderThreshold: 5, unit: 'pcs' },
                { _id: '3', name: 'HDMI Cable', sku: 'SKU-004', quantity: 3, reorderThreshold: 10, unit: 'pcs' },
                { _id: '4', name: 'USB-C Cable', sku: 'SKU-006', quantity: 4, reorderThreshold: 8, unit: 'pcs' },
            ],
            categoryDistribution: [
                { category: 'Electronics', count: 120 },
                { category: 'Cables', count: 45 },
                { category: 'Accessories', count: 30 },
                { category: 'Furniture', count: 25 },
                { category: 'Stationery', count: 30 },
            ],
        },
        purchaseOrders: {
            totalPOs: 120,
            pendingPOs: 8,
            approvedPOs: 10,
            rejectedPOs: 2,
            fulfilledPOs: 92,
            completionRate: 76.67,
            poValueTrend: [
                { month: 'Jan 2026', totalValue: 32000, count: 18 },
                { month: 'Feb 2026', totalValue: 35000, count: 20 },
                { month: 'Mar 2026', totalValue: 38000, count: 22 },
                { month: 'Apr 2026', totalValue: 41000, count: 25 },
                { month: 'May 2026', totalValue: 43000, count: 28 },
                { month: 'Jun 2026', totalValue: 46000, count: 30 },
            ],
            topSuppliers: [
                { id: 's1', name: 'TechSupply Co.', poCount: 45, totalCost: 125000 },
                { id: 's2', name: 'PowerTech Ltd.', poCount: 32, totalCost: 85000 },
                { id: 's3', name: 'CableMasters Inc.', poCount: 28, totalCost: 72000 },
                { id: 's4', name: 'Global Logistics', poCount: 15, totalCost: 45000 },
            ],
            recentPOs: [
                {
                    _id: 'po_1',
                    poNumber: 'PO-001',
                    supplierId: { _id: 's1', name: 'TechSupply Co.' },
                    totalCost: 5000,
                    status: 'fulfilled',
                    createdBy: { _id: 'u1', name: 'John Doe' },
                    createdAt: '2024-07-15T10:30:00Z'
                },
                {
                    _id: 'po_2',
                    poNumber: 'PO-002',
                    supplierId: { _id: 's2', name: 'PowerTech Ltd.' },
                    totalCost: 3200,
                    status: 'pending',
                    createdBy: { _id: 'u2', name: 'Jane Smith' },
                    createdAt: '2024-07-14T14:20:00Z'
                },
                {
                    _id: 'po_3',
                    poNumber: 'PO-003',
                    supplierId: { _id: 's3', name: 'CableMasters Inc.' },
                    totalCost: 4500,
                    status: 'approved',
                    createdBy: { _id: 'u1', name: 'John Doe' },
                    createdAt: '2024-07-13T09:15:00Z'
                },
                {
                    _id: 'po_4',
                    poNumber: 'PO-004',
                    supplierId: { _id: 's4', name: 'Global Logistics' },
                    totalCost: 2800,
                    status: 'pending',
                    createdBy: { _id: 'u3', name: 'Sarah Johnson' },
                    createdAt: '2024-07-12T16:45:00Z'
                },
                {
                    _id: 'po_5',
                    poNumber: 'PO-005',
                    supplierId: { _id: 's1', name: 'TechSupply Co.' },
                    totalCost: 3900,
                    status: 'fulfilled',
                    createdBy: { _id: 'u2', name: 'Jane Smith' },
                    createdAt: '2024-07-11T11:00:00Z'
                },
            ],
        },
        salesActivity: {
            totalInvoicesThisMonth: 45,
            totalInvoicesThisWeek: 12,
            recentInvoices: [
                { _id: 'inv_1', invoiceNumber: 'INV-001', customerName: 'TechCorp Inc.', total: 2500, createdBy: { _id: 'u1', name: 'John Doe' }, createdAt: '2024-07-15T10:30:00Z' },
                { _id: 'inv_2', invoiceNumber: 'INV-002', customerName: 'GreenLeaf Solutions', total: 1800, createdBy: { _id: 'u2', name: 'Jane Smith' }, createdAt: '2024-07-14T14:20:00Z' },
                { _id: 'inv_3', invoiceNumber: 'INV-003', customerName: 'BlueWave Media', total: 3200, createdBy: { _id: 'u1', name: 'John Doe' }, createdAt: '2024-07-13T09:15:00Z' },
                { _id: 'inv_4', invoiceNumber: 'INV-004', customerName: 'CloudNine Systems', total: 4500, createdBy: { _id: 'u3', name: 'Sarah Johnson' }, createdAt: '2024-07-12T16:45:00Z' },
                { _id: 'inv_5', invoiceNumber: 'INV-005', customerName: 'StarBridge Consulting', total: 2100, createdBy: { _id: 'u2', name: 'Jane Smith' }, createdAt: '2024-07-11T11:00:00Z' },
            ],
        },
    },
};

// Chart Configurations
const poValueConfig = {
    totalValue: {
        label: 'PO Value',
        color: 'var(--chart-1)',
    },
    count: {
        label: 'PO Count',
        color: 'var(--chart-2)',
    },
};

const categoryConfig = {
    electronics: { label: 'Electronics', color: 'var(--chart-1)' },
    cables: { label: 'Cables', color: 'var(--chart-2)' },
    accessories: { label: 'Accessories', color: 'var(--chart-3)' },
    furniture: { label: 'Furniture', color: 'var(--chart-4)' },
    stationery: { label: 'Stationery', color: 'var(--chart-5)' },
};

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Status Badge Configuration
const statusConfig = {
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    approved: { label: 'Approved', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    rejected: { label: 'Rejected', className: 'bg-red-500/10 text-destructive border-red-500/20' },
    fulfilled: { label: 'Fulfilled', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {invoice.invoiceNumber}
                        </DialogTitle>
                        <Badge variant="default" className="text-[10px]">
                            Invoice
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created by {invoice.createdBy.name} on {formatDate(invoice.createdAt)}
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

    const statusBadge = statusConfig[po.status] || statusConfig.pending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {po.poNumber}
                        </DialogTitle>
                        <Badge className={statusBadge.className}>
                            {statusBadge.label}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created by {po.createdBy.name} on {formatDate(po.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="text-sm font-medium">{po.supplierId.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="text-sm font-medium text-primary">${po.totalCost.toFixed(2)}</p>
                        </div>
                    </div>

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
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No item details available</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

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

const ManagerDashboard = () => {
    const { data: response, isLoading, isError } = useManagerDashboard();
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
                <p className="text-destructive font-medium">Failed to load manager dashboard statistics</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const { inventory, purchaseOrders, salesActivity } = response.data;

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
            fulfilled: 'default',
            pending: 'outline',
            approved: 'secondary',
            rejected: 'destructive',
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

    // Category distribution data for chart
    const categoryData = inventory.categoryDistribution.map((item) => ({
        name: item.category,
        value: item.count,
    }));

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manager Dashboard</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Overview of inventory, purchase orders, and sales.
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
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All products</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Low Stock</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{inventory.lowStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Out of Stock</CardTitle>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{inventory.outOfStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Completely out</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total POs</CardTitle>
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{purchaseOrders.totalPOs}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All purchase orders</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - Row 2 */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Pending POs</CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{purchaseOrders.pendingPOs}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Fulfilled POs</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{purchaseOrders.fulfilledPOs}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Completion Rate</CardTitle>
                        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{purchaseOrders.completionRate}%</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">POs completed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Invoices (Month)</CardTitle>
                        <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{salesActivity.totalInvoicesThisMonth}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {salesActivity.totalInvoicesThisWeek} this week
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards - Row 3 (Secondary Stats) */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Categories</p>
                        <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-violet-500">{inventory.totalCategories}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Suppliers</p>
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-amber-500">{inventory.totalSuppliers}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Approved POs</p>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">{purchaseOrders.approvedPOs}</p>
                </div>

                <div className="border bg-card p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Rejected POs</p>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </div>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">{purchaseOrders.rejectedPOs}</p>
                </div>
            </div>

            {/* Charts - Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* PO Value Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            PO Value Trend
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Monthly purchase order value
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={poValueConfig}
                                className="h-full w-full"
                            >
                                <AreaChart
                                    data={purchaseOrders.poValueTrend}
                                    margin={{
                                        top: 5,
                                        right: 0,
                                        left: 10,
                                        bottom: -10,
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
                                        dataKey="totalValue"
                                        fill="var(--color-totalValue)"
                                        fillOpacity={0.3}
                                        stroke="var(--color-totalValue)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">
                            Category Distribution
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Products by category
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="relative h-56 sm:h-64 lg:h-72 w-full">
                            <ChartContainer
                                config={categoryConfig}
                                className="h-full w-full"
                            >
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={2}
                                    >
                                        {categoryData.map((entry, index) => (
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
                                        Product
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        Categories
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                            {categoryData.map((item, index) => (
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

            {/* Tables - Row 1 */}
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
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {salesActivity.recentInvoices.map((inv) => (
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

                {/* Recent Purchase Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Recent Purchase Orders</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Latest PO activity</CardDescription>
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
                                    {purchaseOrders.recentPOs.map((po) => {
                                        const statusBadge = statusConfig[po.status] || statusConfig.pending;
                                        return (
                                            <TableRow key={po._id}>
                                                <TableCell className="py-1.5 px-2 text-xs font-medium">{po.poNumber}</TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                    {po.supplierId.name}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                    ${po.totalCost.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell">
                                                    <Badge className={statusBadge.className}>
                                                        {statusBadge.label}
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
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Alert & Top Suppliers */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Low Stock Alert */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Low Stock Alert</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Products below reorder threshold
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-75">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Threshold</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.lowStockAlert.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                                                No low stock items
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inventory.lowStockAlert.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell className="py-1.5 px-2 text-xs font-medium">{item.name}</TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell text-muted-foreground">
                                                    {item.sku}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs text-center text-yellow-500 font-medium">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs text-center text-muted-foreground">
                                                    {item.reorderThreshold}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Suppliers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Top Suppliers</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Suppliers by PO volume
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-4 overflow-x-auto">
                        <div className="min-w-75">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Supplier</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">POs</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrders.topSuppliers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-4">
                                                No supplier data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchaseOrders.topSuppliers.map((supplier) => (
                                            <TableRow key={supplier.id}>
                                                <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                    <Link
                                                        to={`/admin/suppliers/${supplier.id}`}
                                                        className="hover:text-primary transition-colors"
                                                    >
                                                        {supplier.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs text-center">
                                                    {supplier.poCount}
                                                </TableCell>
                                                <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                    ${supplier.totalCost.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
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

export default ManagerDashboard;