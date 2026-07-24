// pages/suppliers/SuppliersList.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useSuppliers, useDeleteSupplier } from '@/hooks/useSupplier';
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
    Truck,
    Package,
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    MoreVertical,
    Mail,
    Phone,
    Clock,
    Users,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Dummy Data
const dummySuppliers = [
    {
        _id: 's1',
        name: 'TechSupply Co.',
        contactPerson: 'John Smith',
        email: 'john@techsupply.com',
        phone: '+1 234 567 8900',
        address: '123 Tech Street, Silicon Valley, CA 94025',
        leadTimeDays: 5,
        createdBy: 'John Doe (admin)',
        createdAt: '2024-01-15T10:30:00Z',
        productsCount: 45,
    },
    {
        _id: 's2',
        name: 'PowerTech Ltd.',
        contactPerson: 'Jane Doe',
        email: 'jane@powertech.com',
        phone: '+1 234 567 8901',
        address: '456 Power Road, Austin, TX 78701',
        leadTimeDays: 3,
        createdBy: 'Jane Smith (manager)',
        createdAt: '2024-01-14T14:20:00Z',
        productsCount: 23,
    },
    {
        _id: 's3',
        name: 'CableMasters Inc.',
        contactPerson: 'Bob Wilson',
        email: 'bob@cablemasters.com',
        phone: '+1 234 567 8902',
        address: '789 Cable Blvd, Portland, OR 97201',
        leadTimeDays: 7,
        createdBy: 'John Doe (admin)',
        createdAt: '2024-01-13T09:15:00Z',
        productsCount: 12,
    },
    {
        _id: 's4',
        name: 'Global Logistics',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@globallogistics.com',
        phone: '+1 234 567 8903',
        address: '101 Global Way, Chicago, IL 60601',
        leadTimeDays: 10,
        createdBy: 'Sarah Johnson (manager)',
        createdAt: '2024-01-12T16:45:00Z',
        productsCount: 0,
    },
    {
        _id: 's5',
        name: 'Prime Materials',
        contactPerson: 'Mike Wilson',
        email: 'mike@primematerials.com',
        phone: '+1 234 567 8904',
        address: '202 Prime Ave, Denver, CO 80201',
        leadTimeDays: 4,
        createdBy: 'Mike Wilson (staff)',
        createdAt: '2024-01-11T11:00:00Z',
        productsCount: 8,
    },
];

const SuppliersList = () => {
    const { role } = useAuth();
    const user = useAuth().user;
    const rolePrefix = getRolePrefix(role);
    const [searchParams, setSearchParams] = useSearchParams();

    const { data: response, isLoading, isError } = useSuppliers();
    const deleteMutation = useDeleteSupplier();

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
                <p className="text-destructive font-medium">Failed to load suppliers</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const suppliers = response.data || [];

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.productsCount > 0).length;
    const inactiveSuppliers = suppliers.filter(s => s.productsCount === 0).length;

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

    const filteredSuppliers = suppliers.filter(sup =>
        sup.name.toLowerCase().includes(search.toLowerCase()) ||
        sup.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
        (sup.email && sup.email.toLowerCase().includes(search.toLowerCase()))
    );

    const getPageNumbers = () => {
        const total = Math.ceil(filteredSuppliers.length / limit);
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

    const paginatedSuppliers = filteredSuppliers.slice(
        (page - 1) * limit,
        page * limit
    );

    const handleDelete = (supplier) => {
        if (supplier.productsCount > 0) {
            toast.error(`Cannot delete "${supplier.name}". ${supplier.productsCount} product(s) are associated with this supplier.`);
            return;
        }
        if (confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
            deleteMutation.mutate(supplier._id);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Suppliers</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage your product suppliers.
                    </p>
                </div>
                {
                    user && (user.role === 'admin' || user.role === 'manager') &&
                    <Button className={"max-w-30"} asChild>
                        <Link to={`/${rolePrefix}/suppliers/add`} className="flex items-center justify-center">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add Supplier
                        </Link>
                    </Button>
                }
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Total Suppliers</CardTitle>
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalSuppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All suppliers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Active Suppliers</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">{activeSuppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((activeSuppliers / totalSuppliers) * 100)}% have products
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Inactive Suppliers</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">{inactiveSuppliers}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">No products assigned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search suppliers..."
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
                                <TableHead className="min-w-37.5">Supplier Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Contact Person</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead className="text-center">Products</TableHead>
                                <TableHead className="hidden lg:table-cell">Lead Time</TableHead>
                                <TableHead className="hidden lg:table-cell">Created By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSuppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSuppliers.map((supplier) => (
                                    <TableRow key={supplier._id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                to={`/${rolePrefix}/suppliers/${supplier._id}`}
                                                className="hover:text-primary transition-colors"
                                            >
                                                {supplier.name}
                                            </Link>
                                            <div className="sm:hidden text-[10px] text-muted-foreground">
                                                {supplier.contactPerson}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs">
                                            {supplier.contactPerson}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs">
                                            {supplier.email ? (
                                                <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                                                    {supplier.email}
                                                </a>
                                            ) : (
                                                'N/A'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-medium">{supplier.productsCount}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs">
                                            {supplier.leadTimeDays ? (
                                                <Badge variant="outline" className="text-[10px]">
                                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                                    {supplier.leadTimeDays} days
                                                </Badge>
                                            ) : (
                                                'N/A'
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                            {supplier.createdBy || 'N/A'}
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
                                                                <Link to={`/${rolePrefix}/suppliers/${supplier._id}`} className="cursor-pointer">
                                                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                                                    View Details
                                                                </Link>
                                                            }
                                                        />
                                                        {
                                                            user && (user.role === 'admin' || user.role === 'manager') &&
                                                            <DropdownMenuItem
                                                                render={
                                                                    <Link to={`/${rolePrefix}/suppliers/${supplier._id}/edit`} className="cursor-pointer">
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
                                                                onClick={() => handleDelete(supplier)}
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
                        <span className="font-medium">{Math.min(page * limit, filteredSuppliers.length)}</span>{' '}
                        of <span className="font-medium">{filteredSuppliers.length}</span> results
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
                                        if (page < Math.ceil(filteredSuppliers.length / limit)) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= Math.ceil(filteredSuppliers.length / limit) && 'pointer-events-none opacity-50'
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

export default SuppliersList;