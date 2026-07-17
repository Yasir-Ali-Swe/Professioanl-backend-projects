// pages/admin/InvoiceSettings.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from '@/components/ui/field';
import { Loader2, Receipt, Percent, DollarSign, Hash, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useRedux';
import { Badge } from '@/components/ui/badge';

// Dummy invoice settings data
const DUMMY_INVOICE_SETTINGS = {
    taxRate: 10,
    defaultDiscount: 5,
    invoicePrefix: 'INV',
    nextInvoiceNumber: 45,
};

// Zod schema for validation
const invoiceSettingsSchema = z.object({
    taxRate: z.string()
        .min(1, { message: 'Tax rate is required' })
        .transform(val => parseFloat(val))
        .refine(val => val >= 0 && val <= 100, { message: 'Tax rate must be between 0 and 100' }),
    defaultDiscount: z.string()
        .min(1, { message: 'Default discount is required' })
        .transform(val => parseFloat(val))
        .refine(val => val >= 0, { message: 'Default discount must be 0 or greater' }),
    invoicePrefix: z.string()
        .min(1, { message: 'Invoice prefix is required' })
        .max(10, { message: 'Invoice prefix cannot exceed 10 characters' }),
});

const InvoiceSettingsPage = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'staff';

    // ✅ Check if user is admin (only admin can edit)
    const isAdmin = userRole === 'admin';

    const [isPending, setIsPending] = useState(false);
    const [originalValues, setOriginalValues] = useState({
        taxRate: DUMMY_INVOICE_SETTINGS.taxRate.toString(),
        defaultDiscount: DUMMY_INVOICE_SETTINGS.defaultDiscount.toString(),
        invoicePrefix: DUMMY_INVOICE_SETTINGS.invoicePrefix,
    });

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(invoiceSettingsSchema),
        defaultValues: {
            taxRate: DUMMY_INVOICE_SETTINGS.taxRate.toString(),
            defaultDiscount: DUMMY_INVOICE_SETTINGS.defaultDiscount.toString(),
            invoicePrefix: DUMMY_INVOICE_SETTINGS.invoicePrefix,
        },
    });

    const watchedTaxRate = watch('taxRate');
    const watchedDiscount = watch('defaultDiscount');
    const watchedPrefix = watch('invoicePrefix');

    // Check if form has changes (only for admin)
    const hasChanges = () => {
        if (!isAdmin) return false;

        const currentTaxRate = watchedTaxRate || '';
        const currentDiscount = watchedDiscount || '';
        const currentPrefix = watchedPrefix || '';
        return (
            currentTaxRate !== originalValues.taxRate ||
            currentDiscount !== originalValues.defaultDiscount ||
            currentPrefix !== originalValues.invoicePrefix
        );
    };

    // Handle form submission (only for admin)
    const onSubmit = (values) => {
        if (!isAdmin) {
            toast.error('You do not have permission to update invoice settings');
            return;
        }

        setIsPending(true);

        // Simulate API call
        setTimeout(() => {
            // Update original values
            setOriginalValues({
                taxRate: values.taxRate,
                defaultDiscount: values.defaultDiscount,
                invoicePrefix: values.invoicePrefix,
            });

            // Show success toast
            toast.success('Invoice settings updated successfully');

            // Reset form with new values
            reset(values);

            setIsPending(false);
        }, 1500);
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-2xl p-6 sm:p-8">
                {/* Header */}
                <div className="text-center space-y-2 mb-6">
                    <div className="flex items-center justify-center gap-3">
                        <Receipt className="h-6 w-6 text-muted-foreground" />
                        <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Configure your organization's invoice preferences
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-4">
                        {/* Row 1: Tax Rate + Default Discount */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="taxRate" className="text-sm font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                        Tax Rate (%) {isAdmin && <span className="text-destructive">*</span>}
                                    </div>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="taxRate"
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter tax rate"
                                        className="h-10 text-sm"
                                        {...register("taxRate")}
                                        aria-invalid={errors.taxRate ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.taxRate && (
                                        <FieldError errors={[errors.taxRate]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="defaultDiscount" className="text-sm font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                        Default Discount ($) {isAdmin && <span className="text-destructive">*</span>}
                                    </div>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="defaultDiscount"
                                        type="number"
                                        step="0.01"
                                        placeholder="Enter default discount"
                                        className="h-10 text-sm"
                                        {...register("defaultDiscount")}
                                        aria-invalid={errors.defaultDiscount ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.defaultDiscount && (
                                        <FieldError errors={[errors.defaultDiscount]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: Invoice Prefix (Full Width) */}
                        <div className="grid grid-cols-1 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="invoicePrefix" className="text-sm font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                        Invoice Prefix {isAdmin && <span className="text-destructive">*</span>}
                                    </div>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="invoicePrefix"
                                        type="text"
                                        placeholder="Enter invoice prefix (e.g., INV, BILL)"
                                        className="h-10 text-sm uppercase"
                                        {...register("invoicePrefix")}
                                        aria-invalid={errors.invoicePrefix ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                        onChange={(e) => {
                                            if (isAdmin) {
                                                e.target.value = e.target.value.toUpperCase();
                                                register("invoicePrefix").onChange(e);
                                            }
                                        }}
                                    />
                                    {errors.invoicePrefix && (
                                        <FieldError errors={[errors.invoicePrefix]} />
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Current next invoice number: <span className="font-medium text-primary">#{DUMMY_INVOICE_SETTINGS.nextInvoiceNumber}</span>
                                    </p>
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Info Box */}
                        <div className="rounded-md bg-muted p-4">
                            <div className="flex items-start gap-3">
                                <Receipt className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">About Invoice Settings</p>
                                    <p className="text-xs text-muted-foreground">
                                        Tax rate and default discount will be applied to all new invoices.
                                        The invoice prefix is used to generate invoice numbers (e.g., INV-0001).
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Update Button - Only visible to Admin */}
                        {isAdmin && (
                            <Button
                                type="submit"
                                className="w-full h-10 text-sm font-medium"
                                disabled={!hasChanges() || isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Invoice Settings'
                                )}
                            </Button>
                        )}
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default InvoiceSettingsPage;