import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useAllInvoices, useVoidInvoice } from '@/hooks/useInvoice';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    FileText,
    Search,
    Filter,
    ChevronDown,
    Eye,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Plus,
    ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dummy Data
const dummyInvoices = {
    data: {
        invoices: [
            {
                _id: 'inv_1',
                invoiceNumber: 'INV-0001',
                customerName: 'TechCorp Inc.',
                products: [{ productId: 'p1' }, { productId: 'p2' }],
                total: 1250.00,
                subtotal: 1100.00,
                tax: 100.00,
                discount: 50.00,
                status: 'paid',
                createdBy: { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
                voidedBy: null,
                createdAt: '2024-07-15T10:30:00Z',
            },
            {
                _id: 'inv_2',
                invoiceNumber: 'INV-0002',
                customerName: 'GreenLeaf Solutions',
                products: [{ productId: 'p3' }, { productId: 'p4' }, { productId: 'p5' }],
                total: 850.00,
                subtotal: 750.00,
                tax: 75.00,
                discount: 25.00,
                status: 'unpaid',
                createdBy: { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager' },
                voidedBy: null,
                createdAt: '2024-07-14T14:20:00Z',
            },
            {
                _id: 'inv_3',
                invoiceNumber: 'INV-0003',
                customerName: 'BlueWave Media',
                products: [{ productId: 'p1' }],
                total: 3200.00,
                subtotal: 3000.00,
                tax: 200.00,
                discount: 0,
                status: 'void',
                createdBy: { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
                voidedBy: { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
                createdAt: '2024-07-13T09:15:00Z',
            },
            {
                _id: 'inv_4',
                invoiceNumber: 'INV-0004',
                customerName: 'CloudNine Systems',
                products: [{ productId: 'p2' }, { productId: 'p3' }],
                total: 4500.00,
                subtotal: 4200.00,
                tax: 300.00,
                discount: 0,
                status: 'paid',
                createdBy: { _id: 'u3', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'manager' },
                voidedBy: null,
                createdAt: '2024-07-12T16:45:00Z',
            },
            {
                _id: 'inv_5',
                invoiceNumber: 'INV-0005',
                customerName: 'StarBridge Consulting',
                products: [{ productId: 'p4' }, { productId: 'p5' }],
                total: 2100.00,
                subtotal: 2000.00,
                tax: 100.00,
                discount: 0,
                status: 'unpaid',
                createdBy: { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager' },
                voidedBy: null,
                createdAt: '2024-07-11T11:00:00Z',
            },
        ],
        pagination: {
            total: 25,
            page: 1,
            limit: 10,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: false,
        },
        summary: {
            totalRevenue: 11900,
            totalTax: 775,
            totalDiscount: 75,
            totalInvoices: 25,
            paidInvoices: 15,
            unpaidInvoices: 8,
            voidInvoices: 2,
        },
    },
}
// Detail Dialog Component
const InvoiceDetailDialog = ({ invoice, open, onOpenChange }) => {
    if (!invoice) return null;

    const voidMutation = useVoidInvoice();

    const getStatusBadge = (status) => {
        const variants = {
            paid: 'bg-green-500/10 text-green-500 border-green-500/20',
            unpaid: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            void: 'bg-red-500/10 text-destructive border-red-500/20',
        };
        return variants[status] || variants.unpaid;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleVoid = () => {
        if (confirm("Are you sure you want to void this invoice? This will restore inventory stocks.")) {
            voidMutation.mutate(invoice._id, {
                onSuccess: () => {
                    onOpenChange(false);
                }
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-auto max-h-[90vh] overflow-y-auto">
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
                        Created by {invoice.createdBy.name} on {formatDate(invoice.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 ">
                        <div>
                            <p className="text-xs text-muted-foreground">Customer</p>
                            <p className="text-sm font-medium">{invoice.customerName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="text-sm font-medium">{formatDate(invoice.createdAt)}</p>
                        </div>
                    </div>

                    {/* Products Table */}
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
                                {invoice.products.map((item, index) => (
                                    <TableRow key={index}>
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
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary */}
                    <div className="border-t pt-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>${invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span>${invoice.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-red-500">-${invoice.discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-1 border-t">
                            <span>Total</span>
                            <span className="text-primary">${invoice.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Void Info */}
                    {invoice.status === 'void' && invoice.voidedBy && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-muted-foreground">Voided By</p>
                            <p className="text-sm font-medium">{invoice.voidedBy.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(invoice.updatedAt || invoice.createdAt)}</p>
                        </div>
                    )}
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose render={<Button variant="outline" disabled={voidMutation.isPending}>Close</Button>} />
                    {invoice.status !== 'void' && (
                        <Button variant="destructive" onClick={handleVoid} disabled={voidMutation.isPending}>
                            {voidMutation.isPending ? 'Voiding...' : 'Void Invoice'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};

const AllInvoices = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const customer = searchParams.get('customer') || '';
    const minTotal = searchParams.get('minTotal') || '';
    const maxTotal = searchParams.get('maxTotal') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const { data: response, isLoading, isError } = useAllInvoices({
        page,
        limit,
        search,
        status: status === 'all' ? undefined : status,
        customerName: customer || undefined,
        minTotal: minTotal || undefined,
        maxTotal: maxTotal || undefined,
        sortBy,
        order,
    });

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            paid: { label: 'Paid', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
            unpaid: { label: 'Unpaid', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
            void: { label: 'Void', className: 'bg-red-500/10 text-destructive border-red-500/20' },
        };
        return variants[status] || variants.unpaid;
    };

    const capitalize = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const getPageNumbers = () => {
        const total = pagination.totalPages;
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
                <p className="text-destructive font-medium">Failed to load invoices</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const { invoices = [], summary = {
        totalRevenue: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        unpaidInvoices: 0,
        voidInvoices: 0,
    }, pagination = {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    } } = response.data || {};

    const paginatedInvoices = invoices;

    const openDetailDialog = (invoice) => {
        setSelectedInvoice(invoice);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All Invoices</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage all invoices across the organization.
                    </p>
                </div>
                <Button className="w-full sm:w-auto" render={<Link to={`/${rolePrefix}/invoices/generate`} className="flex items-center justify-center">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Generate Invoice
                </Link>} />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Invoices</CardTitle>
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{summary.totalInvoices}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Paid</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{summary.paidInvoices}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((summary.paidInvoices / summary.totalInvoices) * 100)}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Unpaid</CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{summary.unpaidInvoices}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((summary.unpaidInvoices / summary.totalInvoices) * 100)}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Void</CardTitle>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{summary.voidInvoices}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">
                            ${summary.totalRevenue.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by invoice or customer..."
                        value={search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                </div>

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
                            <DropdownMenuItem onClick={() => updateFilter('status', 'paid')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                                Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'unpaid')}>
                                <Clock className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                Unpaid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'void')}>
                                <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                Void
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Input
                    placeholder="Customer"
                    value={customer}
                    onChange={(e) => updateFilter('customer', e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-40"
                />

                <Input
                    type="number"
                    placeholder="Min Total"
                    value={minTotal}
                    onChange={(e) => updateFilter('minTotal', e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm w-24 sm:w-28"
                />
                <span className="text-xs text-muted-foreground">-</span>
                <Input
                    type="number"
                    placeholder="Max Total"
                    value={maxTotal}
                    onChange={(e) => updateFilter('maxTotal', e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm w-24 sm:w-28"
                />

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
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'createdAt')}>
                                Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'total')}>
                                Total
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'customerName')}>
                                Customer
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
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

                {(search || status !== 'all' || customer || minTotal || maxTotal || sortBy !== 'createdAt' || order !== 'desc') && (
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

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-30">Invoice #</TableHead>
                                <TableHead className="min-w-37.5">Customer</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">Products</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-25">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Created By</TableHead>
                                <TableHead className="hidden lg:table-cell">Date</TableHead>
                                <TableHead className="text-right w-15">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedInvoices.map((invoice) => {
                                    const statusBadge = getStatusBadge(invoice.status);
                                    return (
                                        <TableRow key={invoice._id}>
                                            <TableCell className="font-medium">
                                                <button
                                                    onClick={() => openDetailDialog(invoice)}
                                                    className="text-primary hover:underline text-xs sm:text-sm cursor-pointer"
                                                >
                                                    {invoice.invoiceNumber}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-xs sm:text-sm">
                                                {invoice.customerName}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-center text-xs">
                                                {invoice.products.length}
                                            </TableCell>
                                            <TableCell className="text-right text-xs sm:text-sm font-medium">
                                                ${invoice.total.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={statusBadge.className}>
                                                    {statusBadge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {invoice.createdBy.name}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                {formatDate(invoice.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                                    onClick={() => openDetailDialog(invoice)}
                                                >
                                                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, pagination.total)}</span>{' '}
                        of <span className="font-medium">{pagination.total}</span> results
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
                                        if (page < pagination.totalPages) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= pagination.totalPages && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>

            {/* Invoice Detail Dialog */}
            <InvoiceDetailDialog
                invoice={selectedInvoice}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div >
    );
};

export default AllInvoices;