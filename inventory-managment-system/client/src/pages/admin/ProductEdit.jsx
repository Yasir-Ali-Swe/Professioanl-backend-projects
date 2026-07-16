// pages/products/ProductEdit.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
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
    Image as ImageIcon,
    X,
    Loader2,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Dummy Data for dropdowns
const dummyCategories = [
    { _id: 'c1', name: 'Electronics', categorySlug: 'electronics' },
    { _id: 'c2', name: 'Cables', categorySlug: 'cables' },
    { _id: 'c3', name: 'Accessories', categorySlug: 'accessories' },
    { _id: 'c4', name: 'Furniture', categorySlug: 'furniture' },
];

const dummySuppliers = [
    { _id: 's1', name: 'TechSupply Co.', contactPerson: 'John Smith', email: 'john@techsupply.com' },
    { _id: 's2', name: 'PowerTech Ltd.', contactPerson: 'Jane Doe', email: 'jane@powertech.com' },
    { _id: 's3', name: 'CableMasters Inc.', contactPerson: 'Bob Wilson', email: 'bob@cablemasters.com' },
    { _id: 's4', name: 'Global Logistics', contactPerson: 'Sarah Johnson', email: 'sarah@globallogistics.com' },
];

// Dummy Product Data - Pre-filled for edit
const dummyProduct = {
    _id: '1',
    name: 'Wireless Mouse',
    unit: 'pcs',
    sku: 'SKU-001',
    categoryId: 'c1',
    supplierId: 's1',
    quantity: 45,
    reorderThreshold: 10,
    costPrice: 15.00,
    sellingPrice: 29.99,
    imageUrl: 'https://ui-avatars.com/api/?name=WM&background=6B46C1&color=fff&size=128',
    isActive: true,
};

// Zod schema for validation
const productSchema = z.object({
    name: z.string().min(2, { message: 'Product name must be at least 2 characters' }),
    unit: z.string().min(1, { message: 'Unit is required' }),
    sku: z.string().optional(),
    categoryId: z.string().min(1, { message: 'Please select a category' }),
    supplierId: z.string().min(1, { message: 'Please select a supplier' }),
    quantity: z.string().optional().transform(val => val ? parseInt(val) : 0),
    reorderThreshold: z.string().optional().transform(val => val ? parseInt(val) : 10),
    costPrice: z.string().min(1, { message: 'Cost price is required' }).transform(val => parseFloat(val)),
    sellingPrice: z.string().min(1, { message: 'Selling price is required' }).transform(val => parseFloat(val)),
});

const ProductEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [isPending, setIsPending] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalValues, setOriginalValues] = useState({
        name: dummyProduct.name,
        unit: dummyProduct.unit,
        sku: dummyProduct.sku,
        categoryId: dummyProduct.categoryId,
        supplierId: dummyProduct.supplierId,
        quantity: dummyProduct.quantity?.toString() || '',
        reorderThreshold: dummyProduct.reorderThreshold?.toString() || '10',
        costPrice: dummyProduct.costPrice?.toString() || '',
        sellingPrice: dummyProduct.sellingPrice?.toString() || '',
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: dummyProduct.name,
            unit: dummyProduct.unit,
            sku: dummyProduct.sku,
            categoryId: dummyProduct.categoryId,
            supplierId: dummyProduct.supplierId,
            quantity: dummyProduct.quantity?.toString() || '',
            reorderThreshold: dummyProduct.reorderThreshold?.toString() || '10',
            costPrice: dummyProduct.costPrice?.toString() || '',
            sellingPrice: dummyProduct.sellingPrice?.toString() || '',
        },
    });

    const selectedCategoryId = watch('categoryId');
    const selectedSupplierId = watch('supplierId');
    const watchedName = watch('name');
    const watchedUnit = watch('unit');
    const watchedSku = watch('sku');
    const watchedCategoryId = watch('categoryId');
    const watchedSupplierId = watch('supplierId');
    const watchedQuantity = watch('quantity');
    const watchedReorderThreshold = watch('reorderThreshold');
    const watchedCostPrice = watch('costPrice');
    const watchedSellingPrice = watch('sellingPrice');

    // Check if form has changes
    const hasChanges = () => {
        return (
            watchedName !== originalValues.name ||
            watchedUnit !== originalValues.unit ||
            watchedSku !== originalValues.sku ||
            watchedCategoryId !== originalValues.categoryId ||
            watchedSupplierId !== originalValues.supplierId ||
            watchedQuantity !== originalValues.quantity ||
            watchedReorderThreshold !== originalValues.reorderThreshold ||
            watchedCostPrice !== originalValues.costPrice ||
            watchedSellingPrice !== originalValues.sellingPrice ||
            selectedFile !== null
        );
    };

    // Set initial image preview
    useEffect(() => {
        if (dummyProduct.imageUrl) {
            setImagePreview(dummyProduct.imageUrl);
        }
    }, []);

    // Handle image selection
    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
    };

    // Handle image removal
    const handleRemoveImage = () => {
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle image click to trigger file input
    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    // Handle form submission
    const onSubmit = async (values) => {
        setIsPending(true);

        // Create FormData for API
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('categoryId', values.categoryId);
        formData.append('supplierId', values.supplierId);
        formData.append('costPrice', values.costPrice);
        formData.append('sellingPrice', values.sellingPrice);
        formData.append('unit', values.unit);
        if (values.sku) formData.append('sku', values.sku);
        if (values.quantity) formData.append('quantity', values.quantity);
        if (values.reorderThreshold) formData.append('reorderThreshold', values.reorderThreshold);
        if (selectedFile) formData.append('image', selectedFile);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Product updated successfully!');
            navigate(`/admin/products/${dummyProduct._id}`);
        } catch (error) {
            toast.error(error.message || 'Failed to update product. Please try again.');
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
                        onClick={() => navigate(`/admin/products/${dummyProduct._id}`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-full">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Product</h1>
                            <Badge variant={dummyProduct.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                {dummyProduct.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {dummyProduct.quantity <= dummyProduct.reorderThreshold && dummyProduct.quantity > 0 && (
                                <Badge variant="destructive" className="text-[10px]">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                    Low Stock
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">Update product information</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-5">
                        {/* Image Upload - Top */}
                        <Field orientation="vertical">
                            <FieldLabel className="text-sm font-medium">Product Image</FieldLabel>
                            <FieldContent>
                                <div
                                    className={cn(
                                        "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                        imagePreview ? "border-primary" : "border-muted-foreground/25 hover:border-primary/50",
                                        "min-h-[150px] flex flex-col items-center justify-center"
                                    )}
                                    onClick={handleImageClick}
                                >
                                    {imagePreview ? (
                                        <>
                                            <img
                                                src={imagePreview}
                                                alt="Product preview"
                                                className="h-32 w-32 object-cover rounded-lg"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveImage();
                                                    }}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Click to change image
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <p className="mt-2 text-sm font-medium">Upload Image</p>
                                            <p className="text-xs text-muted-foreground">
                                                Click or drag and drop
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                PNG, JPG, WEBP (max 5MB)
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                {selectedFile && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </FieldContent>
                        </Field>

                        {/* Row 1: Name + Unit */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="name" className="text-sm font-medium">
                                    Product Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter product name"
                                        className="h-10 text-sm rounded-none"
                                        {...register("name")}
                                        aria-invalid={errors.name ? "true" : "false"}
                                    />
                                    {errors.name && (
                                        <FieldError errors={[errors.name]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="unit" className="text-sm font-medium">
                                    Unit <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="unit"
                                        type="text"
                                        placeholder="e.g., pcs, kg, m"
                                        className="h-10 text-sm rounded-none"
                                        {...register("unit")}
                                        aria-invalid={errors.unit ? "true" : "false"}
                                    />
                                    {errors.unit && (
                                        <FieldError errors={[errors.unit]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: SKU + Category + Supplier */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* SKU */}
                            <Field orientation="vertical" className="flex flex-col">
                                <FieldLabel htmlFor="sku" className="text-sm font-medium">
                                    SKU <span className="text-xs text-muted-foreground">(Optional)</span>
                                </FieldLabel>

                                <FieldContent className="flex flex-col">
                                    <Input
                                        id="sku"
                                        type="text"
                                        placeholder="Auto-generated"
                                        className="h-10 w-full rounded-none text-sm"
                                        {...register("sku")}
                                    />

                                    <div className="mt-1 min-h-10" />
                                </FieldContent>
                            </Field>

                            {/* Category */}
                            <Field orientation="vertical" className="flex flex-col">
                                <FieldLabel htmlFor="categoryId" className="text-sm font-medium">
                                    Category <span className="text-destructive">*</span>
                                </FieldLabel>

                                <FieldContent className="flex flex-col">
                                    <Select
                                        value={selectedCategoryId}
                                        onValueChange={(value) => setValue("categoryId", value)}
                                    >
                                        <SelectTrigger className="w-full rounded-none text-sm px-3 py-4.75">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Categories</SelectLabel>

                                                {dummyCategories.map((category) => (
                                                    <SelectItem
                                                        key={category._id}
                                                        value={category._id}
                                                    >
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>

                                    <div className="mt-1 min-h-10">
                                        {errors.categoryId ? (
                                            <FieldError errors={[errors.categoryId]} />
                                        ) : selectedCategoryId ? (
                                            <p className="text-xs text-muted-foreground">
                                                Slug:{" "}
                                                {
                                                    dummyCategories.find(
                                                        (c) => c._id === selectedCategoryId
                                                    )?.categorySlug
                                                }
                                            </p>
                                        ) : null}
                                    </div>
                                </FieldContent>
                            </Field>

                            {/* Supplier */}
                            <Field orientation="vertical" className="flex flex-col">
                                <FieldLabel htmlFor="supplierId" className="text-sm font-medium">
                                    Supplier <span className="text-destructive">*</span>
                                </FieldLabel>

                                <FieldContent className="flex flex-col">
                                    <Select
                                        value={selectedSupplierId}
                                        onValueChange={(value) => setValue("supplierId", value)}
                                    >
                                        <SelectTrigger className="w-full rounded-none text-sm px-3 py-4.75">
                                            <SelectValue placeholder="Select a supplier" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Suppliers</SelectLabel>

                                                {dummySuppliers.map((supplier) => (
                                                    <SelectItem
                                                        key={supplier._id}
                                                        value={supplier._id}
                                                    >
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>

                                    <div className="mt-1 min-h-10">
                                        {errors.supplierId ? (
                                            <FieldError errors={[errors.supplierId]} />
                                        ) : selectedSupplierId ? (
                                            <div className="space-y-0.5 text-xs text-muted-foreground">
                                                <p>
                                                    Contact:{" "}
                                                    {
                                                        dummySuppliers.find(
                                                            (s) => s._id === selectedSupplierId
                                                        )?.contactPerson
                                                    }
                                                </p>
                                                <p>
                                                    Email:{" "}
                                                    {
                                                        dummySuppliers.find(
                                                            (s) => s._id === selectedSupplierId
                                                        )?.email
                                                    }
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 3: Quantity + Reorder Threshold */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="quantity" className="text-sm font-medium">
                                    Quantity <span className="text-xs text-muted-foreground">(Optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        placeholder="0"
                                        className="h-10 text-sm rounded-none"
                                        {...register("quantity")}
                                    />
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="reorderThreshold" className="text-sm font-medium">
                                    Reorder Threshold <span className="text-xs text-muted-foreground">(Optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="reorderThreshold"
                                        type="number"
                                        placeholder="10"
                                        className="h-10 text-sm rounded-none"
                                        {...register("reorderThreshold")}
                                    />
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 4: Cost Price + Selling Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="costPrice" className="text-sm font-medium">
                                    Cost Price ($) <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="costPrice"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="h-10 text-sm rounded-none"
                                        {...register("costPrice")}
                                        aria-invalid={errors.costPrice ? "true" : "false"}
                                    />
                                    {errors.costPrice && (
                                        <FieldError errors={[errors.costPrice]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="sellingPrice" className="text-sm font-medium">
                                    Selling Price ($) <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="sellingPrice"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="h-10 text-sm rounded-none"
                                        {...register("sellingPrice")}
                                        aria-invalid={errors.sellingPrice ? "true" : "false"}
                                    />
                                    {errors.sellingPrice && (
                                        <FieldError errors={[errors.sellingPrice]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Profit Margin Display */}
                        {watch('costPrice') && watch('sellingPrice') && (
                            <div className="rounded-md bg-muted p-3">
                                <p className="text-sm">
                                    Profit Margin:{' '}
                                    <span className="font-medium text-green-500">
                                        ${(parseFloat(watch('sellingPrice')) - parseFloat(watch('costPrice'))).toFixed(2)}
                                    </span>
                                    {' '}
                                    <span className="text-xs text-muted-foreground">
                                        ({((parseFloat(watch('sellingPrice')) - parseFloat(watch('costPrice'))) / parseFloat(watch('costPrice')) * 100).toFixed(1)}% markup)
                                    </span>
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto order-2 sm:order-1"
                                onClick={() => navigate(`/admin/products/${dummyProduct._id}`)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="w-full sm:w-auto order-1 sm:order-2"
                                disabled={!hasChanges() || isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Product'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default ProductEdit;