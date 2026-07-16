// pages/suppliers/SupplierDetail.jsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    ArrowLeft,
    Package,
    Truck,
    User,
    Mail,
    Phone,
    MapPin,
    Clock,
    Eye,
    Edit,
    Calendar,
    Building2,
} from 'lucide-react';

// Dummy Supplier Data
const dummySupplier = {
    _id: 's1',
    name: 'TechSupply Co.',
    contactPerson: 'John Smith',
    email: 'john@techsupply.com',
    phone: '+1 234 567 8900',
    address: '123 Tech Street, Silicon Valley, CA 94025',
    leadTimeDays: 5,
    createdBy: 'John Doe (admin)',
    createdAt: '2024-01-15T10:30:00Z',
};

// Dummy Products from this supplier
const dummyProducts = [
    { _id: 'p1', name: 'Wireless Mouse', sku: 'SKU-001', quantity: 45, sellingPrice: 29.99, isActive: true },
    { _id: 'p2', name: 'USB-C Charger', sku: 'SKU-002', quantity: 8, sellingPrice: 19.99, isActive: true },
    { _id: 'p3', name: 'Bluetooth Speaker', sku: 'SKU-003', quantity: 2, sellingPrice: 49.99, isActive: false },
];

const SupplierDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplier] = useState(dummySupplier);
    const [products] = useState(dummyProducts);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        onClick={() => navigate('/admin/suppliers')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {supplier.name}
                            </h1>
                            {supplier.leadTimeDays && (
                                <Badge variant="outline" className="text-[10px] sm:text-xs">
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                    {supplier.leadTimeDays} days lead time
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Contact: {supplier.contactPerson}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" asChild>
                        <Link to={`/admin/suppliers/${supplier._id}/edit`} className="flex items-center justify-center">
                            <Edit className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Supplier Overview Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Supplier Overview</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Supplier details and contact information</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Supplier Name</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{supplier.name}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Contact Person</p>
                            <div className="flex items-center gap-2 mt-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{supplier.contactPerson}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {supplier.email ? (
                                    <a href={`mailto:${supplier.email}`} className="text-sm text-primary hover:underline">
                                        {supplier.email}
                                    </a>
                                ) : (
                                    <p className="text-sm text-muted-foreground">N/A</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{supplier.phone}</p>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <p className="text-xs text-muted-foreground">Address</p>
                            <div className="flex items-start gap-2 mt-1">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <p className="text-sm">{supplier.address}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Lead Time</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Created By</p>
                            <p className="text-sm">{supplier.createdBy || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Created At</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{formatDate(supplier.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products from this Supplier */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm sm:text-base">Products from this Supplier</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {products.length} products supplied by {supplier.name}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                            <Link to="/admin/products/add" className="flex items-center justify-center">
                                <Package className="mr-1.5 h-3.5 w-3.5" />
                                Add Product
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 overflow-x-auto">
                    <div className="min-w-[500px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 px-2 text-xs">Product Name</TableHead>
                                    <TableHead className="py-2 px-2 text-xs">SKU</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-center">Quantity</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-right">Price</TableHead>
                                    <TableHead className="py-2 px-2 text-xs">Status</TableHead>
                                    <TableHead className="py-2 px-2 text-xs text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                            No products from this supplier.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product._id}>
                                            <TableCell className="py-2 px-2 text-xs font-medium">
                                                {product.name}
                                            </TableCell>
                                            <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                                {product.sku}
                                            </TableCell>
                                            <TableCell className="py-2 px-2 text-xs text-center">
                                                {product.quantity}
                                            </TableCell>
                                            <TableCell className="py-2 px-2 text-xs text-right font-medium">
                                                ${product.sellingPrice.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="py-2 px-2">
                                                <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                                    {product.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2 px-2 text-right">
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                                    <Link to={`/admin/products/${product._id}`}>
                                                        <Eye className="h-3 w-3" />
                                                    </Link>
                                                </Button>
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
    );
};

export default SupplierDetail;