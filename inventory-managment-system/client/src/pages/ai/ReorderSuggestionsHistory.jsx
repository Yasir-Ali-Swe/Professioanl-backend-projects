// pages/ai/ReorderSuggestionsHistory.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReorderSuggestions } from '@/hooks/useForecast';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    Sparkles,
    Eye,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Dummy Data - History Items
const dummyHistory = [
    {
        _id: 'rs5',
        productId: {
            _id: 'p5',
            name: 'Wireless Keyboard',
            sku: 'SKU-005',
            quantity: 15,
            reorderThreshold: 12,
            supplierId: 's1',
            costPrice: 30,
        },
        suggestedQuantity: 40,
        reason: 'Stock is approaching reorder threshold. With average daily sales of 1.8 units, current stock will last 8 days. Reordering 40 units will maintain optimal inventory levels.',
        status: 'actioned',
        createdAt: '2024-07-10T10:30:00Z',
    },
    {
        _id: 'rs6',
        productId: {
            _id: 'p6',
            name: 'HDMI Cable',
            sku: 'SKU-004',
            quantity: 120,
            reorderThreshold: 20,
            supplierId: 's3',
            costPrice: 3,
        },
        suggestedQuantity: 0,
        reason: 'Stock levels are healthy (120 units) and above reorder threshold (20 units). No reorder needed at this time.',
        status: 'dismissed',
        createdAt: '2024-07-09T14:20:00Z',
    },
    {
        _id: 'rs7',
        productId: {
            _id: 'p7',
            name: 'Bluetooth Speaker',
            sku: 'SKU-003',
            quantity: 2,
            reorderThreshold: 5,
            supplierId: 's1',
            costPrice: 25,
        },
        suggestedQuantity: 20,
        reason: 'Stock is critically low (2 units) and below threshold of 5. With current sales rate of 1.2 units per day, stockout will occur in 1.7 days. Reorder 20 units to maintain 16 days of stock.',
        status: 'actioned',
        createdAt: '2024-07-08T09:15:00Z',
    },
    {
        _id: 'rs8',
        productId: {
            _id: 'p8',
            name: 'USB-C Charger',
            sku: 'SKU-002',
            quantity: 3,
            reorderThreshold: 10,
            supplierId: 's2',
            costPrice: 8,
        },
        suggestedQuantity: 30,
        reason: 'Critical stock level detected. Only 3 units remaining with threshold of 10. Sales velocity has increased 40% in the last week. Reordering 30 units will provide 15 days of coverage.',
        status: 'dismissed',
        createdAt: '2024-07-07T16:45:00Z',
    },
];

// Dummy images for products
const productImages = {
    'SKU-001': 'https://ui-avatars.com/api/?name=WM&background=6B46C1&color=fff&size=40',
    'SKU-002': 'https://ui-avatars.com/api/?name=UC&background=6B46C1&color=fff&size=40',
    'SKU-003': 'https://ui-avatars.com/api/?name=BS&background=6B46C1&color=fff&size=40',
    'SKU-004': 'https://ui-avatars.com/api/?name=HC&background=6B46C1&color=fff&size=40',
    'SKU-005': 'https://ui-avatars.com/api/?name=WK&background=6B46C1&color=fff&size=40',
};

// History Detail Dialog Component
const HistoryDetailDialog = ({ suggestion, open, onOpenChange }) => {
    if (!suggestion) return null;

    const product = suggestion.productId;
    const imageUrl = productImages[product.sku] ||
        `https://ui-avatars.com/api/?name=${product.name.charAt(0)}&background=6B46C1&color=fff&size=80`;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRelativeTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            Suggestion Details
                        </DialogTitle>
                        <Badge variant={suggestion.status === 'actioned' ? 'default' : 'secondary'}>
                            {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Generated {getRelativeTime(suggestion.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-3 bg-muted/30 ">
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-12 w-12 object-cover border"
                        />
                        <div>
                            <p className="text-sm font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">Current Stock: {product.quantity}</span>
                                <span className="text-xs text-muted-foreground">Threshold: {product.reorderThreshold}</span>
                            </div>
                        </div>
                    </div>

                    {/* Suggested Quantity */}
                    <div className="bg-primary/5 border border-primary/20 p-3">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground">Suggested Reorder Quantity</p>
                                <p className="text-2xl font-bold text-primary">{suggestion.suggestedQuantity} units</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="border p-4">
                        <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
                                <p className="text-sm leading-relaxed">{suggestion.reason}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="font-medium capitalize">{suggestion.status}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Generated</p>
                            <p className="font-medium">{formatDate(suggestion.createdAt)}</p>
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

const ReorderSuggestionsHistory = () => {
    const navigate = useNavigate();
    const { data: response, isLoading, isError } = useReorderSuggestions({ status: 'all' });
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

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
                <p className="text-destructive font-medium">Failed to load suggestion history</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const history = (response.data || []).filter(s => s.status !== 'pending');

    const getRelativeTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    const openDetailDialog = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowDetailDialog(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reorder Suggestions History</h1>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            View all previously actioned and dismissed reorder suggestions.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            Total History
                        </CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{history.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            Actioned
                        </CardTitle>
                        <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            {history.filter(s => s.status === 'actioned').length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            Dismissed
                        </CardTitle>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-muted-foreground">
                            {history.filter(s => s.status === 'dismissed').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-50">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="text-center">Suggested Qty</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Generated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
                                            <p>No history found.</p>
                                            <p className="text-xs">All suggestions will appear here once actioned or dismissed.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((suggestion) => {
                                    const product = suggestion.productId;
                                    const imageUrl = productImages[product.sku] ||
                                        `https://ui-avatars.com/api/?name=${product.name.charAt(0)}&background=6B46C1&color=fff&size=40`;

                                    return (
                                        <TableRow key={suggestion._id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.name}
                                                        className="h-8 w-8 object-cover border"
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium truncate max-w-32 sm:max-w-48">
                                                        {product.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                                {product.sku}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-bold text-primary">
                                                    {suggestion.suggestedQuantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={suggestion.status === 'actioned' ? 'default' : 'secondary'}
                                                    className="text-[10px]"
                                                >
                                                    {suggestion.status === 'actioned' ? (
                                                        <>
                                                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                                            Actioned
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="h-2.5 w-2.5 mr-1" />
                                                            Dismissed
                                                        </>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {getRelativeTime(suggestion.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => openDetailDialog(suggestion)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Detail Dialog */}
            <HistoryDetailDialog
                suggestion={selectedSuggestion}
                open={showDetailDialog}
                onOpenChange={setShowDetailDialog}
            />
        </div>
    );
};

export default ReorderSuggestionsHistory;