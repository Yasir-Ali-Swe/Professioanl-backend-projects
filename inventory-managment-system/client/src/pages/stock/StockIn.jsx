// pages/stock/StockIn.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Dummy Data
const dummyProducts = [
    { _id: '1', name: 'Wireless Mouse', sku: 'SKU-001', currentStock: 45 },
    { _id: '2', name: 'USB-C Charger', sku: 'SKU-002', currentStock: 8 },
    { _id: '3', name: 'Bluetooth Speaker', sku: 'SKU-003', currentStock: 2 },
];

// Zod schema for validation
const stockInSchema = z.object({
    productId: z.string().min(1, { message: 'Please select a product' }),
    quantity: z.string().min(1, { message: 'Quantity is required' }).transform(val => parseInt(val)),
    reason: z.string().min(3, { message: 'Please provide a reason' }),
    notes: z.string().optional(),
});

const StockIn = () => {
    const navigate = useNavigate();
    const [isPending, setIsPending] = useState(false);
    const [products] = useState(dummyProducts);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(stockInSchema),
        defaultValues: {
            productId: '',
            quantity: '',
            reason: '',
            notes: '',
        },
    });

    const selectedProductId = watch('productId');

    // Update selected product when dropdown changes
    const handleProductSelect = (value) => {
        setValue('productId', value);
        const product = products.find(p => p._id === value);
        setSelectedProduct(product);
    };

    // Handle form submission
    const onSubmit = async (values) => {
        setIsPending(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(`Stock In successful! ${values.quantity} units added.`);
            navigate('/admin/stock/overview');
        } catch (error) {
            toast.error(error.message || 'Failed to add stock. Please try again.');
        } finally {
            setIsPending(false);
        }
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
                        onClick={() => navigate('/admin/stock/overview')}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-full">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stock In</h1>
                        <p className="text-sm text-muted-foreground">Add stock to products</p>
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
                                    <SelectTrigger className="h-10 text-sm rounded-none">
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
                                        className="h-10 text-sm rounded-none"
                                        {...register("quantity")}
                                        aria-invalid={errors.quantity ? "true" : "false"}
                                    />
                                    {errors.quantity && (
                                        <FieldError errors={[errors.quantity]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="reason" className="text-sm font-medium">
                                    Reason <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="reason"
                                        type="text"
                                        placeholder="e.g., Purchase order, Return"
                                        className="h-10 text-sm rounded-none"
                                        {...register("reason")}
                                        aria-invalid={errors.reason ? "true" : "false"}
                                    />
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
                                    placeholder="Additional notes about this stock in"
                                    className="min-h-[80px] text-sm rounded-none resize-none"
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
                                onClick={() => navigate('/admin/stock/overview')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:w-auto order-1 sm:order-2"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding Stock...
                                    </>
                                ) : (
                                    'Add Stock'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default StockIn;