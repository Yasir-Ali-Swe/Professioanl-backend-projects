// pages/suppliers/SupplierAdd.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateSupplier } from '@/hooks/useSupplier';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Zod schema for validation
const supplierSchema = z.object({
    name: z.string().min(2, { message: 'Supplier name must be at least 2 characters' }),
    contactPerson: z.string().min(2, { message: 'Contact person name is required' }),
    email: z.string().email({ message: 'Please enter a valid email address' }).optional().or(z.literal('')),
    phone: z.string().min(6, { message: 'Phone number is required' }),
    address: z.string().min(5, { message: 'Address is required' }),
    leadTimeDays: z.string().optional().transform(val => val ? parseInt(val) : null),
});

const SupplierAdd = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const rolePrefix = getRolePrefix(role);

    const createMutation = useCreateSupplier();
    const isPending = createMutation.isPending;

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            leadTimeDays: '',
        },
    });

    // Handle form submission
    const onSubmit = async (values) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                navigate(`/${rolePrefix}/suppliers`);
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
                        onClick={() => navigate(`/${rolePrefix}/suppliers`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-full">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Add New Supplier</h1>
                        <p className="text-sm text-muted-foreground">Create a new supplier in your catalog</p>
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
                                        className="h-10 text-sm"
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
                                        className="h-10 text-sm"
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
                                        className="h-10 text-sm"
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
                                        className="h-10 text-sm"
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
                                        className="min-h-20 text-sm resize-none"
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
                                        className="h-10 text-sm"
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
                                onClick={() => navigate(-1)}
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
                                        Creating...
                                    </>
                                ) : (
                                    'Create Supplier'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default SupplierAdd;