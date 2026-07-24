import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useProducts, useToggleProductActive } from '@/hooks/useProduct';
import { useCategories } from '@/hooks/useCategory';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
    Package,
    PackageOpen,
    AlertTriangle,
    Search,
    Filter,
    ChevronDown,
    Eye,
    Edit,
    MoreVertical,
    CheckCircle,
    XCircle,
    Plus,
    ArrowUpDown,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
const ProductsList = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const [searchParams, setSearchParams] = useSearchParams();

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const { data: response, isLoading, isError } = useProducts({
        page,
        limit,
        search,
        categoryName: category === 'all' ? undefined : category,
        minPrice,
        maxPrice,
        sortBy,
        order,
    });

    const { data: categoriesResponse } = useCategories();
    const categoriesList = categoriesResponse?.data || [];

    const toggleActiveMutation = useToggleProductActive();

    const handleToggleActive = (product) => {
        toggleActiveMutation.mutate({
            id: product._id,
            isActive: !product.isActive,
        });
    };

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

    const products = response?.data || [];
    const totalProducts = response?.total || 0;
    const activeProducts = response?.activeCount || 0;
    const lowStockProducts = response?.lowStockCount || 0;
    const totalPages = response?.totalPages || 1;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (isActive) => {
        return isActive ? 'default' : 'secondary';
    };

    const getStockStatus = (quantity, reorderThreshold) => {
        if (quantity <= reorderThreshold && quantity > 0) {
            return { label: 'Low Stock', className: 'text-yellow-500 border-yellow-500/30' };
        }
        if (quantity === 0) {
            return { label: 'Out of Stock', className: 'text-destructive border-destructive/30' };
        }
        return { label: 'In Stock', className: 'text-green-500 border-green-500/30' };
    };

    const capitalize = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const getPageNumbers = () => {
        const total = totalPages;
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

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage your product catalog.
                    </p>
                </div>
                {
                    user && (user.role === 'admin' || user.role === 'manager') &&
                    <Button className="w-full sm:w-auto">
                        <Link to={`/${rolePrefix}/products/add`} className="flex items-center gap-1">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add Product
                        </Link>
                    </Button>
                }
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All products</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active Products</CardTitle>
                        <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{activeProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((activeProducts / totalProducts) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Products</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{lowStockProducts}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
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
                                Category: {category === 'all' ? 'All' : capitalize(category)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('category', 'all')}>All</DropdownMenuItem>
                            {categoriesList.map((cat) => (
                                <DropdownMenuItem key={cat._id} onClick={() => updateFilter('category', cat.name)}>
                                    {cat.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        placeholder="Min Price"
                        value={minPrice}
                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                        className="h-8 sm:h-9 text-xs sm:text-sm w-24 sm:w-28"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                        type="number"
                        placeholder="Max Price"
                        value={maxPrice}
                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                        className="h-8 sm:h-9 text-xs sm:text-sm w-24 sm:w-28"
                    />
                </div>

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
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'name')}>Name</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'sellingPrice')}>Price</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'quantity')}>Stock</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'createdAt')}>Date</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Order</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('order', 'asc')}>Ascending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('order', 'desc')}>Descending</DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {(search || category !== 'all' || minPrice || maxPrice || sortBy !== 'createdAt' || order !== 'desc') && (
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
                    <Table className={"rounded-md"}>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">Image</TableHead>
                                <TableHead className="min-w-37.5">Name</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="hidden md:table-cell">Category</TableHead>
                                <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="hidden md:table-cell text-right">Price</TableHead>
                                <TableHead className="hidden lg:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-xs text-muted-foreground">Loading products...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-destructive text-xs font-medium">
                                        Failed to load products. Please check your connection.
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                        No products found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => {
                                    const stockStatus = getStockStatus(product.quantity, product.reorderThreshold);
                                    return (
                                        <TableRow key={product._id}>
                                            <TableCell>
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="h-8 w-8 object-cover"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to={`/${rolePrefix}/products/${product._id}`}
                                                    className="hover:text-primary transition-colors"
                                                >
                                                    {product.name}
                                                </Link>
                                                <div className="sm:hidden text-[10px] text-muted-foreground">
                                                    {product.sku}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                                {product.sku}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {product.category?.name || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                {product.supplier?.name || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    product.quantity <= product.reorderThreshold && product.quantity > 0 && "text-yellow-500",
                                                    product.quantity === 0 && "text-destructive"
                                                )}>
                                                    {product.quantity}
                                                </span>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {stockStatus.label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-right font-medium">
                                                ${product.sellingPrice.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge variant={getStatusBadge(product.isActive)} className="text-[10px]">
                                                    {product.isActive ? 'Active' : 'Inactive'}
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
                                                                    <Link to={`/${rolePrefix}/products/${product._id}`} className="cursor-pointer">
                                                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                                                        View Details
                                                                    </Link>
                                                                }
                                                            />
                                                            {
                                                                user && (user.role === 'admin' || user.role === 'manager') &&
                                                                <DropdownMenuItem
                                                                    render={
                                                                        <Link to={`/${rolePrefix}/products/edit/${product._id}`} className="cursor-pointer">
                                                                            <Edit className="mr-2 h-3.5 w-3.5" />
                                                                            Edit
                                                                        </Link>
                                                                    }
                                                                />
                                                            }
                                                            {
                                                                user && (user.role === 'admin' || user.role === 'manager') &&
                                                                <DropdownMenuSeparator />
                                                            }
                                                            {
                                                                user && (user.role === 'admin' || user.role === 'manager') &&
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer"
                                                                    onClick={() => handleToggleActive(product)}
                                                                >
                                                                    {product.isActive ? (
                                                                        <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                                                    ) : (
                                                                        <CheckCircle className="mr-2 h-3.5 w-3.5 text-primary" />
                                                                    )}
                                                                    {product.isActive ? 'Deactivate' : 'Activate'}
                                                                </DropdownMenuItem>
                                                            }
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
                {/* Footer: count + pagination */}
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, totalProducts)}</span>{' '}
                        of <span className="font-medium">{totalProducts}</span> results
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
                                        if (page < totalPages) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= totalPages && 'pointer-events-none opacity-50'
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

export default ProductsList;