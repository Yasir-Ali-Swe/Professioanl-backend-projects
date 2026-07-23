import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';
import { useInviteOrganizationUser } from '@/hooks/useOrganization';
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldContent,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    Loader2,
    UserPlus,
    Eye,
    EyeOff,
} from 'lucide-react';

// Zod schema for validation
const inviteSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Please enter a valid email address' }),
    role: z.string().min(1, { message: 'Please select a role' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

// Role options based on user role
const getAvailableRoles = (role) => {
    if (role === 'admin') {
        return [
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Manager' },
            { value: 'staff', label: 'Staff' },
        ];
    }
    // Manager can only invite staff
    return [
        { value: 'staff', label: 'Staff' },
    ];
};

const InviteUser = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userRole = user?.role || 'staff';
    const rolePrefix = getRolePrefix(userRole);
    const [showPassword, setShowPassword] = useState(false);
    const availableRoles = getAvailableRoles(userRole);

    const inviteMutation = useInviteOrganizationUser();
    const isPending = inviteMutation.isPending;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            name: '',
            email: '',
            role: '',
            password: '',
        },
    });

    const selectedRole = watch('role');

    // Handle form submission
    const onSubmit = async (values) => {
        inviteMutation.mutate(values, {
            onSuccess: () => {
                navigate(`/${rolePrefix}/team`);
            }
        });
    };

    return (
        <div className="flex justify-center px-4 py-6 sm:py-8">
            <div className="w-full max-w-2xl">
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
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Invite User</h1>
                        <p className="text-sm text-muted-foreground">Add a new team member to your organization</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FieldGroup className="space-y-5">
                        {/* Row 1: Name + Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="name" className="text-sm font-medium">
                                    Full Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Enter full name"
                                        className="h-10 text-sm "
                                        {...register("name")}
                                        aria-invalid={errors.name ? "true" : "false"}
                                    />
                                    {errors.name && (
                                        <FieldError errors={[errors.name]} />
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="email" className="text-sm font-medium">
                                    Email Address <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@example.com"
                                        className="h-10 text-sm"
                                        {...register("email")}
                                        aria-invalid={errors.email ? "true" : "false"}
                                    />
                                    {errors.email && (
                                        <FieldError errors={[errors.email]} />
                                    )}
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Row 2: Role + Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field orientation="vertical">
                                <FieldLabel htmlFor="role" className="text-sm font-medium">
                                    Role <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <Select
                                        value={selectedRole}
                                        onValueChange={(value) => setValue('role', value)}
                                    >
                                        <SelectTrigger className="h-10 text-sm">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Roles</SelectLabel>
                                                {availableRoles.map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        {role.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors.role && (
                                        <FieldError errors={[errors.role]} />
                                    )}
                                    {userRole === 'manager' && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Managers can only invite Staff members
                                        </p>
                                    )}
                                </FieldContent>
                            </Field>

                            <Field orientation="vertical">
                                <FieldLabel htmlFor="password" className="text-sm font-medium">
                                    Temporary Password <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter temporary password"
                                            className="h-10 text-sm pr-10"
                                            {...register("password")}
                                            aria-invalid={errors.password ? "true" : "false"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <FieldError errors={[errors.password]} />
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        User will receive this password via email
                                    </p>
                                </FieldContent>
                            </Field>
                        </div>

                        {/* Info Box */}
                        <div className="bg-muted p-4">
                            <div className="flex items-start gap-3">
                                <UserPlus className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">What happens next?</p>
                                    <p className="text-xs text-muted-foreground">
                                        The user will receive an email with their login credentials.
                                        They can change their password after first login.
                                    </p>
                                </div>
                            </div>
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
                                        Inviting...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Invite User
                                    </>
                                )}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
};

export default InviteUser;