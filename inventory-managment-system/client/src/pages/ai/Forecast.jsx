// pages/ai/ForecastPage.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAllForecasts, useRefreshForecast } from '@/hooks/useForecast';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
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
    Search,
    Filter,
    ChevronDown,
    RefreshCw,
    Clock,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    MoreVertical,
    Eye,
    Package,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Dummy Data
const dummyForecasts = [
    {
        _id: 'f1',
        productId: {
            _id: 'p1',
            name: 'Wireless Mouse',
            sku: 'SKU-001',
            quantity: 45,
            reorderThreshold: 10,
        },
        predictedDemand: 25,
        forecastPeriod: '30_days',
        daysUntilStockout: 45,
        confidence: 0.85,
        modelUsed: 'moving_average',
        createdAt: '2024-07-15T10:30:00Z',
    },
    {
        _id: 'f2',
        productId: {
            _id: 'p2',
            name: 'USB-C Charger',
            sku: 'SKU-002',
            quantity: 8,
            reorderThreshold: 15,
        },
        predictedDemand: 15,
        forecastPeriod: '30_days',
        daysUntilStockout: 5,
        confidence: 0.72,
        modelUsed: 'moving_average',
        createdAt: '2024-07-14T14:20:00Z',
    },
    {
        _id: 'f3',
        productId: {
            _id: 'p3',
            name: 'Bluetooth Speaker',
            sku: 'SKU-003',
            quantity: 2,
            reorderThreshold: 5,
        },
        predictedDemand: 8,
        forecastPeriod: '30_days',
        daysUntilStockout: 3,
        confidence: 0.65,
        modelUsed: 'moving_average',
        createdAt: '2024-07-13T09:15:00Z',
    },
    {
        _id: 'f4',
        productId: {
            _id: 'p4',
            name: 'HDMI Cable',
            sku: 'SKU-004',
            quantity: 120,
            reorderThreshold: 20,
        },
        predictedDemand: 10,
        forecastPeriod: '30_days',
        daysUntilStockout: null,
        confidence: 0.92,
        modelUsed: 'moving_average',
        createdAt: '2024-07-12T16:45:00Z',
    },
    {
        _id: 'f5',
        productId: {
            _id: 'p5',
            name: 'Wireless Keyboard',
            sku: 'SKU-005',
            quantity: 15,
            reorderThreshold: 12,
        },
        predictedDemand: 18,
        forecastPeriod: '30_days',
        daysUntilStockout: 10,
        confidence: 0.45,
        modelUsed: 'moving_average',
        createdAt: '2024-07-11T11:00:00Z',
    },
];

// Dummy images for products
const productImages = {
    'SKU-001': 'https://ui-avatars.com/api/?name=WM&background=6B46C1&color=fff&size=64',
    'SKU-002': 'https://ui-avatars.com/api/?name=UC&background=6B46C1&color=fff&size=64',
    'SKU-003': 'https://ui-avatars.com/api/?name=BS&background=6B46C1&color=fff&size=64',
    'SKU-004': 'https://ui-avatars.com/api/?name=HC&background=6B46C1&color=fff&size=64',
    'SKU-005': 'https://ui-avatars.com/api/?name=WK&background=6B46C1&color=fff&size=64',
};

const ForecastPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: response, isLoading, isError } = useAllForecasts();
    const refreshForecastMutation = useRefreshForecast();
    const [refreshingAll, setRefreshingAll] = useState(false);

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
                <p className="text-destructive font-medium">Failed to load AI demand forecasts</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const forecasts = response.data || [];

    // Filter forecasts by search
    const filteredForecasts = forecasts.filter(f =>
        f.productId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        f.productId?.sku?.toLowerCase().includes(search.toLowerCase())
    );

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

    // Format relative time
    const getRelativeTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    // Get confidence badge variant
    const getConfidenceBadge = (confidence) => {
        if (confidence >= 0.7) {
            return { label: 'High', className: 'bg-green-500/10 text-green-500 border-green-500/20' };
        } else if (confidence >= 0.4) {
            return { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
        } else {
            return { label: 'Low', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
        }
    };

    // Get days until stockout color
    const getStockoutColor = (days) => {
        if (days === null) return 'text-muted-foreground';
        if (days < 7) return 'text-destructive';
        if (days < 14) return 'text-yellow-500';
        return 'text-green-500';
    };

    // Handle refresh forecast
    const handleRefreshForecast = async (productId) => {
        try {
            await refreshForecastMutation.mutateAsync(productId);
        } catch (error) {
            // Error toast is already handled in the hook
        }
    };

    const handleRefreshAll = async () => {
        if (filteredForecasts.length === 0) return;
        setRefreshingAll(true);
        const toastId = toast.loading('Refreshing all forecasts...');
        try {
            await Promise.all(
                filteredForecasts.map(f =>
                    f.productId?._id ? refreshForecastMutation.mutateAsync(f.productId._id) : Promise.resolve()
                )
            );
            toast.success('All forecasts refreshed successfully!', { id: toastId });
        } catch (error) {
            toast.error('Failed to refresh some forecasts.', { id: toastId });
        } finally {
            setRefreshingAll(false);
        }
    };

    const getPageNumbers = () => {
        const total = Math.ceil(filteredForecasts.length / limit);
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

    const paginatedForecasts = filteredForecasts.slice(
        (page - 1) * limit,
        page * limit
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Demand Forecast</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        AI-predicted demand and stockout timing for your products.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={handleRefreshAll}
                    disabled={refreshingAll || filteredForecasts.length === 0}
                >
                    <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshingAll && "animate-spin")} />
                    {refreshingAll ? 'Refreshing All...' : 'Refresh All'}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Products</CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{filteredForecasts.length}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">With forecasts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">High Confidence</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            {filteredForecasts.filter(f => f.confidence >= 0.7).length}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round((filteredForecasts.filter(f => f.confidence >= 0.7).length / filteredForecasts.length) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Low Stock Risk</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">
                            {filteredForecasts.filter(f => f.daysUntilStockout !== null && f.daysUntilStockout < 14).length}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Under 14 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Critical Stock</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-destructive">
                            {filteredForecasts.filter(f => f.daysUntilStockout !== null && f.daysUntilStockout < 7).length}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Under 7 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by product name or SKU..."
                        value={search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-8 h-8 sm:h-9 text-xs sm:text-sm max-w-80"
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
                                <TableHead className="min-w-55">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="text-center">Predicted Demand</TableHead>
                                <TableHead className="text-center">Days Until Stockout</TableHead>
                                <TableHead className="text-center">Confidence</TableHead>
                                <TableHead className="hidden md:table-cell">Model</TableHead>
                                <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedForecasts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Zap className="h-8 w-8 text-muted-foreground opacity-50" />
                                            <p>No forecasts generated yet.</p>
                                            <p className="text-xs">Forecasts run automatically every night.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedForecasts.map((forecast) => {
                                    const confidenceBadge = getConfidenceBadge(forecast.confidence);
                                    const stockoutColor = getStockoutColor(forecast.daysUntilStockout);
                                    const imageUrl = productImages[forecast.productId.sku] ||
                                        'https://ui-avatars.com/api/?name=Unknown&background=6B46C1&color=fff&size=64';

                                    return (
                                        <TableRow key={forecast._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={imageUrl}
                                                        alt={forecast.productId?.name || 'Product'}
                                                        className="h-8 w-8 object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-xs sm:text-sm font-medium truncate max-w-32 sm:max-w-48">
                                                            {forecast.productId?.name || 'Deleted Product'}
                                                        </p>
                                                        <p className="sm:hidden text-[10px] text-muted-foreground">
                                                            {forecast.productId?.sku || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                                {forecast.productId?.sku || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        {forecast.predictedDemand}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        units
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {forecast.daysUntilStockout !== null ? (
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        stockoutColor
                                                    )}>
                                                        {forecast.daysUntilStockout} days
                                                        {forecast.daysUntilStockout < 7 && (
                                                            <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        Insufficient data
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={confidenceBadge.className}>
                                                    {Math.round(forecast.confidence * 100)}%
                                                    <span className="ml-1 text-[10px]">
                                                        ({confidenceBadge.label})
                                                    </span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {forecast.modelUsed?.replace(/_/g, ' ') || 'N/A'}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                                {getRelativeTime(forecast.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 sm:h-8 sm:w-8"
                                                        onClick={() => forecast.productId?._id && handleRefreshForecast(forecast.productId._id)}
                                                        disabled={refreshForecastMutation.isPending}
                                                    >
                                                        <RefreshCw className={cn(
                                                            "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                                            refreshForecastMutation.isPending && "animate-spin"
                                                        )} />
                                                    </Button>
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
                                                                        forecast.productId?._id ? (
                                                                            <Link to={`/admin/products/${forecast.productId._id}`} className="cursor-pointer">
                                                                                <Eye className="mr-2 h-3.5 w-3.5" />
                                                                                View Product
                                                                            </Link>
                                                                        ) : null
                                                                    }
                                                                />
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer"
                                                                    onClick={() => forecast.productId?._id && handleRefreshForecast(forecast.productId._id)}
                                                                >
                                                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                                                    Refresh Forecast
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                {filteredForecasts.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                        <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(page * limit, filteredForecasts.length)}</span>{' '}
                            of <span className="font-medium">{filteredForecasts.length}</span> results
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
                                            if (page < Math.ceil(filteredForecasts.length / limit)) updateFilter('page', page + 1);
                                        }}
                                        className={cn(
                                            'h-8 sm:h-9 text-xs sm:text-sm',
                                            page >= Math.ceil(filteredForecasts.length / limit) && 'pointer-events-none opacity-50'
                                        )}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForecastPage;