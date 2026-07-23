// pages/stock/LowStock.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useLowStockProducts } from '@/hooks/useStock';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertTriangle,
    Package,
    Eye,
    ArrowDown,
    TrendingUp,
} from 'lucide-react';

// Dummy Data - Only low stock items
const dummyLowStock = [
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', quantity: 8, reorderThreshold: 15, category: 'Electronics', supplier: 'PowerTech Ltd.', status: 'low' },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', quantity: 2, reorderThreshold: 5, category: 'Electronics', supplier: 'TechSupply Co.', status: 'low' },
    { _id: '6', name: 'USB-C Cable', sku: 'SKU-006', quantity: 3, reorderThreshold: 10, category: 'Cables', supplier: 'CableMasters Inc.', status: 'low' },
];

const LowStock = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const { data: response, isLoading, isError } = useLowStockProducts();

    const getUrgency = (quantity, threshold) => {
        if (!threshold) return { label: 'Medium', className: 'text-yellow-500' };
        const ratio = quantity / threshold;
        if (ratio <= 0.2) return { label: 'Critical', className: 'text-destructive' };
        if (ratio <= 0.5) return { label: 'High', className: 'text-orange-500' };
        return { label: 'Medium', className: 'text-yellow-500' };
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
                <p className="text-destructive font-medium">Failed to load low stock products</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const { products: stock = [], totalLowStock = 0 } = response.data || {};

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Low Stock Items</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Products that need immediate attention.
                    </p>
                </div>
                <Button asChild>
                    <Link to={`/${rolePrefix}/stock/in`} className="flex items-center">
                        <ArrowDown className="mr-1.5 h-4 w-4" />
                        Restock Items
                    </Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <div className="border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Low Stock</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-yellow-500">{stock.length}</p>
                </div>
                <div className="border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Critical</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-destructive">
                        {stock.filter(s => s.quantity / s.reorderThreshold <= 0.2).length}
                    </p>
                </div>
                <div className="border bg-card p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">High Priority</p>
                    <p className="mt-1 text-lg sm:text-2xl font-bold text-orange-500">
                        {stock.filter(s => s.quantity / s.reorderThreshold > 0.2 && s.quantity / s.reorderThreshold <= 0.5).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <Card className={cn(
                "bg-transparent ring-0"
            )}>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Low Stock Products</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 overflow-x-auto">
                    <div className="min-w-125 border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 px-2 text-xs">Product</TableHead>
                                    <TableHead className="py-2 px-2 text-xs">SKU</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-center">Quantity</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-center">Threshold</TableHead>
                                    <TableHead className="py-2 px-2 text-xs">Category</TableHead>
                                    <TableHead className="py-2 px-2 text-xs">Urgency</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stock.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                            No low stock items found. All products are well stocked! 🎉
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stock.map((item) => {
                                        const urgency = getUrgency(item.quantity, item.reorderThreshold);
                                        return (
                                            <TableRow key={item._id}>
                                                <TableCell className="py-2 px-2 text-xs font-medium">
                                                    {item.name}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                                    {item.sku}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-center font-bold text-yellow-500">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-center text-muted-foreground">
                                                    {item.reorderThreshold}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs">
                                                    {item.category?.name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="py-2 px-2">
                                                    <Badge variant="outline" className={`${urgency.className} border-current/20`}>
                                                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                                        {urgency.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-right">
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                                        <Link to={`/${rolePrefix}/products/${item._id}`}>
                                                            <Eye className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LowStock;