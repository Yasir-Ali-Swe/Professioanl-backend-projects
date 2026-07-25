// // pages/ai/InsightsPage.jsx
// import { useState } from 'react';
// import { useLatestInsight, useInsightsHistory, useGenerateInsightNow } from '@/hooks/useInsights';
// import { Loader2 } from 'lucide-react';
// import { Link } from 'react-router-dom';
// import {
//     Card,
//     CardContent,
//     CardHeader,
//     CardTitle,
//     CardDescription,
// } from '@/components/ui/card';
// import {
//     Table,
//     TableBody,
//     TableCell,
//     TableHead,
//     TableHeader,
//     TableRow,
// } from '@/components/ui/table';
// import {
//     Dialog,
//     DialogClose,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
// } from '@/components/ui/dialog';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//     Lightbulb,
//     TrendingUp,
//     TrendingDown,
//     DollarSign,
//     ShoppingCart,
//     Package,
//     Calendar,
//     Clock,
//     Sparkles,
//     RefreshCw,
//     Zap,
//     Eye,
// } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { toast } from 'sonner';
// import { formatDistanceToNow, format } from 'date-fns';

// // Dummy Data
// const dummyInsight = {
//     _id: 'ins_1',
//     period: 'weekly',
//     summary: 'This week showed strong performance with total revenue reaching $12,450, a 15% increase from last week. The top-selling product was the Wireless Mouse with 89 units sold, while the USB-C Charger showed declining sales with only 12 units moved. Inventory turnover improved to 3.2x, indicating better stock management. However, the Bluetooth Speaker continues to show slow movement with only 5 units sold this week. Consider running a promotion on slow-moving items to clear stock before the end of month. The average order value increased to $145, suggesting customers are purchasing higher-value items. Overall, the business is in good health with positive trends across most metrics.',
//     keyMetrics: {
//         totalRevenue: 12450,
//         totalOrders: 86,
//         topSellingProductId: {
//             _id: 'p1',
//             name: 'Wireless Mouse',
//             sku: 'SKU-001',
//         },
//         decliningProductId: {
//             _id: 'p2',
//             name: 'USB-C Charger',
//             sku: 'SKU-002',
//         },
//         inventoryTurnover: 3.2,
//         averageOrderValue: 144.77,
//     },
//     actionableSuggestions: [
//         'Run a promotion on USB-C Charger to clear aging stock',
//         'Increase stock of Wireless Mouse for upcoming month',
//         'Evaluate pricing strategy for Bluetooth Speaker',
//         'Consider bundling slow-moving items with top sellers',
//         'Review supplier lead times for high-demand products',
//     ],
//     createdAt: '2024-07-15T10:30:00Z',
// };

// const dummyHistory = [
//     {
//         _id: 'ins_2',
//         period: 'weekly',
//         summary: 'Last week: Moderate performance with total revenue of $10,800. Wireless Keyboard was top seller with 45 units. Inventory turnover was 2.8x. Consider reviewing stock levels for HDMI cables which have excess inventory.',
//         createdAt: '2024-07-08T10:30:00Z',
//     },
//     {
//         _id: 'ins_3',
//         period: 'weekly',
//         summary: 'Two weeks ago: Strong sales with total revenue of $13,200. Bluetooth Speaker sales spiked to 30 units. Inventory turnover improved to 3.5x.',
//         createdAt: '2024-07-01T10:30:00Z',
//     },
//     {
//         _id: 'ins_4',
//         period: 'monthly',
//         summary: 'June 2024: Monthly performance summary. Total revenue of $48,500 with 320 orders. Average order value of $151.56. Top product was Wireless Mouse with 450 units sold.',
//         createdAt: '2024-06-30T10:30:00Z',
//     },
// ];

// // Stat Card Component
// const StatCard = ({ label, value, icon: Icon, color = 'default' }) => {
//     const colorClasses = {
//         default: 'text-muted-foreground',
//         green: 'text-green-500',
//         blue: 'text-blue-500',
//         yellow: 'text-yellow-500',
//         purple: 'text-purple-500',
//         red: 'text-destructive',
//     };

//     return (
//         <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
//                 <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
//                     {label}
//                 </CardTitle>
//                 {Icon && <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", colorClasses[color])} />}
//             </CardHeader>
//             <CardContent>
//                 <div className="text-lg sm:text-2xl font-bold">
//                     {typeof value === 'number' && label.includes('Revenue') ? `$${value.toLocaleString()}` :
//                         typeof value === 'number' && label.includes('Value') ? `$${value.toFixed(2)}` :
//                             typeof value === 'number' ? value.toLocaleString() : value}
//                 </div>
//             </CardContent>
//         </Card>
//     );
// };

// // Product Card Component
// const ProductCard = ({ product, type }) => {
//     const isTop = type === 'top';
//     const Icon = isTop ? TrendingUp : TrendingDown;
//     const color = isTop ? 'text-green-500' : 'text-destructive';
//     const bgColor = isTop ? 'bg-green-500/10' : 'bg-red-500/10';

//     return (
//         <div className={cn("border p-3", bgColor)}>
//             <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                     <div className="p-1.5 bg-background">
//                         <Icon className={cn("h-4 w-4", color)} />
//                     </div>
//                     <div>
//                         <p className="text-sm font-medium">{product?.name || 'N/A'}</p>
//                         <p className="text-xs text-muted-foreground">{product?.sku || 'N/A'}</p>
//                     </div>
//                 </div>
//                 <Badge variant="outline" className={cn("text-[10px]", color)}>
//                     {isTop ? 'Top Seller' : 'Declining'}
//                 </Badge>
//             </div>
//         </div>
//     );
// };

// // Insight Detail Dialog Component
// const InsightDetailDialog = ({ insight, open, onOpenChange }) => {
//     if (!insight) return null;

//     const formatDate = (dateString) => {
//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//         });
//     };

//     // ✅ Safe access with fallback values
//     const keyMetrics = insight.keyMetrics || {};
//     const totalRevenue = keyMetrics.totalRevenue || 0;
//     const totalOrders = keyMetrics.totalOrders || 0;
//     const averageOrderValue = keyMetrics.averageOrderValue || 0;
//     const inventoryTurnover = keyMetrics.inventoryTurnover || 0;

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
//                 <DialogHeader>
//                     <div className="flex items-center justify-between">
//                         <DialogTitle className="text-xl font-bold flex items-center gap-2">
//                             <Sparkles className="h-5 w-5 text-primary" />
//                             {insight.period?.charAt(0).toUpperCase() + insight.period?.slice(1) || 'Weekly'} Insight
//                         </DialogTitle>
//                         <Badge variant="outline" className="text-[10px]">
//                             {insight.createdAt ? format(new Date(insight.createdAt), 'MMM d, yyyy') : 'N/A'}
//                         </Badge>
//                     </div>
//                     <DialogDescription>
//                         Generated on {insight.createdAt ? formatDate(insight.createdAt) : 'N/A'}
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="space-y-4">
//                     {/* Summary */}
//                     <div className="bg-muted/30 p-4">
//                         <p className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
//                             {insight.summary || 'No summary available'}
//                         </p>
//                     </div>

//                     {/* Key Metrics */}
//                     <div>
//                         <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
//                         <div className="grid grid-cols-2 gap-3">
//                             <div className="border p-3">
//                                 <p className="text-xs text-muted-foreground">Total Revenue</p>
//                                 <p className="text-lg font-bold text-green-500">
//                                     ${totalRevenue.toLocaleString()}
//                                 </p>
//                             </div>
//                             <div className="border p-3">
//                                 <p className="text-xs text-muted-foreground">Total Orders</p>
//                                 <p className="text-lg font-bold text-blue-500">
//                                     {totalOrders}
//                                 </p>
//                             </div>
//                             <div className="border p-3">
//                                 <p className="text-xs text-muted-foreground">Avg Order Value</p>
//                                 <p className="text-lg font-bold text-purple-500">
//                                     ${averageOrderValue.toFixed(2)}
//                                 </p>
//                             </div>
//                             <div className="border p-3">
//                                 <p className="text-xs text-muted-foreground">Inventory Turnover</p>
//                                 <p className="text-lg font-bold text-green-500">
//                                     {inventoryTurnover}x
//                                 </p>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Product Highlights */}
//                     <div className="grid gap-3 sm:grid-cols-2">
//                         <ProductCard
//                             product={keyMetrics.topSellingProductId}
//                             type="top"
//                         />
//                         <ProductCard
//                             product={keyMetrics.decliningProductId}
//                             type="declining"
//                         />
//                     </div>

//                     {/* Actionable Suggestions */}
//                     {insight.actionableSuggestions && insight.actionableSuggestions.length > 0 && (
//                         <div>
//                             <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
//                                 <Lightbulb className="h-4 w-4 text-yellow-500" />
//                                 Actionable Suggestions
//                             </h4>
//                             <div className="space-y-2">
//                                 {insight.actionableSuggestions.map((suggestion, index) => (
//                                     <div
//                                         key={index}
//                                         className="flex items-start gap-3 border p-3 hover:bg-muted/50 transition-colors"
//                                     >
//                                         <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
//                                         <p className="text-sm">{suggestion}</p>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <DialogFooter showCloseButton={false}>
//                     <DialogClose asChild>
//                         <Button variant="outline">Close</Button>
//                     </DialogClose>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// };
// const InsightsPage = () => {
//     const [period, setPeriod] = useState('weekly');
//     const { data: latestResponse, isLoading: isLatestLoading, error: latestError } = useLatestInsight({ period });
//     const { data: historyResponse, isLoading: isHistoryLoading, error: historyError } = useInsightsHistory();
//     const generateMutation = useGenerateInsightNow();
//     const [selectedInsight, setSelectedInsight] = useState(null);
//     const [showDetailDialog, setShowDetailDialog] = useState(false);

//     const isPremiumUpgradeRequired = latestError?.response?.status === 403 || historyError?.response?.status === 403;
//     const isLatestError = latestError && latestError.response?.status !== 404 && latestError.response?.status !== 403;

//     if (isLatestLoading || isHistoryLoading) {
//         return (
//             <div className="flex h-[60vh] items-center justify-center">
//                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
//             </div>
//         );
//     }

//     if (isPremiumUpgradeRequired) {
//         return (
//             <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center px-4">
//                 <Sparkles className="h-12 w-12 text-primary animate-pulse" />
//                 <h3 className="text-xl font-bold tracking-tight">Unlock AI Insights</h3>
//                 <p className="text-sm text-muted-foreground leading-relaxed">
//                     Automated performance summaries, sales velocity spike detection, and actionable business recommendations are exclusive to Premium Plan subscribers.
//                 </p>
//                 <Button asChild>
//                     <Link to="/admin/billing" className="font-semibold shadow-sm">
//                         Upgrade to Premium
//                     </Link>
//                 </Button>
//             </div>
//         );
//     }

//     if (isLatestError) {
//         return (
//             <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
//                 <p className="text-destructive font-medium">Failed to load AI insights</p>
//                 <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
//             </div>
//         );
//     }

//     const insight = latestResponse?.data || null;
//     const history = historyResponse?.data || [];
//     const isGenerating = generateMutation.isPending;

//     const formatDate = (dateString) => {
//         return new Date(dateString).toLocaleDateString('en-US', {
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit',
//         });
//     };

//     const getRelativeTime = (dateString) => {
//         try {
//             return formatDistanceToNow(new Date(dateString), { addSuffix: true });
//         } catch {
//             return 'Unknown';
//         }
//     };

//     const handlePeriodChange = (value) => {
//         setPeriod(value);
//     };

//     const handleGenerateInsight = async () => {
//         try {
//             await generateMutation.mutateAsync({ period });
//         } catch (error) {
//             // error is handled in hook
//         }
//     };

//     const openDetailDialog = (insight) => {
//         setSelectedInsight(insight);
//         setShowDetailDialog(true);
//     };

//     return (
//         <div className="space-y-4 sm:space-y-6 pb-8">
//             {/* Page Header */}
//             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//                 <div>
//                     <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Insights</h1>
//                     <p className="text-sm text-muted-foreground sm:text-base">
//                         AI-generated business insights and recommendations.
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         className="h-8 sm:h-9 text-xs sm:text-sm"
//                         onClick={handleGenerateInsight}
//                         disabled={isGenerating}
//                     >
//                         {isGenerating ? (
//                             <>
//                                 <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
//                                 Generating...
//                             </>
//                         ) : (
//                             <>
//                                 <Zap className="mr-1.5 h-3.5 w-3.5" />
//                                 Generate Now
//                             </>
//                         )}
//                     </Button>
//                 </div>
//             </div>

//             {/* Period Toggle */}
//             <div className="flex items-center justify-between">
//                 <Tabs value={period} onValueChange={handlePeriodChange} className="w-full sm:w-auto">
//                     <TabsList className="grid w-full grid-cols-2 sm:w-auto">
//                         <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
//                         <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
//                     </TabsList>
//                 </Tabs>
//                 <span className="text-xs text-muted-foreground hidden sm:block">
//                     Generated {insight?.createdAt ? getRelativeTime(insight.createdAt) : 'N/A'}
//                 </span>
//             </div>

//             {!insight ? (
//                 // Empty State
//                 <Card className={cn(
//                     "bg-transparent", "border-0", "shadow-none!", "ring-0",
//                 )}>
//                     <CardContent className="py-12 text-center">
//                         <div className="flex flex-col items-center gap-4">
//                             <Sparkles className="h-12 w-12 text-muted-foreground opacity-50" />
//                             <h3 className="text-lg font-semibold">No Insights Generated Yet</h3>
//                             <p className="text-sm text-muted-foreground max-w-md">
//                                 Insights are generated automatically every week.
//                                 Click "Generate Now" to create your first insight.
//                             </p>
//                             <Button onClick={handleGenerateInsight} disabled={isGenerating}>
//                                 {isGenerating ? (
//                                     <>
//                                         <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
//                                         Generating...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Sparkles className="mr-2 h-4 w-4" />
//                                         Generate First Insight
//                                     </>
//                                 )}
//                             </Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             ) : (
//                 <>
//                     {/* Main Insight Card */}
//                     {/* <Card className="border-primary/20"> */}
//                     <Card className={cn(
//                         "bg-transparent", "border-0", "shadow-none!", "ring-0",
//                     )}>
//                         <CardHeader>
//                             <div className="flex items-start justify-between">
//                                 <div>
//                                     <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
//                                         <Sparkles className="h-5 w-5 text-primary" />
//                                         {period.charAt(0).toUpperCase() + period.slice(1)} Insight
//                                     </CardTitle>
//                                     <CardDescription className="text-xs sm:text-sm">
//                                         Generated on {insight.createdAt ? formatDate(insight.createdAt) : 'N/A'}
//                                     </CardDescription>
//                                 </div>
//                             </div>
//                         </CardHeader>
//                         <CardContent className="space-y-6">
//                             {/* Summary */}
//                             <div className="bg-muted/30 p-4 sm:p-6">
//                                 <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-justify">
//                                     {insight.summary || 'No summary available'}
//                                 </p>
//                             </div>

//                             {/* Key Metrics */}
//                             <div>
//                                 <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
//                                 <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
//                                     <StatCard
//                                         label="Total Revenue"
//                                         value={insight.keyMetrics?.totalRevenue || 0}
//                                         icon={DollarSign}
//                                         color="green"
//                                     />
//                                     <StatCard
//                                         label="Total Orders"
//                                         value={insight.keyMetrics?.totalOrders || 0}
//                                         icon={ShoppingCart}
//                                         color="blue"
//                                     />
//                                     <StatCard
//                                         label="Avg Order Value"
//                                         value={insight.keyMetrics?.averageOrderValue || 0}
//                                         icon={Package}
//                                         color="purple"
//                                     />
//                                     <StatCard
//                                         label="Inventory Turnover"
//                                         value={insight.keyMetrics?.inventoryTurnover || 0}
//                                         icon={TrendingUp}
//                                         color="green"
//                                     />
//                                 </div>
//                             </div>

//                             {/* Product Highlights */}
//                             <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
//                                 <ProductCard
//                                     product={insight.keyMetrics?.topSellingProductId}
//                                     type="top"
//                                 />
//                                 <ProductCard
//                                     product={insight.keyMetrics?.decliningProductId}
//                                     type="declining"
//                                 />
//                             </div>

//                             {/* Actionable Suggestions */}
//                             {insight.actionableSuggestions && insight.actionableSuggestions.length > 0 && (
//                                 <div>
//                                     <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
//                                         <Lightbulb className="h-4 w-4 text-yellow-500" />
//                                         Actionable Suggestions
//                                     </h4>
//                                     <div className="space-y-2">
//                                         {insight.actionableSuggestions.map((suggestion, index) => (
//                                             <div
//                                                 key={index}
//                                                 className="flex items-start gap-3 border p-3 hover:bg-muted/50 transition-colors"
//                                             >
//                                                 <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
//                                                 <p className="text-sm">{suggestion}</p>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>

//                     {/* History Section - Table View */}
//                     <div>
//                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
//                             <Clock className="h-5 w-5 text-muted-foreground" />
//                             History
//                         </h3>
//                         <div className="border rounded-xl overflow-hidden bg-card">
//                             <div className="overflow-x-auto">
//                                 <Table>
//                                     <TableHeader>
//                                         <TableRow>
//                                             <TableHead className="min-w-30">Period</TableHead>
//                                             <TableHead>Summary</TableHead>
//                                             <TableHead className="hidden md:table-cell">Generated</TableHead>
//                                             <TableHead className="text-right w-20">Actions</TableHead>
//                                         </TableRow>
//                                     </TableHeader>
//                                     <TableBody>
//                                         {history.length === 0 ? (
//                                             <TableRow>
//                                                 <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8 font-medium">
//                                                     No history available for the last 7 days.
//                                                 </TableCell>
//                                             </TableRow>
//                                         ) : (
//                                             history.map((item) => (
//                                                 <TableRow key={item._id}>
//                                                     <TableCell>
//                                                         <Badge variant="outline" className="text-[10px] capitalize">
//                                                             {item.period || 'weekly'}
//                                                         </Badge>
//                                                     </TableCell>
//                                                     <TableCell>
//                                                         <p className="text-sm line-clamp-2">
//                                                             {item.summary ? item.summary.slice(0, 120) : 'No summary available'}...
//                                                         </p>
//                                                     </TableCell>
//                                                     <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
//                                                         <div>
//                                                             <p>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}</p>
//                                                             <p className="text-[10px]">{item.createdAt ? getRelativeTime(item.createdAt) : 'N/A'}</p>
//                                                         </div>
//                                                     </TableCell>
//                                                     <TableCell className="text-right">
//                                                         <Button
//                                                             variant="ghost"
//                                                             size="icon"
//                                                             className="h-7 w-7"
//                                                             onClick={() => openDetailDialog(item)}
//                                                         >
//                                                             <Eye className="h-3.5 w-3.5" />
//                                                         </Button>
//                                                     </TableCell>
//                                                 </TableRow>
//                                             ))
//                                         )}
//                                     </TableBody>
//                                 </Table>
//                             </div>
//                         </div>
//                     </div>
//                 </>
//             )}

//             {/* Insight Detail Dialog */}
//             <InsightDetailDialog
//                 insight={selectedInsight}
//                 open={showDetailDialog}
//                 onOpenChange={setShowDetailDialog}
//             />
//         </div>
//     );
// };

// export default InsightsPage;
// pages/ai/InsightsPage.jsx
import { useState } from 'react';
import { useLatestInsight, useInsightsHistory, useGenerateInsightNow } from '@/hooks/useInsights';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Lightbulb,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Package,
    Calendar,
    Clock,
    Sparkles,
    RefreshCw,
    Zap,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow, format, subDays } from 'date-fns';

// Stat Card Component
const StatCard = ({ label, value, icon: Icon, color = 'default' }) => {
    const colorClasses = {
        default: 'text-muted-foreground',
        green: 'text-green-500',
        blue: 'text-blue-500',
        yellow: 'text-yellow-500',
        purple: 'text-purple-500',
        red: 'text-destructive',
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    {label}
                </CardTitle>
                {Icon && <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", colorClasses[color])} />}
            </CardHeader>
            <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                    {typeof value === 'number' && label.includes('Revenue') ? `$${value.toLocaleString()}` :
                        typeof value === 'number' && label.includes('Value') ? `$${value.toFixed(2)}` :
                            typeof value === 'number' ? value.toLocaleString() : value}
                </div>
            </CardContent>
        </Card>
    );
};

// Product Card Component
const ProductCard = ({ product, type }) => {
    const isTop = type === 'top';
    const Icon = isTop ? TrendingUp : TrendingDown;
    const color = isTop ? 'text-green-500' : 'text-destructive';
    const bgColor = isTop ? 'bg-green-500/10' : 'bg-red-500/10';

    return (
        <div className={cn("border p-3", bgColor)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-background">
                        <Icon className={cn("h-4 w-4", color)} />
                    </div>
                    <div>
                        <p className="text-sm font-medium">{product?.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{product?.sku || 'N/A'}</p>
                    </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", color)}>
                    {isTop ? 'Top Seller' : 'Declining'}
                </Badge>
            </div>
        </div>
    );
};

// Insight Detail Dialog Component
const InsightDetailDialog = ({ insight, open, onOpenChange }) => {
    if (!insight) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ✅ Safe access with fallback values
    const keyMetrics = insight.keyMetrics || {};
    const totalRevenue = keyMetrics.totalRevenue || 0;
    const totalOrders = keyMetrics.totalOrders || 0;
    const averageOrderValue = keyMetrics.averageOrderValue || 0;
    const inventoryTurnover = keyMetrics.inventoryTurnover || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            {insight.period?.charAt(0).toUpperCase() + insight.period?.slice(1) || 'Weekly'} Insight
                        </DialogTitle>
                        <Badge variant="outline" className="text-[10px]">
                            {insight.createdAt ? format(new Date(insight.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Generated on {insight.createdAt ? formatDate(insight.createdAt) : 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-muted/30 p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
                            {insight.summaryText || 'No summary available'}
                        </p>
                    </div>

                    {/* Key Metrics */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="border p-3">
                                <p className="text-xs text-muted-foreground">Total Revenue</p>
                                <p className="text-lg font-bold text-green-500">
                                    ${totalRevenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="border p-3">
                                <p className="text-xs text-muted-foreground">Total Orders</p>
                                <p className="text-lg font-bold text-blue-500">
                                    {totalOrders}
                                </p>
                            </div>
                            <div className="border p-3">
                                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                                <p className="text-lg font-bold text-purple-500">
                                    ${averageOrderValue.toFixed(2)}
                                </p>
                            </div>
                            <div className="border p-3">
                                <p className="text-xs text-muted-foreground">Inventory Turnover</p>
                                <p className="text-lg font-bold text-green-500">
                                    {inventoryTurnover}x
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Product Highlights */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ProductCard
                            product={keyMetrics.topSellingProductId}
                            type="top"
                        />
                        <ProductCard
                            product={keyMetrics.decliningProductId}
                            type="declining"
                        />
                    </div>

                    {/* Actionable Suggestions */}
                    {insight.actionableSuggestions && insight.actionableSuggestions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                Actionable Suggestions
                            </h4>
                            <div className="space-y-2">
                                {insight.actionableSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 border p-3 hover:bg-muted/50 transition-colors"
                                    >
                                        <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                        <p className="text-sm">{suggestion}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

const InsightsPage = () => {
    const [period, setPeriod] = useState('weekly');
    const { data: latestResponse, isLoading: isLatestLoading, error: latestError } = useLatestInsight({ period });
    const { data: historyResponse, isLoading: isHistoryLoading, error: historyError } = useInsightsHistory();
    const generateMutation = useGenerateInsightNow();
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    console.log(latestResponse)
    const isPremiumUpgradeRequired = latestError?.response?.status === 403 || historyError?.response?.status === 403;
    const isLatestError = latestError && latestError.response?.status !== 404 && latestError.response?.status !== 403;

    if (isLatestLoading || isHistoryLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isPremiumUpgradeRequired) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center px-4">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <h3 className="text-xl font-bold tracking-tight">Unlock AI Insights</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Automated performance summaries, sales velocity spike detection, and actionable business recommendations are exclusive to Premium Plan subscribers.
                </p>
                <Button asChild>
                    <Link to="/admin/billing" className="font-semibold shadow-sm">
                        Upgrade to Premium
                    </Link>
                </Button>
            </div>
        );
    }

    if (isLatestError) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load AI insights</p>
                <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
            </div>
        );
    }

    const insight = latestResponse?.data || null;
    const history = historyResponse?.data || [];
    const isGenerating = generateMutation.isPending;

    // ✅ FILTER: Only show insights from the last 7 days
    const sevenDaysAgo = subDays(new Date(), 7);
    const filteredHistory = history.filter(item => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= sevenDaysAgo;
    });

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

    const handlePeriodChange = (value) => {
        setPeriod(value);
    };

    const handleGenerateInsight = async () => {
        try {
            await generateMutation.mutateAsync({ period });
        } catch (error) {
            // error is handled in hook
        }
    };

    const openDetailDialog = (insight) => {
        setSelectedInsight(insight);
        setShowDetailDialog(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Insights</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        AI-generated business insights and recommendations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={handleGenerateInsight}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Zap className="mr-1.5 h-3.5 w-3.5" />
                                Generate Now
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center justify-between">
                <Tabs value={period} onValueChange={handlePeriodChange} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                        <TabsTrigger value="weekly" className="text-xs sm:text-sm">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly" className="text-xs sm:text-sm">Monthly</TabsTrigger>
                    </TabsList>
                </Tabs>
                <span className="text-xs text-muted-foreground hidden sm:block">
                    Generated {insight?.createdAt ? getRelativeTime(insight.createdAt) : 'N/A'}
                </span>
            </div>

            {!insight ? (
                // Empty State
                <Card className={cn(
                    "bg-transparent", "border-0", "shadow-none!", "ring-0",
                )}>
                    <CardContent className="py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Sparkles className="h-12 w-12 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold">No Insights Generated Yet</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Insights are generated automatically every week.
                                Click "Generate Now" to create your first insight.
                            </p>
                            <Button onClick={handleGenerateInsight} disabled={isGenerating}>
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate First Insight
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Main Insight Card */}
                    <Card className={cn(
                        "bg-transparent", "border-0", "shadow-none!", "ring-0",
                    )}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        {period.charAt(0).toUpperCase() + period.slice(1)} Insight
                                    </CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Generated on {insight.createdAt ? formatDate(insight.createdAt) : 'N/A'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary */}
                            <div className="bg-muted/30 p-4 sm:p-6">
                                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-justify">
                                    {insight.summaryText || 'No summary available'}
                                </p>
                            </div>

                            {/* Key Metrics */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        label="Total Revenue"
                                        value={insight.keyMetrics?.totalRevenue || 0}
                                        icon={DollarSign}
                                        color="green"
                                    />
                                    <StatCard
                                        label="Total Orders"
                                        value={insight.keyMetrics?.totalOrders || 0}
                                        icon={ShoppingCart}
                                        color="blue"
                                    />
                                    <StatCard
                                        label="Avg Order Value"
                                        value={insight.keyMetrics?.averageOrderValue || 0}
                                        icon={Package}
                                        color="purple"
                                    />
                                    <StatCard
                                        label="Inventory Turnover"
                                        value={insight.keyMetrics?.inventoryTurnover || 0}
                                        icon={TrendingUp}
                                        color="green"
                                    />
                                </div>
                            </div>

                            {/* Product Highlights */}
                            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                <ProductCard
                                    product={insight.keyMetrics?.topSellingProductId}
                                    type="top"
                                />
                                <ProductCard
                                    product={insight.keyMetrics?.decliningProductId}
                                    type="declining"
                                />
                            </div>

                            {/* Actionable Suggestions */}
                            {insight.actionableSuggestions && insight.actionableSuggestions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                                        Actionable Suggestions
                                    </h4>
                                    <div className="space-y-2">
                                        {insight.actionableSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-3 border p-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                                <p className="text-sm">{suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* History Section - Table View */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            Last 7 Days Insights
                        </h3>
                        <div className="border rounded-xl overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-30">Period</TableHead>
                                            {/* <TableHead>Summary</TableHead> */}
                                            <TableHead className="hidden md:table-cell">Generated</TableHead>
                                            <TableHead className="text-right w-20">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8 font-medium">
                                                    No insights available for the last 7 days.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredHistory.map((item) => (
                                                <TableRow key={item._id}>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px] capitalize">
                                                            {item.period || 'weekly'}
                                                        </Badge>
                                                    </TableCell>
                                                    {/* <TableCell>
                                                        <p className="text-sm line-clamp-2">
                                                            {item.summary ? item.summary.slice(0, 120) : 'No summary available'}...
                                                        </p>
                                                    </TableCell> */}
                                                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                                        <div>
                                                            <p>{item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}</p>
                                                            <p className="text-[10px]">{item.createdAt ? getRelativeTime(item.createdAt) : 'N/A'}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => openDetailDialog(item)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Insight Detail Dialog */}
            <InsightDetailDialog
                insight={selectedInsight}
                open={showDetailDialog}
                onOpenChange={setShowDetailDialog}
            />
        </div>
    );
};

export default InsightsPage;