// pages/ai/Anomalies.jsx
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAnomalies, useResolveAnomaly, useRunAnomalyDetection } from '@/hooks/useAnomaly';
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    AlertTriangle,
    Search,
    CheckCircle,
    Filter,
    ChevronDown,
    Eye,
    MoreVertical,
    RefreshCw,
    Package,
    Clock,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    XCircle,
    Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Type configuration
const typeConfig = {
    dead_stock: { label: 'Dead Stock', icon: XCircle, color: 'text-gray-500' },
    sales_spike: { label: 'Sales Spike', icon: TrendingUp, color: 'text-blue-500' },
    suspicious_adjustment: { label: 'Suspicious Adjustment', icon: AlertCircle, color: 'text-orange-500' },
    unusual_return: { label: 'Unusual Return', icon: TrendingDown, color: 'text-purple-500' },
};

// Severity configuration
const severityConfig = {
    high: { label: 'High', className: 'bg-red-500/10 text-destructive border-red-500/20' },
    medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    low: { label: 'Low', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
};

// Dummy images for products
const productImages = {
    'SKU-001': 'https://ui-avatars.com/api/?name=WM&background=6B46C1&color=fff&size=40',
    'SKU-002': 'https://ui-avatars.com/api/?name=UC&background=6B46C1&color=fff&size=40',
    'SKU-003': 'https://ui-avatars.com/api/?name=BS&background=6B46C1&color=fff&size=40',
    'SKU-004': 'https://ui-avatars.com/api/?name=HC&background=6B46C1&color=fff&size=40',
    'SKU-005': 'https://ui-avatars.com/api/?name=WK&background=6B46C1&color=fff&size=40',
};

// Anomaly Detail Dialog Component
const AnomalyDetailDialog = ({ anomaly, open, onOpenChange }) => {
    if (!anomaly) return null;

    const product = anomaly.product || anomaly.productId || {};
    const imageUrl = productImages[product.sku] || product.imageUrl ||
        `https://ui-avatars.com/api/?name=${(product.name || 'U').charAt(0)}&background=6B46C1&color=fff&size=80`;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getSeverityConfig = (severity) => {
        return severityConfig[severity] || severityConfig.low;
    };

    const getTypeConfig = (type) => {
        return typeConfig[type] || typeConfig.dead_stock;
    };

    const severityBadge = getSeverityConfig(anomaly.severity);
    const TypeIcon = getTypeConfig(anomaly.type).icon;
    const typeLabel = getTypeConfig(anomaly.type).label;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            Anomaly Details
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Badge className={severityBadge.className}>
                                {severityBadge.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                                <TypeIcon className="h-2.5 w-2.5 mr-1" />
                                {typeLabel}
                            </Badge>
                            {anomaly.isResolved && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                    Resolved
                                </Badge>
                            )}
                        </div>
                    </div>
                    <DialogDescription>
                        Detected {formatDistanceToNow(new Date(anomaly.createdAt), { addSuffix: true })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-3 bg-muted/30">
                        <img
                            src={imageUrl}
                            alt={product.name || 'Product'}
                            className="h-12 w-12 object-cover border"
                        />
                        <div>
                            <p className="text-sm font-medium">{product.name || 'Deleted Product'}</p>
                            <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">Stock: {product.quantity ?? 0}</span>
                                <span className="text-xs text-muted-foreground">Price: ${product.sellingPrice ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="border p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{anomaly.description}</p>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium">{typeLabel}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Severity</p>
                            <p className="font-medium capitalize">{anomaly.severity}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-medium">{anomaly.isResolved ? 'Resolved' : 'Unresolved'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Detected</p>
                            <p className="font-medium">{formatDate(anomaly.createdAt)}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AnomaliesPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: response, isLoading, isError } = useAnomalies({ resolved: 'all', limit: 1000 });
    const resolveMutation = useResolveAnomaly();
    const runDetectionMutation = useRunAnomalyDetection();

    const [selectedAnomaly, setSelectedAnomaly] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);
    const [runningDetection, setRunningDetection] = useState(false);
    const [resolutionNote, setResolutionNote] = useState(''); // ✅ ADDED: State for resolution note

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const severity = searchParams.get('severity') || 'all';
    const type = searchParams.get('type') || 'all';
    const resolved = searchParams.get('resolved') || 'false';

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
                <p className="text-destructive font-medium">Failed to load AI anomalies</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const anomalies = response.data || [];
    const summary = response.summary || {
        total: 0,
        unresolved: 0,
        resolved: 0,
        bySeverity: { high: 0, medium: 0, low: 0 }
    };
    const pagination = response.pagination || { totalPages: 1 };

    // Filter anomalies
    const filteredAnomalies = anomalies.filter(a => {
        const prod = a.product || a.productId || {};
        const matchesSearch = (prod.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (prod.sku || '').toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severity === 'all' || a.severity === severity;
        const matchesType = type === 'all' || a.type === type;
        const matchesResolved = resolved === 'all' || a.isResolved === (resolved === 'true');
        return matchesSearch && matchesSeverity && matchesType && matchesResolved;
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

    const getRelativeTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    const getTypeConfig = (type) => {
        return typeConfig[type] || typeConfig.dead_stock;
    };

    const getSeverityConfig = (severity) => {
        return severityConfig[severity] || severityConfig.low;
    };

    const handleResolve = async (anomaly) => {
        setSelectedAnomaly(anomaly);
        setResolutionNote(''); // Clear previous note
        setShowResolveDialog(true);
    };

    // ✅ UPDATED: Send resolutionNote in the request body
    const confirmResolve = async () => {
        if (!selectedAnomaly) return;

        setResolvingId(selectedAnomaly._id);
        try {
            await resolveMutation.mutateAsync({
                id: selectedAnomaly._id,
                resolutionNote: resolutionNote.trim() || 'No additional notes provided'
            });
            setShowResolveDialog(false);
            setResolutionNote(''); // Clear after resolve
            toast.success('Anomaly resolved successfully');
        } catch (error) {
            // error is handled in hook
            toast.error(error?.message || 'Failed to resolve anomaly');
        } finally {
            setResolvingId(null);
        }
    };

    const handleRunDetection = async () => {
        setRunningDetection(true);
        try {
            await runDetectionMutation.mutateAsync();
            toast.success('Anomaly detection completed successfully');
        } catch (error) {
            // error is handled in hook
            toast.error(error?.message || 'Failed to run anomaly detection');
        } finally {
            setRunningDetection(false);
        }
    };

    const openDetailDialog = (anomaly) => {
        setSelectedAnomaly(anomaly);
        setShowDetailDialog(true);
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

    const paginatedAnomalies = filteredAnomalies.slice(
        (page - 1) * limit,
        page * limit
    );

    // Summary stats
    const totalAnomalies = summary.total;
    const unresolvedCount = summary.unresolved;
    const resolvedCount = summary.resolved;
    const highCount = summary.bySeverity.high || 0;
    const mediumCount = summary.bySeverity.medium || 0;
    const lowCount = summary.bySeverity.low || 0;

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Anomalies Detection</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Monitor and resolve inventory anomalies automatically detected by AI.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={handleRunDetection}
                    disabled={runningDetection}
                >
                    <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", runningDetection && "animate-spin")} />
                    {runningDetection ? 'Running Detection...' : 'Run Detection'}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Anomalies</CardTitle>
                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{totalAnomalies}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Unresolved</CardTitle>
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">{unresolvedCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Need attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Resolved</CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">{resolvedCount}</div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">By Severity</CardTitle>
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[8px] bg-red-500/10 text-red-500 border-red-500/20 px-1">
                                H: {highCount}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-1">
                                M: {mediumCount}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] bg-gray-500/10 text-gray-500 border-gray-500/20 px-1">
                                L: {lowCount}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">
                            {highCount + mediumCount + lowCount}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Unresolved by severity</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by product name or SKU..."
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
                                Severity: {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Severity</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('severity', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('severity', 'high')}>
                                <span className="h-2 w-2 bg-destructive mr-2" />
                                High
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('severity', 'medium')}>
                                <span className="h-2 w-2 bg-yellow-500 mr-2" />
                                Medium
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('severity', 'low')}>
                                <span className="h-2 w-2 bg-gray-500 mr-2" />
                                Low
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Type: {type === 'all' ? 'All' : typeConfig[type]?.label || 'Unknown'}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('type', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('type', 'dead_stock')}>
                                <XCircle className="mr-2 h-3.5 w-3.5 text-gray-500" />
                                Dead Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('type', 'sales_spike')}>
                                <TrendingUp className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Sales Spike
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('type', 'suspicious_adjustment')}>
                                <AlertCircle className="mr-2 h-3.5 w-3.5 text-orange-500" />
                                Suspicious Adjustment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('type', 'unusual_return')}>
                                <TrendingDown className="mr-2 h-3.5 w-3.5 text-purple-500" />
                                Unusual Return
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Status: {resolved === 'all' ? 'All' : resolved === 'true' ? 'Resolved' : 'Unresolved'}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('resolved', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('resolved', 'false')}>
                                <AlertCircle className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                                Unresolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('resolved', 'true')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                                Resolved
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {(search || severity !== 'all' || type !== 'all' || resolved !== 'false') && (
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
                                <TableHead className="min-w-50">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="text-center">Stock</TableHead>
                                <TableHead className="min-w-35">Event</TableHead>
                                <TableHead className="text-center">Severity</TableHead>
                                <TableHead className="hidden lg:table-cell">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Detected</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAnomalies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
                                            <p>No anomalies found.</p>
                                            <p className="text-xs">Everything looks normal.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedAnomalies.map((anomaly) => {
                                    const TypeIcon = getTypeConfig(anomaly.type).icon;
                                    const typeLabel = getTypeConfig(anomaly.type).label;
                                    const severityBadge = getSeverityConfig(anomaly.severity);
                                    const imageUrl = productImages[anomaly.productId.sku] ||
                                        'https://ui-avatars.com/api/?name=Unknown&background=6B46C1&color=fff&size=40';

                                    return (
                                        <TableRow key={anomaly._id} className={cn(
                                            anomaly.isResolved && "opacity-60"
                                        )}>
                                            <TableCell>
                                                {(() => {
                                                    const prod = anomaly.product || anomaly.productId || {};
                                                    const imageUrl = productImages[prod.sku] || prod.imageUrl ||
                                                        'https://ui-avatars.com/api/?name=Unknown&background=6B46C1&color=fff&size=40';
                                                    return (
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={imageUrl}
                                                                alt={prod.name || 'Product'}
                                                                className="h-8 w-8 object-cover border"
                                                            />
                                                            <span className="text-xs sm:text-sm font-medium truncate max-w-32 sm:max-w-48">
                                                                {prod.name || 'Deleted Product'}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                                {(() => {
                                                    const prod = anomaly.product || anomaly.productId || {};
                                                    return prod.sku || 'N/A';
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(() => {
                                                    const prod = anomaly.product || anomaly.productId || {};
                                                    return (
                                                        <span className={cn(
                                                            "text-xs font-medium",
                                                            prod.quantity === 0 ? "text-destructive" :
                                                                prod.quantity <= 10 ? "text-yellow-500" :
                                                                    "text-green-500"
                                                        )}>
                                                            {prod.quantity ?? 0}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <TypeIcon className={cn("h-3 w-3", typeConfig[anomaly.type]?.color)} />
                                                    <span className="text-xs">{typeLabel}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={severityBadge.className}>
                                                    {severityBadge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                {anomaly.isResolved ? (
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                                        Resolved
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                                        Unresolved
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {getRelativeTime(anomaly.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => openDetailDialog(anomaly)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {!anomaly.isResolved && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                                            onClick={() => handleResolve(anomaly)}
                                                            disabled={resolvingId === anomaly._id}
                                                        >
                                                            {resolvingId === anomaly._id ? (
                                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            render={
                                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </Button>
                                                            }
                                                        />
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuItem
                                                                    render={
                                                                        (() => {
                                                                            const prod = anomaly.product || anomaly.productId || {};
                                                                            return prod._id ? (
                                                                                <Link to={`/admin/products/${prod._id}`} className="cursor-pointer">
                                                                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                                                                    View Product
                                                                                </Link>
                                                                            ) : null;
                                                                        })()
                                                                    }
                                                                />
                                                                <DropdownMenuItem
                                                                    className="cursor-pointer"
                                                                    onClick={() => openDetailDialog(anomaly)}
                                                                >
                                                                    <AlertCircle className="mr-2 h-3.5 w-3.5" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                {!anomaly.isResolved && (
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-green-500 focus:text-green-500"
                                                                        onClick={() => handleResolve(anomaly)}
                                                                    >
                                                                        <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                                                        Mark as Resolved
                                                                    </DropdownMenuItem>
                                                                )}
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
                {filteredAnomalies.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                        <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(page * limit, filteredAnomalies.length)}</span>{' '}
                            of <span className="font-medium">{filteredAnomalies.length}</span> results
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
                )}
            </div>

            {/* Anomaly Detail Dialog */}
            <AnomalyDetailDialog
                anomaly={selectedAnomaly}
                open={showDetailDialog}
                onOpenChange={setShowDetailDialog}
            />

            {/* ✅ UPDATED: Resolve Confirmation Dialog with Resolution Note Textarea */}
            <AlertDialog
                open={showResolveDialog}
                onOpenChange={(open) => {
                    setShowResolveDialog(open);
                    if (!open) setResolutionNote(''); // Clear note when dialog closes
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resolve Anomaly</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to mark this anomaly as resolved?
                            {selectedAnomaly && (
                                <div className="mt-2 p-3 bg-muted text-left">
                                    <p className="text-sm font-medium">
                                        {(selectedAnomaly.product || selectedAnomaly.productId)?.name || 'Deleted Product'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{selectedAnomaly.description}</p>
                                </div>
                            )}

                            {/* ✅ ADDED: Resolution Note Textarea */}
                            <div className="mt-4 text-left">
                                <label className="text-sm font-medium">Resolution Note (Optional)</label>
                                <textarea
                                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                    placeholder="Add a note about how this anomaly was resolved..."
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Optional: Provide additional context about the resolution
                                </p>
                            </div>

                            <p className="mt-2 text-xs text-muted-foreground">
                                This action will move the anomaly to the resolved list.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResolutionNote('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmResolve}>
                            Resolve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AnomaliesPage;