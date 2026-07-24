import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { usePurchaseOrders, useApprovePurchaseOrder, useRejectPurchaseOrder, useFulfillPurchaseOrder } from '@/hooks/usePurchaseOrder';
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
} from '@/components/ui/dialog';
import {
    ShoppingCart,
    Search,
    Filter,
    ChevronDown,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Package,
    Plus,
    ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dummy Data
const dummyPurchaseOrders = {
    data: {
        orders: [
            {
                _id: 'po_1',
                poNumber: 'PO-0001',
                supplierId: { _id: 's1', name: 'TechSupply Co.', contactPerson: 'John Smith' },
                items: [{ productId: 'p1' }, { productId: 'p2' }],
                totalCost: 1250.00,
                status: 'fulfilled',
                createdBy: { _id: 'u1', name: 'John Doe', role: 'admin' },
                approvedBy: { _id: 'u1', name: 'John Doe', role: 'admin' },
                createdAt: '2024-07-15T10:30:00Z',
            },
            {
                _id: 'po_2',
                poNumber: 'PO-0002',
                supplierId: { _id: 's2', name: 'PowerTech Ltd.', contactPerson: 'Jane Doe' },
                items: [{ productId: 'p3' }, { productId: 'p4' }],
                totalCost: 850.00,
                status: 'pending',
                createdBy: { _id: 'u2', name: 'Jane Smith', role: 'manager' },
                approvedBy: null,
                createdAt: '2024-07-14T14:20:00Z',
            },
            {
                _id: 'po_3',
                poNumber: 'PO-0003',
                supplierId: { _id: 's3', name: 'CableMasters Inc.', contactPerson: 'Bob Wilson' },
                items: [{ productId: 'p1' }],
                totalCost: 3200.00,
                status: 'approved',
                createdBy: { _id: 'u1', name: 'John Doe', role: 'admin' },
                approvedBy: { _id: 'u1', name: 'John Doe', role: 'admin' },
                createdAt: '2024-07-13T09:15:00Z',
            },
            {
                _id: 'po_4',
                poNumber: 'PO-0004',
                supplierId: { _id: 's4', name: 'Global Logistics', contactPerson: 'Sarah Johnson' },
                items: [{ productId: 'p2' }, { productId: 'p3' }],
                totalCost: 4500.00,
                status: 'rejected',
                createdBy: { _id: 'u3', name: 'Sarah Johnson', role: 'manager' },
                approvedBy: null,
                createdAt: '2024-07-12T16:45:00Z',
            },
            {
                _id: 'po_5',
                poNumber: 'PO-0005',
                supplierId: { _id: 's1', name: 'TechSupply Co.', contactPerson: 'John Smith' },
                items: [{ productId: 'p4' }, { productId: 'p5' }],
                totalCost: 2100.00,
                status: 'pending',
                createdBy: { _id: 'u2', name: 'Jane Smith', role: 'manager' },
                approvedBy: null,
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
            totalOrders: 25,
            pending: 8,
            approved: 10,
            rejected: 2,
            fulfilled: 5,
            totalCost: 42500,
        },
    },
};

// Status Badge Configuration
const statusConfig = {
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    approved: { label: 'Approved', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    rejected: { label: 'Rejected', className: 'bg-red-500/10 text-destructive border-red-500/20' },
    fulfilled: { label: 'Fulfilled', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

// Detail Dialog Component
const PurchaseOrderDetailDialog = ({ order, open, onOpenChange, userRole }) => {
    if (!order) return null;

    const approveMutation = useApprovePurchaseOrder();
    const rejectMutation = useRejectPurchaseOrder();
    const fulfillMutation = useFulfillPurchaseOrder();

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleApprove = () => {
        approveMutation.mutate(order._id, {
            onSuccess: () => onOpenChange(false)
        });
    };

    const handleReject = () => {
        rejectMutation.mutate(order._id, {
            onSuccess: () => onOpenChange(false)
        });
    };

    const handleFulfill = () => {
        fulfillMutation.mutate(order._id, {
            onSuccess: () => onOpenChange(false)
        });
    };

    const statusBadge = statusConfig[order.status] || statusConfig.pending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            {order.poNumber}
                        </DialogTitle>
                        <Badge className={statusBadge.className}>
                            {statusBadge.label}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Created by {order.createdBy.name} on {formatDate(order.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Supplier Info */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30">
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="text-sm font-medium">{order.supplierId.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Contact Person</p>
                            <p className="text-sm">{order.supplierId.contactPerson}</p>
                        </div>
                    </div>

                    {/* Items Table */}
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
                                {order.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="py-1.5 px-2 text-xs font-medium">
                                            <div>{item.productId?.name || 'Deleted Product'}</div>
                                            <div className="text-[10px] text-muted-foreground">{item.productId?.sku || 'N/A'}</div>
                                        </TableCell>
                                        <TableCell className="py-1.5 px-2 text-xs text-center">{item.quantity}</TableCell>
                                        <TableCell className="py-1.5 px-2 text-xs text-right">
                                            ${(item.unitCost || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                            ${((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary */}
                    <div className="border-t pt-3">
                        <div className="flex justify-between text-base font-bold">
                            <span>Total Cost</span>
                            <span className="text-primary">${order.totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={approveMutation.isPending || rejectMutation.isPending || fulfillMutation.isPending}>Close</Button>
                    </DialogClose>

                    {/* ✅ Only Admin can Approve/Reject */}
                    {userRole === 'admin' && order.status === 'pending' && (
                        <>
                            <Button variant="outline" onClick={handleReject} disabled={approveMutation.isPending || rejectMutation.isPending}>
                                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                            </Button>
                            <Button onClick={handleApprove} disabled={approveMutation.isPending || rejectMutation.isPending}>
                                {approveMutation.isPending ? 'Approving...' : 'Approve'}
                            </Button>
                        </>
                    )}

                    {/* ✅ Admin and Manager both can Fulfill */}
                    {(userRole === 'admin' || userRole === 'manager') && order.status === 'approved' && (
                        <Button onClick={handleFulfill} disabled={fulfillMutation.isPending}>
                            {fulfillMutation.isPending ? 'Fulfilling...' : 'Fulfill'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AllPurchaseOrders = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // ✅ Get user role from auth
    const userRole = user?.role || 'admin';

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const supplier = searchParams.get('supplier') || '';
    const minTotal = searchParams.get('minTotal') || '';
    const maxTotal = searchParams.get('maxTotal') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const { data: response, isLoading, isError } = usePurchaseOrders({
        page,
        limit,
        search,
        status: status === 'all' ? undefined : status,
        supplierId: supplier || undefined,
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
                <p className="text-destructive font-medium">Failed to load purchase orders</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const { orders = [], summary = {
        totalOrders: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        fulfilled: 0,
        totalCost: 0,
    }, pagination = {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    } } = response.data || {};

    const paginatedOrders = orders;

    const openDetailDialog = (order) => {
        setSelectedOrder(order);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Purchase Orders</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage all purchase orders across the organization.
                    </p>
                </div>
                {/* ✅ Create PO button - visible to Admin and Manager */}
                <Button className="w-full sm:w-auto" asChild>
                    <Link to={`/${rolePrefix}/purchase-orders/create`} className='flex items-center'>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Create Purchase Order
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{summary.totalOrders}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Pending</CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{summary.pending}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Approved</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{summary.approved}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Rejected</CardTitle>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{summary.rejected}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Fulfilled</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{summary.fulfilled}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by PO number..."
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
                            <DropdownMenuItem onClick={() => updateFilter('status', 'pending')}>
                                <Clock className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'approved')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                                Approved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'rejected')}>
                                <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                Rejected
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'fulfilled')}>
                                <Package className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Fulfilled
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Input
                    placeholder="Supplier"
                    value={supplier}
                    onChange={(e) => updateFilter('supplier', e.target.value)}
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
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'totalCost')}>
                                Total
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'supplierId')}>
                                Supplier
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

                {(search || status !== 'all' || supplier || minTotal || maxTotal || sortBy !== 'createdAt' || order !== 'desc') && (
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
                                <TableHead className="min-w-30">PO #</TableHead>
                                <TableHead className="min-w-37.5">Supplier</TableHead>
                                <TableHead className="hidden sm:table-cell text-center">Items</TableHead>
                                <TableHead className="text-right">Total Cost</TableHead>
                                <TableHead className="w-25">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Created By</TableHead>
                                <TableHead className="hidden lg:table-cell">Date</TableHead>
                                <TableHead className="text-right w-15">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedOrders.map((po) => {
                                    const statusBadge = statusConfig[po.status] || statusConfig.pending;
                                    return (
                                        <TableRow key={po._id}>
                                            <TableCell className="font-medium">
                                                <button
                                                    onClick={() => openDetailDialog(po)}
                                                    className="text-primary hover:underline text-xs sm:text-sm cursor-pointer"
                                                >
                                                    {po.poNumber}
                                                </button>
                                            </TableCell>
                                            <TableCell className="text-xs sm:text-sm">
                                                {po.supplierId.name}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-center text-xs">
                                                {po.items.length}
                                            </TableCell>
                                            <TableCell className="text-right text-xs sm:text-sm font-medium">
                                                ${po.totalCost.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={statusBadge.className}>
                                                    {statusBadge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {po.createdBy.name}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                {formatDate(po.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                                    onClick={() => openDetailDialog(po)}
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

            {/* Purchase Order Detail Dialog */}
            <PurchaseOrderDetailDialog
                order={selectedOrder}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                userRole={userRole}
            />
        </div>
    );
};

export default AllPurchaseOrders;