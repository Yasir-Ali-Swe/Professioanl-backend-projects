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
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalValues, setOriginalValues] = useState({
        name: DUMMY_ORG_PROFILE.name,
        contactEmail: DUMMY_ORG_PROFILE.contactEmail,
        phone: DUMMY_ORG_PROFILE.phone,
        address: DUMMY_ORG_PROFILE.address,
    });
    const [isPending, setIsPending] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(orgProfileSchema),
        defaultValues: {
            name: DUMMY_ORG_PROFILE.name,
            contactEmail: DUMMY_ORG_PROFILE.contactEmail,
            phone: DUMMY_ORG_PROFILE.phone,
            address: DUMMY_ORG_PROFILE.address,
        },
    });

    const watchedName = watch('name');
    const watchedEmail = watch('contactEmail');
    const watchedPhone = watch('phone');
    const watchedAddress = watch('address');

    // Set initial image preview
    useEffect(() => {
        if (DUMMY_ORG_PROFILE.logoUrl) {
            setPreviewImage(DUMMY_ORG_PROFILE.logoUrl);
        }
    }, []);

    // Check if form has changes
    const hasChanges = () => {
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

    // Handle image selection
    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewImage(objectUrl);
        }
    };

    // Handle image click to trigger file input
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // Handle form submission
    const onSubmit = (values) => {
        setIsPending(true);

        // Simulate API call
        setTimeout(() => {
            // Update original values
            setOriginalValues({
                name: values.name,
                contactEmail: values.contactEmail,
                phone: values.phone,
                address: values.address,
            });

            // Show success toast
            toast.success('Organization profile updated successfully');

            // Reset form with new values
            reset(values);

            // Clear preview and selected file
            setPreviewImage(null);
            setSelectedFile(null);

            setIsPending(false);
        }, 1500);
    };

    const avatarImage = previewImage || DUMMY_ORG_PROFILE.logoUrl || '';
    const initials = DUMMY_ORG_PROFILE.name
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
                    <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your organization's information
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-4">
                        {/* Organization Logo */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <Avatar
                                    className="h-24 w-24 cursor-pointer transition-opacity hover:opacity-90"
                                    onClick={handleAvatarClick}
                                >
                                    <AvatarImage src={avatarImage} alt={DUMMY_ORG_PROFILE.name} />
                                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <button
                                    type="button"
                                    className={cn(
                                        "absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-sm",
                                        "transition-all hover:bg-primary/90 hover:scale-110",
                                        "ring-2 ring-background"
                                    )}
                                    onClick={handleAvatarClick}
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                            </div>
                        </div>
                        {selectedFile && (
                            <p className="text-center text-xs text-muted-foreground">
                                New logo selected: {selectedFile.name}
                            </p>
                        )}

                        {/* Row 1: Organization Name + Contact Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="name" className="text-sm font-medium">
                                    Organization Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter organization name"
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
                                <FieldLabel htmlFor="contactEmail" className="text-sm font-medium">
                                    Contact Email <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        placeholder="Enter contact email"
                                        className="h-10 text-sm"
                                        {...register("contactEmail")}
                                        aria-invalid={errors.contactEmail ? "true" : "false"}
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
                                    Phone <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="phone"
                                        type="text"
                                        placeholder="Enter phone number"
                                        className="h-10 text-sm"
                                        {...register("phone")}
                                        aria-invalid={errors.phone ? "true" : "false"}
                                    />
                                    {errors.phone && (
                                        <FieldError errors={[errors.phone]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="address" className="text-sm font-medium">
                                    Address <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Textarea
                                        id="address"
                                        placeholder="Enter organization address"
                                        className="min-h-20 text-sm resize-none"
                                        {...register("address")}
                                        aria-invalid={errors.address ? "true" : "false"}
                                    />
                                    {errors.address && (
                                        <FieldError errors={[errors.address]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Update Button */}
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
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default OrganizationProfilePage;