// pages/categories/CategoryEdit.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';

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
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

// Dummy Category Data
const dummyCategory = {
    _id: 'c1',
    name: 'Electronics',
    categorySlug: 'electronics',
    createdBy: { name: 'John Doe', role: 'admin' },
    createdAt: '2024-01-15T10:30:00Z',
    productsCount: 45,
    isActive: true,
};

// Zod schema for validation
const categorySchema = z.object({
    name: z.string().min(2, { message: 'Category name must be at least 2 characters' }),
});

const CategoryEdit = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const navigate = useNavigate();
    const [isPending, setIsPending] = useState(false);
    const [category] = useState(dummyCategory);
    const [originalValues, setOriginalValues] = useState({
        name: category.name,
    });

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: category.name,
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
    const originalSlug = category.categorySlug;

    // Check if form has changes
    const hasChanges = () => {
        return watchedName !== originalValues.name;
    };

    // Handle form submission
    const onSubmit = async (values) => {
        setIsPending(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setOriginalValues({ name: values.name });
            reset(values);
            toast.success('Category updated successfully!');
            navigate(`/${rolePrefix}/categories/${category._id}`);
        } catch (error) {
            toast.error(error.message || 'Failed to update category. Please try again.');
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
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Category</h1>
                            <Badge variant={category.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                                <Package className="h-2.5 w-2.5 mr-1" />
                                {category.productsCount} products
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Update category information</p>
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
                                    className="h-10 text-sm rounded-none"
                                    {...register("name")}
                                    aria-invalid={errors.name ? "true" : "false"}
                                />
                                {errors.name && (
                                    <FieldError errors={[errors.name]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Slug Preview */}
                        <div className="rounded-md bg-muted p-3">
                            <p className="text-sm">
                                Current Slug:{' '}
                                <span className="font-mono text-sm font-medium">
                                    {originalSlug}
                                </span>
                            </p>
                            {watchedName !== originalValues.name && watchedName && (
                                <p className="text-sm mt-1">
                                    New Slug:{' '}
                                    <span className="font-mono text-sm font-medium text-primary">
                                        {slug}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full sm:w-auto order-2 sm:order-1"
                                onClick={() => navigate(`/${rolePrefix}/categories/${category._id}`)}
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
                                    'Update Category'
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default CategoryEdit;