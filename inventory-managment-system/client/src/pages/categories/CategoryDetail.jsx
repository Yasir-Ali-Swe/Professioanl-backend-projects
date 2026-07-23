import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useCategoryById, useCategoryProducts } from '@/hooks/useCategory';
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
    Edit,
    Eye,
    Loader2,
} from 'lucide-react';

const CategoryDetail = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: categoryResponse, isLoading: isCategoryLoading, isError: isCategoryError } = useCategoryById(id);
    const { data: productsResponse, isLoading: isProductsLoading, isError: isProductsError } = useCategoryProducts(id);

    const isLoading = isCategoryLoading || isProductsLoading;
    const isError = isCategoryError || isProductsError;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !categoryResponse?.success) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load category details</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const category = categoryResponse.data || {};
    const products = productsResponse?.data || [];

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                                {category.name}
                            </h1>
                            <Badge variant={category.isActive ? 'default' : 'secondary'} className="text-[10px] sm:text-xs shrink-0">
                                {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Slug: {category.categorySlug}
                        </p>
                    </div>
                </div>
                {
                    user && (user.role === 'admin' || user.role === 'manager') &&
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm" asChild>
                            <Link to={`/${rolePrefix}/categories/${category._id}/edit`} className="flex items-center justify-center">
                                <Edit className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                            </Link>
                        </Button>
                    </div>
                }
            </div>

            {/* Category Overview Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Category Overview</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Category details and information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Category Name</p>
                        <p className="text-sm font-medium">{category.name}</p>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Slug</p>
                        <p className="text-sm font-mono">{category.categorySlug}</p>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={category.isActive ? 'default' : 'secondary'} className="text-[10px]">
                            {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Products Count</p>
                        <p className="text-sm font-medium">{products.length}</p>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                        <p className="text-xs text-muted-foreground">Created By</p>
                        <p className="text-sm">{category.createdBy?.name} ({category.createdBy?.role})</p>
                    </div>
                    <div className="flex items-center justify-between pb-2">
                        <p className="text-xs text-muted-foreground">Created At</p>
                        <p className="text-sm">{formatDate(category.createdAt)}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Products in this Category */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm sm:text-base">Products in this Category</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {products.length} products in this category
                            </CardDescription>
                        </div>
                        {
                            user && (user.role === 'admin' || user.role === 'manager') &&
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                <Link to={`/${rolePrefix}/products/add`} className="flex items-center justify-center">
                                    <Package className="mr-1.5 h-3.5 w-3.5" />
                                    Add Product
                                </Link>
                            </Button>
                        }
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 overflow-x-auto">
                    <div className="min-w-125">
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
                                            No products in this category.
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
                                                    <Link to={`/${rolePrefix}/products/${product._id}`}>
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

export default CategoryDetail;