// pages/purchaseOrders/CreatePurchaseOrder.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useAllStock } from '@/hooks/useStock';
import { useSuppliers } from '@/hooks/useSupplier';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrder';
import * as z from 'zod';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldContent,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Search,
    Plus,
    Loader2,
    Package,
    Trash2,
    X,
    Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Dummy Data
const dummyProducts = [
    { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', quantity: 45 },
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', quantity: 8 },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', quantity: 2 },
    { _id: '4', name: 'HDMI Cable', sku: 'SKU-004', quantity: 120 },
    { _id: '5', name: 'Wireless Keyboard', sku: 'SKU-005', quantity: 15 },
];

const dummySuppliers = [
    { _id: 's1', name: 'TechSupply Co.', contactPerson: 'John Smith', email: 'john@techsupply.com', phone: '+1 234 567 8900' },
    { _id: 's2', name: 'PowerTech Ltd.', contactPerson: 'Jane Doe', email: 'jane@powertech.com', phone: '+1 234 567 8901' },
    { _id: 's3', name: 'CableMasters Inc.', contactPerson: 'Bob Wilson', email: 'bob@cablemasters.com', phone: '+1 234 567 8902' },
    { _id: 's4', name: 'Global Logistics', contactPerson: 'Sarah Johnson', email: 'sarah@globallogistics.com', phone: '+1 234 567 8903' },
];

// Zod schema for validation
const purchaseOrderSchema = z.object({
    supplierId: z.string().min(1, { message: 'Please select a supplier' }),
});

const CreatePurchaseOrder = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const querySupplierId = searchParams.get('supplierId') || location.state?.supplierId || '';

    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const searchInputRef = useRef(null);
    const resultsRef = useRef(null);

    const { data: productsResponse } = useAllStock({ limit: 1000 });
    const products = productsResponse?.data?.products || [];

    const { data: suppliersResponse } = useSuppliers({ limit: 1000 });
    const suppliers = suppliersResponse?.data || [];

    const createPOMutation = useCreatePurchaseOrder();
    const isPending = createPOMutation.isPending;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(purchaseOrderSchema),
        defaultValues: {
            supplierId: querySupplierId,
        },
    });

    const supplierId = watch('supplierId');

    useEffect(() => {
        if (querySupplierId) {
            setValue('supplierId', querySupplierId);
        }
    }, [querySupplierId, setValue]);

    // Relevance scoring
    const getRelevanceScore = (product, term) => {
        const name = product.name.toLowerCase();
        const sku = product.sku.toLowerCase();
        const q = term.toLowerCase();

        if (name === q || sku === q) return 3;
        if (name.startsWith(q) || sku.startsWith(q)) return 2;
        if (name.includes(q) || sku.includes(q)) return 1;
        return 0;
    };

    // Show all products by default; filter + rank by relevance once the user types
    const searchResults = searchTerm
        ? products
            .map(product => ({ product, score: getRelevanceScore(product, searchTerm) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ product }) => product)
        : products;

    const bestMatchId = searchTerm && searchResults.length > 0 ? searchResults[0]._id : null;

    // Reset highlight when search changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [searchTerm]);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (searchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < searchResults.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
                addToCart(searchResults[highlightedIndex]);
                setSearchTerm('');
                setHighlightedIndex(-1);
            } else if (bestMatchId) {
                addToCart(searchResults[0]);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setSearchTerm('');
            setHighlightedIndex(-1);
            searchInputRef.current?.blur();
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && resultsRef.current) {
            const highlightedElement = resultsRef.current.querySelector(
                `[data-index="${highlightedIndex}"]`
            );
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Add product to cart
    const addToCart = (product) => {
        const existingItem = cartItems.find(item => item.productId === product._id);
        if (existingItem) {
            toast.info(`${product.name} is already in the cart. Update quantity instead.`);
            return;
        }
        setCartItems([...cartItems, {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unitCost: 0,
            availableStock: product.quantity,
        }]);
    };

    // Remove product from cart
    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter(item => item.productId !== productId));
    };

    // Update quantity
    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, quantity: newQuantity } : item
        ));
    };

    // Update unit cost
    const updateUnitCost = (productId, newUnitCost) => {
        if (newUnitCost < 0) return;
        setCartItems(cartItems.map(item =>
            item.productId === productId ? { ...item, unitCost: newUnitCost } : item
        ));
    };

    // Calculate totals
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalCost = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

    // Handle form submission
    const onSubmit = (values) => {
        if (!supplierId) {
            toast.error('Please select a supplier');
            return;
        }
        if (cartItems.length === 0) {
            toast.error('Please add at least one product to the cart');
            return;
        }

        const poData = {
            supplierId: values.supplierId,
            items: cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
            })),
        };

        createPOMutation.mutate(poData, {
            onSuccess: () => {
                setCartItems([]);
                setSearchTerm('');
                setHighlightedIndex(-1);
                reset({
                    supplierId: '',
                });
                navigate(`/${rolePrefix}/purchase-orders`);
            }
        });
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
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create Purchase Order</h1>
                        <p className="text-sm text-muted-foreground">Create a new purchase order for a supplier</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - 7 Columns */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Supplier Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="supplierId" className="text-sm font-medium">
                                    Supplier <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Select
                                        value={supplierId}
                                        onValueChange={(value) => setValue('supplierId', value)}
                                    >
                                        <SelectTrigger className="text-sm w-full">
                                            <SelectValue placeholder="Select a supplier">
                                                {suppliers.find(s => s._id === supplierId)?.name || ''}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Suppliers</SelectLabel>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier._id} value={supplier._id}>
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors.supplierId && (
                                        <FieldError errors={[errors.supplierId]} />
                                    )}
                                    {supplierId && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Contact: {suppliers?.find(s => s._id === supplierId)?.contactPerson}
                                            {' '}· Email: {suppliers?.find(s => s._id === supplierId)?.email}
                                        </div>
                                    )}
                                </FieldContent>
                            </Field>

                            {/* Product Search */}
                            <Field orientation="vertical">
                                <FieldLabel className="text-sm font-medium">Search Products</FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="Search by name or SKU..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="pl-8 pr-8 h-10 text-sm"
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Product Results - always visible, shows all products by default */}
                        <div
                            ref={resultsRef}
                            className="border rounded-xl overflow-hidden max-h-75 overflow-y-auto bg-card"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs hidden sm:table-cell">SKU</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-right">Stock</TableHead>
                                        <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {searchResults.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">
                                                No products found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        searchResults.map((product, index) => {
                                            const isBestMatch = product._id === bestMatchId;
                                            const isKeyboardHighlighted = highlightedIndex === index;
                                            return (
                                                <TableRow
                                                    key={product._id}
                                                    data-index={index}
                                                    className={cn(
                                                        "transition-colors cursor-pointer",
                                                        isBestMatch && "bg-primary/15 hover:bg-primary/20 ring-1 ring-inset ring-primary/40",
                                                        isKeyboardHighlighted && "bg-primary text-primary-foreground hover:bg-primary"
                                                    )}
                                                    onMouseEnter={() => setHighlightedIndex(index)}
                                                    onMouseLeave={() => setHighlightedIndex(-1)}
                                                    onClick={() => {
                                                        addToCart(product);
                                                        setSearchTerm('');
                                                        setHighlightedIndex(-1);
                                                    }}
                                                >
                                                    <TableCell className="py-1.5 px-2 text-xs font-medium">
                                                        {product.name}
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "py-1.5 px-2 text-xs hidden sm:table-cell",
                                                        !isKeyboardHighlighted && "text-muted-foreground"
                                                    )}>
                                                        {product.sku}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-2 text-xs text-center">
                                                        {product.quantity}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-2 text-xs text-center">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={isKeyboardHighlighted ? "secondary" : "default"}
                                                            className="h-6 px-2 text-[10px]"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(product);
                                                                setSearchTerm('');
                                                                setHighlightedIndex(-1);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-0.5" />
                                                            Add
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

                    {/* Right Column - 5 Columns */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="border p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium">Cart</h3>
                                <Badge variant="outline" className="text-[10px]">
                                    {cartItems.length} items
                                </Badge>
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No products added yet</p>
                                    <p className="text-xs">Search and add products from the left</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="py-1.5 px-2 text-xs">Product</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-center">Qty</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-right">Unit Cost</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-right">Total</TableHead>
                                                    <TableHead className="py-1.5 px-2 text-xs text-center">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cartItems.map((item) => (
                                                    <TableRow key={item.productId}>
                                                        <TableCell className="py-1.5 px-2 text-xs">
                                                            <div className="font-medium">{item.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{item.sku}</div>
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-5 w-5"
                                                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                                                >
                                                                    -
                                                                </Button>
                                                                <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-5 w-5"
                                                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                                                >
                                                                    +
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-right">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                value={item.unitCost || ''}
                                                                onChange={(e) => updateUnitCost(item.productId, parseFloat(e.target.value) || 0)}
                                                                className="h-6 w-20 text-xs text-right"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-right font-medium">
                                                            ${(item.quantity * item.unitCost).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="py-1.5 px-2 text-xs text-center">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-destructive hover:text-destructive"
                                                                onClick={() => removeFromCart(item.productId)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Summary */}
                                    <div className="border-t pt-3 space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Total Items</span>
                                            <span className="font-medium">{totalItems}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Total Quantity</span>
                                            <span className="font-medium">{totalQuantity}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold pt-1 border-t">
                                            <span>Total Cost</span>
                                            <span className="text-primary">${totalCost.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Create Button */}
                        <Button
                            type="submit"
                            className="w-full h-10 text-sm font-medium"
                            disabled={!supplierId || cartItems.length === 0 || isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Purchase Order...
                                </>
                            ) : (
                                'Create Purchase Order'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreatePurchaseOrder;