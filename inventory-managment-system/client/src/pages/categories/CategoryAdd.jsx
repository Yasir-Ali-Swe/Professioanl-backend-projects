// pages/categories/CategoryAdd.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useCreateCategory } from '@/hooks/useCategory';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Zod schema for validation
const categorySchema = z.object({
    name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
});

const CategoryAdd = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);

    const createMutation = useCreateCategory();
    const isPending = createMutation.isPending;

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
        },
    });

    const watchedName = watch('name');

    // Generate slug from name
    const generateSlug = (name) => {
        if (!name) return '';
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const slug = generateSlug(watchedName);

    // Handle form submission
    const onSubmit = async (values) => {
        createMutation.mutate(values, {
            onSuccess: () => {
                navigate(`/${rolePrefix}/categories`);
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
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Add New Category</h1>
                        <p className="text-sm text-muted-foreground">Create a new product category</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-5">
                        {/* Category Name */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="name" className="text-sm font-medium">
                                Category Name <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Enter category name"
                                    className="h-10 text-sm "
                                    {...register("name")}
                                    aria-invalid={errors.name ? "true" : "false"}
                                />
                                {errors.name && (
                                    <FieldError errors={[errors.name]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Slug Preview */}
                        {watchedName && (
                            <div className="bg-muted p-3">
                                <p className="text-sm">
                                    Slug:{' '}
                                    <span className="font-mono text-sm font-medium">
                                        {slug}
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
                                    'Create Category'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default CategoryAdd;