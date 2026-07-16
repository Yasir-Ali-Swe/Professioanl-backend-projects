// pages/stock/StockList.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
    Package,
    Search,
    Eye,
    MoreVertical,
    ArrowDown,
    ArrowUp,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dummy Data
const dummyStock = [
    { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', quantity: 45, reorderThreshold: 10, costPrice: 15, sellingPrice: 29.99, category: 'Electronics', supplier: 'TechSupply Co.', status: 'healthy' },
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', quantity: 8, reorderThreshold: 15, costPrice: 8, sellingPrice: 19.99, category: 'Electronics', supplier: 'PowerTech Ltd.', status: 'low' },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', quantity: 2, reorderThreshold: 5, costPrice: 25, sellingPrice: 49.99, category: 'Electronics', supplier: 'TechSupply Co.', status: 'low' },
    { _id: '4', name: 'HDMI Cable', sku: 'SKU-004', quantity: 0, reorderThreshold: 20, costPrice: 3, sellingPrice: 9.99, category: 'Cables', supplier: 'CableMasters Inc.', status: 'out' },
    { _id: '5', name: 'Wireless Keyboard', sku: 'SKU-005', quantity: 15, reorderThreshold: 12, costPrice: 30, sellingPrice: 59.99, category: 'Electronics', supplier: 'PowerTech Ltd.', status: 'healthy' },
];

const StockList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [stock] = useState(dummyStock);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== '') {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        if (key !== 'page') {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    const getStatusBadge = (status) => {
        const variants = {
            healthy: { label: 'Healthy', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
            low: { label: 'Low Stock', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
            out: { label: 'Out of Stock', className: 'bg-red-500/10 text-destructive border-red-500/20' },
        };
        return variants[status] || variants.healthy;
    };

    const filteredStock = stock.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
    );

    const getPageNumbers = () => {
        const total = Math.ceil(filteredStock.length / limit);
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

    const paginatedStock = filteredStock.slice(
        (page - 1) * limit,
        page * limit
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All Stock</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        View all products and their stock levels.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Items</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold">{stock.length}</p>
                </div>
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Healthy Stock</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-green-500">
                        {stock.filter(s => s.status === 'healthy').length}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Low Stock</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-yellow-500">
                        {stock.filter(s => s.status === 'low').length}
                    </p>
                </div>
                <div className="rounded-xl border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Out of Stock</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">
                        {stock.filter(s => s.status === 'out').length}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or SKU..."
                        value={search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                </div>
                {search && (
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
                        Clear Search
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-37.5">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="text-center">Quantity</TableHead>
                                <TableHead className="hidden md:table-cell">Category</TableHead>
                                <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        No stock items found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedStock.map((item) => {
                                    const status = getStatusBadge(item.status);
                                    return (
                                        <TableRow key={item._id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to={`/admin/products/${item._id}`}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {item.name}
                                                </Link>
                                                <div className="sm:hidden text-[10px] text-muted-foreground">
                                                    {item.sku}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                                {item.sku}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`text-sm font-medium ${item.quantity <= item.reorderThreshold && item.quantity > 0 ? 'text-yellow-500' : item.quantity === 0 ? 'text-destructive' : ''}`}>
                                                    {item.quantity}
                                                </span>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Threshold: {item.reorderThreshold}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs">
                                                {item.category}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                {item.supplier}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={status.className}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                                                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuItem
                                                                render={
                                                                    <Link to={`/admin/products/${item._id}`} className="cursor-pointer">
                                                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                                                        View Product
                                                                    </Link>
                                                                }
                                                            />
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <ArrowDown className="mr-2 h-3.5 w-3.5 text-green-500" />
                                                                Stock In
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <ArrowUp className="mr-2 h-3.5 w-3.5 text-destructive" />
                                                                Stock Out
                                                            </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                        <span className="font-medium">{Math.min(page * limit, filteredStock.length)}</span>{' '}
                        of <span className="font-medium">{filteredStock.length}</span> results
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
                                        if (page < Math.ceil(filteredStock.length / limit)) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= Math.ceil(filteredStock.length / limit) && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
        </div>
    );
};

export default StockList;