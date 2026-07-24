import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useUserProfile, useUpdateUserProfile, useUploadUserProfileImage } from '@/hooks/useUser';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
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

// Dummy profile data
const DUMMY_PROFILE = {
    _id: 'sa_123456789',
    name: 'Super Admin',
    email: 'superadmin@stockpilot.com',
    imageUrl: 'https://ui-avatars.com/api/?name=Super+Admin&background=6B46C1&color=fff&size=128',
};

// Zod schema for validation
const profileSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
});

const SuperAdminProfilePage = () => {
    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [originalValues, setOriginalValues] = useState({
        name: '',
        email: ''
    });

    const { data: response, isLoading, isError } = useUserProfile();
    const updateProfileMutation = useUpdateUserProfile();
    const uploadImageMutation = useUploadUserProfileImage();

    const isPending = updateProfileMutation.isPending || uploadImageMutation.isPending;
    const user = response?.data;

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    const watchedName = watch('name');
    const watchedEmail = watch('email');

    // Sync form values on user load
    useEffect(() => {
        if (user) {
            reset({
                name: user.name || '',
                email: user.email || '',
            });
            setOriginalValues({
                name: user.name || '',
                email: user.email || '',
            });
            if (user.imageUrl) {
                setPreviewImage(user.imageUrl);
            }
        }
    }, [user, reset]);

    // Check if form has changes
    const hasChanges = () => {
        const currentName = watchedName || '';
        const currentEmail = watchedEmail || '';
        return (
            currentName !== originalValues.name ||
            currentEmail !== originalValues.email ||
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
        if (selectedFile) {
            const formData = new FormData();
            formData.append('image', selectedFile);
            uploadImageMutation.mutate(formData, {
                onSuccess: () => {
                    setSelectedFile(null);
                }
            });
        }

        const hasFieldChanges =
            values.name !== originalValues.name ||
            values.email !== originalValues.email;

        if (hasFieldChanges) {
            updateProfileMutation.mutate(values, {
                onSuccess: () => {
                    setOriginalValues({
                        name: values.name,
                        email: values.email,
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
                <p className="text-destructive font-medium">Failed to load profile</p>
                <p className="text-xs text-muted-foreground">Please check your network and try again.</p>
            </div>
        );
    }

    const avatarImage = previewImage || user?.imageUrl || '';
    const initials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-md p-6 sm:p-8">
                {/* Header */}
                <div className="text-center space-y-2 mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your personal information
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-4">
                        {/* Profile Image */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <Avatar
                                    className="h-24 w-24 cursor-pointer transition-opacity hover:opacity-90"
                                    onClick={handleAvatarClick}
                                >
                                    <AvatarImage src={avatarImage} alt={user?.name} />
                                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
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
                                New image selected: {selectedFile.name}
                            </p>
                        )}

                        {/* Name Field */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="name" className="text-sm font-medium">
                                Full Name <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    className="h-10 text-sm"
                                    {...register("name")}
                                    aria-invalid={errors.name ? "true" : "false"}
                                />
                                {errors.name && (
                                    <FieldError errors={[errors.name]} />
                                )}
                            </FieldContent>
                        </Field>

                        {/* Email Field */}
                        <Field orientation="vertical">
                            <FieldLabel htmlFor="email" className="text-sm font-medium">
                                Email Address <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="h-10 text-sm"
                                    {...register("email")}
                                    aria-invalid={errors.email ? "true" : "false"}
                                />
                                {errors.email && (
                                    <FieldError errors={[errors.email]} />
                                )}
                            </FieldContent>
                        </Field>

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
                                'Update Profile'
                            )}
                        </Button>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default SuperAdminProfilePage;