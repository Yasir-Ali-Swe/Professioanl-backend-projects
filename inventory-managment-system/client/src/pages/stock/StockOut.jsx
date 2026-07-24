// pages/stock/StockOut.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useAllStock, useStockOut } from '@/hooks/useStock';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';


// Dummy Data
const dummyProducts = [
    { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', currentStock: 45 },
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', currentStock: 8 },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', currentStock: 2 },
];

// Zod schema for validation
const stockOutSchema = z.object({
    productId: z.string().min(1, { message: 'Please select a product' }),
    quantity: z.string().min(1, { message: 'Quantity is required' }).transform(val => parseInt(val)),
    reason: z.enum(['sale', 'adjustment', 'damage'], { message: 'Please select a valid reason' }),
    notes: z.string().optional(),
});

const StockOut = () => {
    const navigate = useNavigate();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const { data: productsResponse } = useAllStock({ limit: 1000 });
    const products = (productsResponse?.data?.products || []).map(p => ({
        _id: p._id,
        name: p.name,
        sku: p.sku,
        currentStock: p.quantity,
    }));

    const stockOutMutation = useStockOut();
    const isPending = stockOutMutation.isPending;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(stockOutSchema),
        defaultValues: {
            productId: '',
            quantity: '',
            reason: '',
            notes: '',
        },
    });

    const selectedProductId = watch('productId');
    const quantity = watch('quantity');

    // Update selected product when dropdown changes
    const handleProductSelect = (value) => {
        setValue('productId', value);
        const product = products.find(p => p._id === value);
        setSelectedProduct(product);
    };

    // Check if quantity exceeds available stock
    const exceedsStock = selectedProduct && parseInt(quantity) > selectedProduct.currentStock;

    // Handle form submission
    const onSubmit = (values) => {
        if (exceedsStock) {
            toast.error(`Insufficient stock! Available: ${selectedProduct.currentStock}`);
            return;
        }

        stockOutMutation.mutate({
            productId: values.productId,
            quantity: values.quantity,
            reason: values.reason,
            notes: values.notes,
        }, {
            onSuccess: () => {
                toast.success(`Stock Out successful! ${values.quantity} units removed.`);
                navigate(`/${rolePrefix}/stock/overview`);
            }
        });
    };

    return (
        <div className="flex justify-center px-4 py-6 sm:py-8">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-full">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stock Out</h1>
                        <p className="text-sm text-muted-foreground">Remove stock from products</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-5">
                        {/* Row 1: Product Selection */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="productId" className="text-sm font-medium">
                                Product <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Select
                                    value={selectedProductId}
                                    onValueChange={handleProductSelect}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select a product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Products</SelectLabel>
                                            {products.map((product) => (
                                                <SelectItem key={product._id} value={product._id}>
                                                    {product.name} ({product.sku}) - Current: {product.currentStock}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {errors.productId && (
                                    <FieldError errors={[errors.productId]} />
                                )}
                                {selectedProduct && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Current Stock: <span className="font-medium">{selectedProduct.currentStock}</span>
                                        {' '}· SKU: <span className="font-medium">{selectedProduct.sku}</span>
                                    </div>
                                )}
                            </FieldContent>
                        </Field>

                        {/* Row 2: Quantity + Reason */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="quantity" className="text-sm font-medium">
                                    Quantity <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min="1"
                                        placeholder="Enter quantity"
                                        className="h-10 text-sm"
                                        {...register("quantity")}
                                        aria-invalid={errors.quantity ? "true" : "false"}
                                    />
                                    {errors.quantity && (
                                        <FieldError errors={[errors.quantity]} />
                                    )}
                                    {exceedsStock && (
                                        <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>Insufficient stock! Available: {selectedProduct.currentStock}</span>
                                        </div>
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="reason" className="text-sm font-medium">
                                    Reason <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Select
                                        value={watch("reason")}
                                        onValueChange={(val) => setValue("reason", val, { shouldValidate: true })}
                                    >
                                        <SelectTrigger className="h-10 text-sm">
                                            <SelectValue placeholder="Select a reason" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="sale">Sale</SelectItem>
                                                <SelectItem value="adjustment">Adjustment</SelectItem>
                                                <SelectItem value="damage">Damage</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors.reason && (
                                        <FieldError errors={[errors.reason]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 3: Notes */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="notes" className="text-sm font-medium">
                                Notes <span className="text-xs text-muted-foreground">(Optional)</span>
                            </FieldLabel>
                            <FieldContent>
                                <Textarea
                                    id="notes"
                                    placeholder="Additional notes about this stock out"
                                    className="min-h-20 text-sm resize-none"
                                    {...register("notes")}
                                />
                            </FieldContent>
                        </Field>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto order-2 sm:order-1"
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:w-auto order-1 sm:order-2"
                                disabled={isPending || exceedsStock}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Removing Stock...
                                    </>
                                ) : (
                                    'Remove Stock'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default StockOut;