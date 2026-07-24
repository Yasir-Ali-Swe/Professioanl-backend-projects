// pages/admin/OrganizationProfile.jsx
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from '@/components/ui/field';
import { Camera, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useRedux';
import { useOrganizationProfile, useUpdateOrganizationProfile, useUploadOrganizationLogo } from '@/hooks/useOrganization';
import { Badge } from '@/components/ui/badge';

// Dummy organization profile data
const DUMMY_ORG_PROFILE = {
    _id: 'org_123456789',
    name: 'TechCorp Inc.',
    contactEmail: 'info@techcorp.com',
    phone: '+1 234 567 8900',
    address: '123 Tech Street, Silicon Valley, CA 94025',
    logoUrl: 'https://ui-avatars.com/api/?name=TechCorp&background=6B46C1&color=fff&size=128',
    subscriptionPlan: {
        _id: 'plan_123',
        name: 'premium',
        price: 29.99,
        billingCycle: 'monthly',
    },
};

// Zod schema for validation
const orgProfileSchema = z.object({
    name: z.string().min(2, { message: 'Organization name must be at least 2 characters' }),
    contactEmail: z.string().email({ message: 'Please enter a valid email address' }),
    phone: z.string().min(6, { message: 'Phone number is required' }),
    address: z.string().min(5, { message: 'Address is required' }),
});

const OrganizationProfilePage = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'staff';

    // ✅ Check if user is admin (only admin can edit)
    const isAdmin = userRole === 'admin';

    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalValues, setOriginalValues] = useState({
        name: '',
        contactEmail: '',
        phone: '',
        address: '',
    });

    const { data: response, isLoading, isError } = useOrganizationProfile();
    const updateProfileMutation = useUpdateOrganizationProfile();
    const uploadLogoMutation = useUploadOrganizationLogo();

    const isPending = updateProfileMutation.isPending || uploadLogoMutation.isPending;
    const org = response?.data;

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(orgProfileSchema),
        defaultValues: {
            name: '',
            contactEmail: '',
            phone: '',
            address: '',
        },
    });

    const watchedName = watch('name');
    const watchedEmail = watch('contactEmail');
    const watchedPhone = watch('phone');
    const watchedAddress = watch('address');

    // Sync form values on profile load
    useEffect(() => {
        if (org) {
            reset({
                name: org.name || '',
                contactEmail: org.contactEmail || '',
                phone: org.phone || '',
                address: org.address || '',
            });
            setOriginalValues({
                name: org.name || '',
                contactEmail: org.contactEmail || '',
                phone: org.phone || '',
                address: org.address || '',
            });
            if (org.logoUrl) {
                setPreviewImage(org.logoUrl);
            }
        }
    }, [org, reset]);

    // Check if form has changes (only for admin)
    const hasChanges = () => {
        if (!isAdmin) return false;

        const currentName = watchedName || '';
        const currentEmail = watchedEmail || '';
        const currentPhone = watchedPhone || '';
        const currentAddress = watchedAddress || '';
        return (
            currentName !== originalValues.name ||
            currentEmail !== originalValues.contactEmail ||
            currentPhone !== originalValues.phone ||
            currentAddress !== originalValues.address ||
            selectedFile !== null
        );
    };

    // Handle image selection (only for admin)
    const handleImageSelect = (event) => {
        if (!isAdmin) return;

        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);
        }
    };

    // Handle image click to trigger file input (only for admin)
    const handleAvatarClick = () => {
        if (!isAdmin) return;
        fileInputRef.current?.click();
    };

    // Handle form submission (only for admin)
    const onSubmit = (values) => {
        if (!isAdmin) {
            toast.error('You do not have permission to update organization profile');
            return;
        }

        // If logo is selected, upload it first
        if (selectedFile) {
            const formData = new FormData();
            formData.append('image', selectedFile);
            uploadLogoMutation.mutate(formData, {
                onSuccess: () => {
                    setSelectedFile(null);
                }
            });
        }

        const hasFieldChanges =
            values.name !== originalValues.name ||
            values.contactEmail !== originalValues.contactEmail ||
            values.phone !== originalValues.phone ||
            values.address !== originalValues.address;

        if (hasFieldChanges) {
            updateProfileMutation.mutate(values, {
                onSuccess: () => {
                    setOriginalValues({
                        name: values.name,
                        contactEmail: values.contactEmail,
                        phone: values.phone,
                        address: values.address,
                    });
                    reset(values);
                }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !response?.success) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-2">
                <p className="text-destructive font-medium">Failed to load organization profile</p>
                <p className="text-xs text-muted-foreground">Please verify your credentials and try again.</p>
            </div>
        );
    }

    const avatarImage = previewImage || org?.logoUrl || '';
    const initials = org?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TC';

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-2xl p-6 sm:p-8">
                {/* Header */}
                <div className="text-center space-y-2 mb-6">
                    <div className="flex items-center justify-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">

                        View your organization's information
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-4">
                        {/* Organization Logo */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <Avatar
                                    className={cn(
                                        "h-24 w-24 transition-opacity",
                                        isAdmin ? "cursor-pointer hover:opacity-90" : "cursor-default"
                                    )}
                                    onClick={handleAvatarClick}
                                >
                                    <AvatarImage src={avatarImage} alt={org?.name} />
                                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        className={cn(
                                            "absolute bottom-0 right-0 bg-primary p-2 text-primary-foreground shadow-sm",
                                            "transition-all hover:bg-primary/90 hover:scale-110",
                                            "ring-2 ring-background rounded-full"
                                        )}
                                        onClick={handleAvatarClick}
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                        {selectedFile && isAdmin && (
                            <p className="text-center text-xs text-muted-foreground">
                                New logo selected: {selectedFile.name}
                            </p>
                        )}

                        {/* Row 1: Organization Name + Contact Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="name" className="text-sm font-medium">
                                    Organization Name {isAdmin && <span className="text-destructive">*</span>}
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter organization name"
                                        className="h-10 text-sm"
                                        {...register("name")}
                                        aria-invalid={errors.name ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.name && (
                                        <FieldError errors={[errors.name]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="contactEmail" className="text-sm font-medium">
                                    Contact Email {isAdmin && <span className="text-destructive">*</span>}
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        placeholder="Enter contact email"
                                        className="h-10 text-sm"
                                        {...register("contactEmail")}
                                        aria-invalid={errors.contactEmail ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.contactEmail && (
                                        <FieldError errors={[errors.contactEmail]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: Phone + Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="phone" className="text-sm font-medium">
                                    Phone {isAdmin && <span className="text-destructive">*</span>}
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="phone"
                                        type="text"
                                        placeholder="Enter phone number"
                                        className="h-10 text-sm"
                                        {...register("phone")}
                                        aria-invalid={errors.phone ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.phone && (
                                        <FieldError errors={[errors.phone]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="address" className="text-sm font-medium">
                                    Address {isAdmin && <span className="text-destructive">*</span>}
                                </FieldLabel>
                                <FieldContent>
                                    <Textarea
                                        id="address"
                                        placeholder="Enter organization address"
                                        className="min-h-20 text-sm resize-none"
                                        {...register("address")}
                                        aria-invalid={errors.address ? "true" : "false"}
                                        readOnly={!isAdmin}
                                        disabled={!isAdmin}
                                    />
                                    {errors.address && (
                                        <FieldError errors={[errors.address]} />
                                    )}
                                </FieldContent>
                            </Field>
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
                                    'Update Organization Profile'
                                )}
                            </Button>
                        )}
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default OrganizationProfilePage;