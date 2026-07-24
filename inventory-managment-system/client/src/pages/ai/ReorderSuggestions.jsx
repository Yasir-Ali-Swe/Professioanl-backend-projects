// pages/ai/ReorderSuggestionsPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReorderSuggestions, useApproveReorderSuggestion, useDismissReorderSuggestion } from '@/hooks/useForecast';
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
    ShoppingCart,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    Zap,
    Sparkles,
    Eye,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Dummy Data
const dummySuggestions = [
    {
        _id: 'rs1',
        productId: {
            _id: 'p1',
            name: 'Wireless Mouse',
            sku: 'SKU-001',
            quantity: 8,
            reorderThreshold: 15,
            supplierId: 's1',
            costPrice: 15,
        },
        suggestedQuantity: 50,
        reason: 'Current stock (8 units) is below reorder threshold (15 units). Based on average daily sales of 2.5 units, stock will be depleted in 3.2 days. Reordering 50 units ensures 20 days of buffer stock.',
        status: 'pending',
        createdAt: '2024-07-15T10:30:00Z',
    },
    {
        _id: 'rs2',
        productId: {
            _id: 'p2',
            name: 'USB-C Charger',
            sku: 'SKU-002',
            quantity: 3,
            reorderThreshold: 10,
            supplierId: 's2',
            costPrice: 8,
        },
        suggestedQuantity: 30,
        reason: 'Critical stock level detected. Only 3 units remaining with threshold of 10. Sales velocity has increased 40% in the last week. Reordering 30 units will provide 15 days of coverage.',
        status: 'pending',
        createdAt: '2024-07-14T14:20:00Z',
    },
    {
        _id: 'rs3',
        productId: {
            _id: 'p3',
            name: 'Bluetooth Speaker',
            sku: 'SKU-003',
            quantity: 2,
            reorderThreshold: 5,
            supplierId: 's1',
            costPrice: 25,
        },
        suggestedQuantity: 20,
        reason: 'Stock is critically low (2 units) and below threshold of 5. With current sales rate of 1.2 units per day, stockout will occur in 1.7 days. Reorder 20 units to maintain 16 days of stock.',
        status: 'pending',
        createdAt: '2024-07-13T09:15:00Z',
    },
    {
        _id: 'rs4',
        productId: {
            _id: 'p4',
            name: 'HDMI Cable',
            sku: 'SKU-004',
            quantity: 120,
            reorderThreshold: 20,
            supplierId: 's3',
            costPrice: 3,
        },
        suggestedQuantity: 60,
        reason: 'Stock is healthy but reorder threshold is low. With average daily sales of 3.5 units, current stock will last 34 days. Reordering 60 units will maintain optimal inventory levels.',
        status: 'pending',
        createdAt: '2024-07-12T16:45:00Z',
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

// Suggestion Detail Dialog Component
const SuggestionDetailDialog = ({ suggestion, open, onOpenChange }) => {
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
                            Reorder Suggestion Details
                        </DialogTitle>
                        <Badge variant={suggestion.status === 'pending' ? 'default' : 'secondary'}>
                            {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Generated {getRelativeTime(suggestion.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-3 bg-muted/30">
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

const ReorderSuggestionsPage = () => {
    const navigate = useNavigate();
    const { data: pendingResponse, isLoading: isPendingLoading, isError: isPendingError } = useReorderSuggestions();
    const { data: allResponse } = useReorderSuggestions({ status: 'all' });
    const approveMutation = useApproveReorderSuggestion();
    const dismissMutation = useDismissReorderSuggestion();

    const [processingId, setProcessingId] = useState(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showDismissDialog, setShowDismissDialog] = useState(false);

    if (isPendingLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isPendingError || !pendingResponse?.success) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load reorder suggestions</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const pendingSuggestions = pendingResponse.data || [];
    const allSuggestions = allResponse?.data || [];

    const handleApprove = async (id) => {
        setProcessingId(id);
        try {
            await approveMutation.mutateAsync(id);
            setShowApproveDialog(false);
        } catch (error) {
            // Error handled in hook
        } finally {
            setProcessingId(null);
        }
    };

    const handleDismiss = async (id) => {
        setProcessingId(id);
        try {
            await dismissMutation.mutateAsync(id);
            setShowDismissDialog(false);
        } catch (error) {
            // Error handled in hook
        } finally {
            setProcessingId(null);
        }
    };

    const openDetailDialog = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowDetailDialog(true);
    };

    const openApproveDialog = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowApproveDialog(true);
    };

    const openDismissDialog = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setShowDismissDialog(true);
    };

    const getStockStatus = (quantity, threshold) => {
        if (quantity === 0) return { label: 'Out of Stock', className: 'text-destructive', icon: XCircle };
        if (quantity <= threshold) return { label: 'Low Stock', className: 'text-yellow-500', icon: AlertTriangle };
        return { label: 'Healthy', className: 'text-green-500', icon: CheckCircle };
    };

    const getRelativeTime = (dateString) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Reorder Suggestions</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        AI-powered reorder recommendations to optimize your inventory.
                    </p>
                </div>
                {/* ✅ History Button */}
                <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => navigate('/admin/reorder-suggestions/history')}
                >
                    <History className="mr-2 h-4 w-4" />
                    View History
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            Total Suggestions
                        </CardTitle>
                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{allSuggestions.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            Pending
                        </CardTitle>
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-yellow-500">
                            {pendingSuggestions.length}
                        </div>
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
                            {allSuggestions.filter(s => s.status === 'actioned').length}
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
                            {allSuggestions.filter(s => s.status === 'dismissed').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-50">Product</TableHead>
                                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                                <TableHead className="text-center">Current Stock</TableHead>
                                <TableHead className="text-center">Suggested Qty</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Generated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingSuggestions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle className="h-8 w-8 text-primary opacity-50" />
                                            <p>No pending reorder suggestions.</p>
                                            <p className="text-xs">Great job keeping stock levels healthy!</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pendingSuggestions.map((suggestion) => {
                                    const product = suggestion.productId;
                                    const stockStatus = getStockStatus(product.quantity, product.reorderThreshold);
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
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <stockStatus.icon className={cn("h-3 w-3", stockStatus.className)} />
                                                    <span className={cn("text-xs font-medium", stockStatus.className)}>
                                                        {product.quantity}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        / {product.reorderThreshold}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-bold text-primary">
                                                    {suggestion.suggestedQuantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="default" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                                    Pending
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                {getRelativeTime(suggestion.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => openDetailDialog(suggestion)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => openApproveDialog(suggestion)}
                                                        disabled={processingId === suggestion._id}
                                                    >
                                                        {processingId === suggestion._id ? (
                                                            <Zap className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => openDismissDialog(suggestion)}
                                                        disabled={processingId === suggestion._id}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Dismiss
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* History Section - Removed, now separate page */}

            {/* Suggestion Detail Dialog */}
            <SuggestionDetailDialog
                suggestion={selectedSuggestion}
                open={showDetailDialog}
                onOpenChange={setShowDetailDialog}
            />

            {/* Approve Confirmation Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Reorder Suggestion</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a Purchase Order for <strong>{selectedSuggestion?.suggestedQuantity}</strong> units of{' '}
                            <strong>{selectedSuggestion?.productId?.name}</strong>.
                            <div className="mt-2 p-3 bg-muted text-sm">
                                <p>Product: {selectedSuggestion?.productId?.name} ({selectedSuggestion?.productId?.sku})</p>
                                <p>Current Stock: {selectedSuggestion?.productId?.quantity} units</p>
                                <p>Suggested Order: {selectedSuggestion?.suggestedQuantity} units</p>
                                <p className="text-xs text-muted-foreground mt-1">A purchase order will be created automatically.</p>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">Continue with approval?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleApprove(selectedSuggestion?._id)}>
                            Approve & Create PO
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dismiss Confirmation Dialog */}
            <AlertDialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Dismiss Reorder Suggestion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to dismiss this reorder suggestion for{' '}
                            <strong>{selectedSuggestion?.productId?.name}</strong>?
                            <div className="mt-2 p-3 bg-muted text-sm">
                                <p>Suggested Quantity: {selectedSuggestion?.suggestedQuantity} units</p>
                                <p className="text-xs text-muted-foreground mt-1">This suggestion will be removed from your list.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDismiss(selectedSuggestion?._id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Dismiss
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default ReorderSuggestionsPage;