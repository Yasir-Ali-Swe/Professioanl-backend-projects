// pages/categories/CategoriesList.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useCategories, useDeleteCategory } from '@/hooks/useCategory';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    Tags,
    Package,
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    MoreVertical,
    CheckCircle,
    XCircle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dummy Data
const dummyCategories = [
    {
        _id: 'c1',
        name: 'Electronics',
        categorySlug: 'electronics',
        createdBy: { name: 'John Doe', role: 'admin' },
        createdAt: '2024-01-15T10:30:00Z',
        productsCount: 45,
        isActive: true,
    },
    {
        _id: 'c2',
        name: 'Cables',
        categorySlug: 'cables',
        createdBy: { name: 'Jane Smith', role: 'manager' },
        createdAt: '2024-01-14T14:20:00Z',
        productsCount: 23,
        isActive: true,
    },
    {
        _id: 'c3',
        name: 'Accessories',
        categorySlug: 'accessories',
        createdBy: { name: 'John Doe', role: 'admin' },
        createdAt: '2024-01-13T09:15:00Z',
        productsCount: 12,
        isActive: true,
    },
    {
        _id: 'c4',
        name: 'Furniture',
        categorySlug: 'furniture',
        createdBy: { name: 'Sarah Johnson', role: 'manager' },
        createdAt: '2024-01-12T16:45:00Z',
        productsCount: 0,
        isActive: false,
    },
    {
        _id: 'c5',
        name: 'Stationery',
        categorySlug: 'stationery',
        createdBy: { name: 'Mike Wilson', role: 'staff' },
        createdAt: '2024-01-11T11:00:00Z',
        productsCount: 8,
        isActive: true,
    },
];

const CategoriesList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const { data: response, isLoading, isError } = useCategories();
    const deleteMutation = useDeleteCategory();

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

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
                <p className="text-destructive font-medium">Failed to load categories</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const categories = response.data || [];

    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    const inactiveCategories = categories.filter(c => !c.isActive).length;

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

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        cat.categorySlug.toLowerCase().includes(search.toLowerCase())
    );

    const getPageNumbers = () => {
        const total = Math.ceil(filteredCategories.length / limit);
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

    const paginatedCategories = filteredCategories.slice(
        (page - 1) * limit,
        page * limit
    );

    const handleDelete = (category) => {
        if (category.productsCount > 0) {
            toast.error(`Cannot delete "${category.name}". ${category.productsCount} product(s) are associated with this category.`);
            return;
        }
        if (confirm(`Are you sure you want to delete category "${category.name}"?`)) {
            deleteMutation.mutate(category._id);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage your product categories.
                    </p>
                </div>
                {
                    user && (user.role === 'admin' || user.role === 'manager') &&
                    <Button className="w-full sm:w-auto" asChild>
                        <Link to={`/${rolePrefix}/categories/add`} className="flex items-center justify-center">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add Category
                        </Link>
                    </Button>
                }
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Categories</CardTitle>
                        <Tags className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalCategories}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All categories</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active Categories</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{activeCategories}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((activeCategories / totalCategories) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Inactive Categories</CardTitle>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{inactiveCategories}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">No products assigned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search categories..."
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
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-37.5">Category Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                                <TableHead className="text-center">Products</TableHead>
                                <TableHead className="hidden md:table-cell">Created By</TableHead>
                                <TableHead className="hidden lg:table-cell">Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                        No categories found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCategories.map((category) => (
                                    <TableRow key={category._id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                to={`/${rolePrefix}/categories/${category._id}`}
                                                className="hover:text-primary transition-colors"
                                            >
                                                {category.name}
                                            </Link>
                                            <div className="sm:hidden text-[10px] text-muted-foreground">
                                                {category.categorySlug}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                            {category.categorySlug}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-medium">{category.productsCount}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs">
                                            {category.createdBy?.name || 'N/A'}
                                            <div className="text-[10px] text-muted-foreground">
                                                {category.createdBy?.role || ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                            {formatDate(category.createdAt)}
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
                                                                <Link to={`/${rolePrefix}/categories/${category._id}`} className="cursor-pointer">
                                                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                                                    View Details
                                                                </Link>
                                                            }
                                                        />
                                                        {
                                                            user && (user.role === 'admin' || user.role === 'manager') &&
                                                            <DropdownMenuItem
                                                                render={
                                                                    <Link to={`/${rolePrefix}/categories/${category._id}/edit`} className="cursor-pointer">
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
                                                                className="cursor-pointer text-destructive focus:text-destructive"
                                                                onClick={() => handleDelete(category)}
                                                            >
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        }
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, filteredCategories.length)}</span>{' '}
                        of <span className="font-medium">{filteredCategories.length}</span> results
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
                                        if (page < Math.ceil(filteredCategories.length / limit)) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= Math.ceil(filteredCategories.length / limit) && 'pointer-events-none opacity-50'
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

export default CategoriesList;