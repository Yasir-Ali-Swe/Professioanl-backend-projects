// pages/products/ProductDetail.jsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
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
    PackageOpen,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    User,
    Building2,
    Mail,
    Phone,
    MapPin,
    Clock,
    Eye,
    Edit,
    Plus,
    Minus,
    Image,
    CheckCircle,
    XCircle,
    Truck,
    Tag,
    ChevronRight,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Dummy Data - Matches API response structure
const dummyProduct = {
    _id: '1',
    name: 'Wireless Mouse',
    sku: 'SKU-001',
    imageUrl: 'https://ui-avatars.com/api/?name=WM&background=6B46C1&color=fff&size=128',
    unit: 'pcs',
    isActive: true,
    needsReorder: false,
    quantity: 45,
    reorderThreshold: 10,
    costPrice: 15,
    sellingPrice: 29.99,
    profitMargin: 14.99,
    profitMarginPercentage: 50.0,
    totalInventoryValue: 675,
    totalSalesValue: 1349.55,
    category: {
        _id: 'c1',
        name: 'Electronics',
        categorySlug: 'electronics',
    },
    supplier: {
        _id: 's1',
        name: 'TechSupply Co.',
        contactPerson: 'John Smith',
        email: 'john@techsupply.com',
        phone: '+1 234 567 8900',
        address: '123 Tech Street, Silicon Valley, CA 94025',
        leadTimeDays: 5,
    },
    createdBy: {
        _id: 'u1',
        name: 'John Doe',
        role: 'admin',
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-07-14T10:30:00Z',
};

// Dummy stock history
const dummyStockHistory = [
    { id: '1', type: 'in', quantity: 20, reason: 'Purchase order fulfilled', performedBy: 'John Doe', date: '2024-07-14T10:30:00Z' },
    { id: '2', type: 'out', quantity: 5, reason: 'Invoice #INV-001', performedBy: 'Jane Smith', date: '2024-07-13T14:20:00Z' },
    { id: '3', type: 'in', quantity: 30, reason: 'Initial stock', performedBy: 'John Doe', date: '2024-01-15T10:30:00Z' },
];

// Dummy forecast
const dummyForecast = {
    predictedDemand: 25,
    daysUntilStockout: 45,
    confidence: 85,
};

// Dummy reorder suggestion
const dummyReorderSuggestion = {
    suggestedQuantity: 20,
    urgency: 'moderate',
    reason: 'Stock below reorder threshold',
};

const ProductDetail = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const { id } = useParams();
    const navigate = useNavigate();
    const [product] = useState(dummyProduct);
    const [stockHistory] = useState(dummyStockHistory);
    const [forecast] = useState(dummyForecast);
    const [reorderSuggestion] = useState(dummyReorderSuggestion);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateShort = (dateString) => {
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
            return { label: 'Low Stock', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
        }
        if (quantity === 0) {
            return { label: 'Out of Stock', className: 'bg-red-500/10 text-destructive border-red-500/20' };
        }
        return { label: 'Healthy', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
    };

    const stockStatus = getStockStatus(product.quantity, product.reorderThreshold);

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 mt-0.5"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {product.name}
                            </h1>
                            <Badge variant={getStatusBadge(product.isActive)} className="text-[10px] sm:text-xs shrink-0">
                                {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {product.needsReorder && (
                                <Badge variant="destructive" className="text-[10px] sm:text-xs shrink-0">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                    Needs Reorder
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                SKU: {product.sku}
                            </p>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex items-center gap-1.5">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <Link
                                    to={`/${rolePrefix}/categories/${product.category?._id}`}
                                    className="text-xs sm:text-sm text-primary hover:underline"
                                >
                                    {product.category?.name || 'N/A'}
                                </Link>
                                <span className="text-[10px] text-muted-foreground">
                                    ({product.category?.categorySlug || 'N/A'})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {
                    user && (user.role === 'admin' || user.role === 'manager') &&
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" asChild>
                            <Link to={`/${rolePrefix}/products/edit/${product._id}`} className="flex items-center">
                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                        Actions
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Stock Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Plus className="mr-2 h-3.5 w-3.5 text-green-500" />
                                        Stock In
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Minus className="mr-2 h-3.5 w-3.5 text-destructive" />
                                        Stock Out
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Product Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Image className="mr-2 h-3.5 w-3.5" />
                                        Upload Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                        {product.isActive ? (
                                            <>
                                                <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-primary" />
                                                Activate
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                }
            </div>

            {/* Product Overview Card - Full Width */}
            <Card>
                <CardContent className="">
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="shrink-0 flex justify-center">
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-32 w-32 rounded-lg object-cover border"
                            />
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Name</p>
                                <p className="text-sm font-medium">{product.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">SKU</p>
                                <p className="text-sm font-medium">{product.sku}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Unit</p>
                                <p className="text-sm font-medium">{product.unit || 'pcs'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Category</p>
                                <Link
                                    to={`/${rolePrefix}/categories/${product.category?._id}`}
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    {product.category?.name || 'N/A'}
                                </Link>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Created By</p>
                                <p className="text-sm font-medium">{product.createdBy?.name} ({product.createdBy?.role})</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last Updated</p>
                                <p className="text-sm font-medium">{formatDate(product.updatedAt)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stock Info + Pricing & Financials */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Stock Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Stock Information</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Current inventory status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Current Quantity</p>
                            <span className="text-lg font-bold">{product.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Reorder Threshold</p>
                            <span className="text-sm font-medium">{product.reorderThreshold}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Stock Status</p>
                            <Badge variant="outline" className={stockStatus.className}>
                                {stockStatus.label}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Needs Reorder</p>
                            {product.needsReorder ? (
                                <Badge variant="destructive" className="text-[10px]">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                    Yes
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                    No
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing & Financials Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm sm:text-base">Pricing & Financials</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Cost and revenue metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Cost Price</p>
                            <span className="text-sm font-medium">${product.costPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Selling Price</p>
                            <span className="text-sm font-medium">${product.sellingPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Profit Margin</p>
                            <span className="text-sm font-medium text-green-500">${product.profitMargin.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Profit Margin %</p>
                            <span className="text-sm font-medium text-green-500">{product.profitMarginPercentage}%</span>
                        </div>
                        <div className="flex items-center justify-between border-b pb-2">
                            <p className="text-xs text-muted-foreground">Total Inventory Value</p>
                            <span className="text-sm font-medium">${product.totalInventoryValue.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Total Sales Value</p>
                            <span className="text-sm font-medium">${product.totalSalesValue.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Supplier Info Card - Same style as Pricing & Financials */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Supplier Information</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Full supplier details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Supplier Name</p>
                        <span className="text-sm font-medium">{product.supplier?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Contact Person</p>
                        <span className="text-sm">{product.supplier?.contactPerson || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a href={`mailto:${product.supplier?.email}`} className="text-sm text-primary hover:underline">
                            {product.supplier?.email || 'N/A'}
                        </a>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <span className="text-sm">{product.supplier?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <span className="text-sm">{product.supplier?.address || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Lead Time (Days)</p>
                        <Badge variant="outline" className="text-[10px]">
                            {product.supplier?.leadTimeDays || 'N/A'} days
                        </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 text-xs" asChild>
                        <Link to={`/${rolePrefix}/suppliers/${product.supplier?._id}`} className="flex items-center">
                            <Truck className="mr-1.5 h-3.5 w-3.5" />
                            View all products from this supplier
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="stock-history" className="space-y-4">
                <TabsList className="sm:w-auto max-w-2xl overflow-x-auto flex-nowrap hide-scrollbar">
                    <TabsTrigger value="stock-history" className="text-xs sm:text-sm whitespace-nowrap">
                        Stock History
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="text-xs sm:text-sm whitespace-nowrap">
                        Forecast
                    </TabsTrigger>
                    <TabsTrigger value="reorder" className="text-xs sm:text-sm whitespace-nowrap">
                        Reorder Suggestions
                    </TabsTrigger>
                </TabsList>

                {/* Stock History Tab */}
                <TabsContent value="stock-history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm sm:text-base">Stock History</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">All stock movements for this product</CardDescription>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 overflow-x-auto">
                            <div className="min-w-125">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="py-2 px-2 text-xs">Type</TableHead>
                                            <TableHead className="py-2 px-2 text-xs">Quantity</TableHead>
                                            <TableHead className="py-2 px-2 text-xs">Reason</TableHead>
                                            <TableHead className="py-2 px-2 text-xs">Performed By</TableHead>
                                            <TableHead className="py-2 px-2 text-xs">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stockHistory.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Badge variant={item.type === 'in' ? 'default' : 'destructive'} className="text-[10px]">
                                                        {item.type === 'in' ? 'Stock In' : 'Stock Out'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{item.reason}</TableCell>
                                                <TableCell className="text-xs">{item.performedBy}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDateShort(item.date)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Forecast Tab */}
                <TabsContent value="forecast">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm sm:text-base">Demand Forecast</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">AI-powered demand prediction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Predicted Demand</p>
                                    <p className="text-2xl font-bold">{forecast.predictedDemand}</p>
                                    <p className="text-[10px] text-muted-foreground">Next 30 days</p>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Days Until Stockout</p>
                                    <p className="text-2xl font-bold">{forecast.daysUntilStockout}</p>
                                    <p className="text-[10px] text-muted-foreground">At current consumption rate</p>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Confidence</p>
                                    <p className="text-2xl font-bold">{forecast.confidence}%</p>
                                    <p className="text-[10px] text-muted-foreground">Model confidence level</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reorder Suggestions Tab */}
                <TabsContent value="reorder">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm sm:text-base">Reorder Suggestions</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">AI-powered reorder recommendations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Suggested Quantity</p>
                                    <p className="text-2xl font-bold">{reorderSuggestion.suggestedQuantity}</p>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Urgency</p>
                                    <Badge
                                        variant={
                                            reorderSuggestion.urgency === 'high' ? 'destructive' :
                                                reorderSuggestion.urgency === 'moderate' ? 'outline' :
                                                    'default'
                                        }
                                        className="text-[10px] mt-1"
                                    >
                                        {reorderSuggestion.urgency?.toUpperCase() || 'N/A'}
                                    </Badge>
                                </div>
                                <div className="rounded-lg border p-4 text-center">
                                    <p className="text-xs text-muted-foreground">Reason</p>
                                    <p className="text-sm font-medium">{reorderSuggestion.reason || 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
};

export default ProductDetail;