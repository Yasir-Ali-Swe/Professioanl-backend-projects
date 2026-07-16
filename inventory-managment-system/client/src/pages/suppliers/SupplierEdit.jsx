// pages/suppliers/SupplierEdit.jsx
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

// Dummy Supplier Data
const dummySupplier = {
    _id: 's1',
    name: 'TechSupply Co.',
    contactPerson: 'John Smith',
    email: 'john@techsupply.com',
    phone: '+1 234 567 8900',
    address: '123 Tech Street, Silicon Valley, CA 94025',
    leadTimeDays: 5,
    createdBy: 'John Doe (admin)',
    createdAt: '2024-01-15T10:30:00Z',
    productsCount: 45,
};

// Zod schema for validation
const supplierSchema = z.object({
    name: z.string().min(2, { message: 'Supplier name must be at least 2 characters' }),
    contactPerson: z.string().min(2, { message: 'Contact person name is required' }),
    email: z.string().email({ message: 'Please enter a valid email address' }).optional().or(z.literal('')),
    phone: z.string().min(6, { message: 'Phone number is required' }),
    address: z.string().min(5, { message: 'Address is required' }),
    leadTimeDays: z.string().optional().transform(val => val ? parseInt(val) : null),
});

const SupplierEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isPending, setIsPending] = useState(false);
    const [supplier] = useState(dummySupplier);
    const [originalValues, setOriginalValues] = useState({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email || '',
        phone: supplier.phone,
        address: supplier.address,
        leadTimeDays: supplier.leadTimeDays?.toString() || '',
    });

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            email: supplier.email || '',
            phone: supplier.phone,
            address: supplier.address,
            leadTimeDays: supplier.leadTimeDays?.toString() || '',
        },
    });

    const watchedName = watch('name');
    const watchedContactPerson = watch('contactPerson');
    const watchedEmail = watch('email');
    const watchedPhone = watch('phone');
    const watchedAddress = watch('address');
    const watchedLeadTimeDays = watch('leadTimeDays');

    // Check if form has changes
    const hasChanges = () => {
        return (
            watchedName !== originalValues.name ||
            watchedContactPerson !== originalValues.contactPerson ||
            watchedEmail !== originalValues.email ||
            watchedPhone !== originalValues.phone ||
            watchedAddress !== originalValues.address ||
            watchedLeadTimeDays !== originalValues.leadTimeDays
        );
    };

    // Handle form submission
    const onSubmit = async (values) => {
        setIsPending(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setOriginalValues({
                name: values.name,
                contactPerson: values.contactPerson,
                email: values.email || '',
                phone: values.phone,
                address: values.address,
                leadTimeDays: values.leadTimeDays?.toString() || '',
            });
            reset(values);
            toast.success('Supplier updated successfully!');
            navigate(`/admin/suppliers/${supplier._id}`);
        } catch (error) {
            toast.error(error.message || 'Failed to update supplier. Please try again.');
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
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-full">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Supplier</h1>
                            <Badge variant="outline" className="text-[10px]">
                                <Package className="h-2.5 w-2.5 mr-1" />
                                {supplier.productsCount} products
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Update supplier information</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-5">
                        {/* Row 1: Supplier Name + Contact Person */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="name" className="text-sm font-medium">
                                    Supplier Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter supplier name"
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
                                <FieldLabel htmlFor="contactPerson" className="text-sm font-medium">
                                    Contact Person <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="contactPerson"
                                        type="text"
                                        placeholder="Enter contact person name"
                                        className="h-10 text-sm rounded-none"
                                        {...register("contactPerson")}
                                        aria-invalid={errors.contactPerson ? "true" : "false"}
                                    />
                                    {errors.contactPerson && (
                                        <FieldError errors={[errors.contactPerson]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: Email + Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="email" className="text-sm font-medium">
                                    Email <span className="text-xs text-muted-foreground">(Optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="supplier@example.com"
                                        className="h-10 text-sm rounded-none"
                                        {...register("email")}
                                        aria-invalid={errors.email ? "true" : "false"}
                                    />
                                    {errors.email && (
                                        <FieldError errors={[errors.email]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="phone" className="text-sm font-medium">
                                    Phone <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="phone"
                                        type="text"
                                        placeholder="+1 234 567 8900"
                                        className="h-10 text-sm rounded-none"
                                        {...register("phone")}
                                        aria-invalid={errors.phone ? "true" : "false"}
                                    />
                                    {errors.phone && (
                                        <FieldError errors={[errors.phone]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 3: Address + Lead Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="address" className="text-sm font-medium">
                                    Address <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Textarea
                                        id="address"
                                        placeholder="Enter full address"
                                        className="min-h-20 text-sm rounded-none resize-none"
                                        {...register("address")}
                                        aria-invalid={errors.address ? "true" : "false"}
                                    />
                                    {errors.address && (
                                        <FieldError errors={[errors.address]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="leadTimeDays" className="text-sm font-medium">
                                    Lead Time (Days) <span className="text-xs text-muted-foreground">(Optional)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="leadTimeDays"
                                        type="number"
                                        placeholder="e.g., 5"
                                        className="h-10 text-sm rounded-none"
                                        {...register("leadTimeDays")}
                                    />
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto order-2 sm:order-1"
                                onClick={() => navigate(`/admin/suppliers/${supplier._id}`)}
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
                                    'Update Supplier'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default SupplierEdit;