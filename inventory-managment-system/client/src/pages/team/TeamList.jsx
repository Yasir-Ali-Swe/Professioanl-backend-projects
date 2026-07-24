import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrganizationUsers, useUpdateOrganizationUser, useDeleteOrganizationUser } from '@/hooks/useOrganization';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useRedux';
import { getRolePrefix } from '@/lib/rolePaths';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Users,
    UserPlus,
    Search,
    Filter,
    ChevronDown,
    Eye,
    MoreVertical,
    CheckCircle,
    XCircle,
    UserCog,
    Trash2,
    ArrowUpDown,
    User,
    UserCheck,
    UserX,
    Shield,
    ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Dummy Data
const dummyUsers = {
    pagination: {
        currentPage: 1,
        totalPages: 3,
        totalUsers: 25,
        limit: 10,
        hasNextPage: true,
        hasPreviousPage: false,
    },
    data: [
        {
            _id: 'u1',
            name: 'John Smith',
            email: 'john@techcorp.com',
            role: 'admin',
            isActive: true,
            invitedBy: { _id: 'admin1', name: 'Super Admin', email: 'admin@stockpilot.com', role: 'super_admin' },
            createdAt: '2024-01-15T10:30:00Z',
        },
        {
            _id: 'u2',
            name: 'Jane Doe',
            email: 'jane@techcorp.com',
            role: 'manager',
            isActive: true,
            invitedBy: { _id: 'u1', name: 'John Smith', email: 'john@techcorp.com', role: 'admin' },
            createdAt: '2024-01-14T14:20:00Z',
        },
        {
            _id: 'u3',
            name: 'Bob Wilson',
            email: 'bob@techcorp.com',
            role: 'staff',
            isActive: true,
            invitedBy: { _id: 'u2', name: 'Jane Doe', email: 'jane@techcorp.com', role: 'manager' },
            createdAt: '2024-01-13T09:15:00Z',
        },
        {
            _id: 'u4',
            name: 'Alice Brown',
            email: 'alice@techcorp.com',
            role: 'staff',
            isActive: false,
            invitedBy: { _id: 'u1', name: 'John Smith', email: 'john@techcorp.com', role: 'admin' },
            createdAt: '2024-01-12T16:45:00Z',
        },
        {
            _id: 'u5',
            name: 'Charlie Davis',
            email: 'charlie@techcorp.com',
            role: 'manager',
            isActive: true,
            invitedBy: { _id: 'u1', name: 'John Smith', email: 'john@techcorp.com', role: 'admin' },
            createdAt: '2024-01-11T11:00:00Z',
        },
        {
            _id: 'u6',
            name: 'Eva Martinez',
            email: 'eva@techcorp.com',
            role: 'staff',
            isActive: true,
            invitedBy: { _id: 'u2', name: 'Jane Doe', email: 'jane@techcorp.com', role: 'manager' },
            createdAt: '2024-01-10T09:00:00Z',
        },
    ]
}
// User Detail Dialog Component
const UserDetailDialog = ({ user, open, onOpenChange, userRole }) => {
    const [selectedRole, setSelectedRole] = useState(user?.role || '');
    const updateMutation = useUpdateOrganizationUser();
    const deleteMutation = useDeleteOrganizationUser();

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role || '');
        }
    }, [user]);

    if (!user) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ✅ Check if user is admin
    const isAdmin = user?.role === 'admin';

    // ✅ Check if current user is manager
    const isManager = userRole === 'manager';

    // ✅ Manager cannot perform actions on admin users
    const isAdminUser = user?.role === 'admin';
    const canPerformActions = !(isManager && isAdminUser);

    const isUpdating = updateMutation.isPending || deleteMutation.isPending;

    const handleUpdateRole = async () => {
        if (selectedRole === user.role) return;

        // ✅ Manager cannot change admin role
        if (isManager && isAdminUser) {
            toast.error('You cannot modify admin users');
            return;
        }

        updateMutation.mutate({
            id: user._id,
            data: { role: selectedRole }
        }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    const handleToggleStatus = async () => {
        // ✅ Manager cannot toggle admin status
        if (isManager && isAdminUser) {
            toast.error('You cannot modify admin users');
            return;
        }

        updateMutation.mutate({
            id: user._id,
            data: { isActive: !user.isActive }
        }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    const handleDelete = async () => {
        // ✅ Manager cannot delete admin users
        if (isManager && isAdminUser) {
            toast.error('You cannot delete admin users');
            return;
        }

        if (confirm("Are you sure you want to delete this user?")) {
            deleteMutation.mutate(user._id, {
                onSuccess: () => {
                    onOpenChange(false);
                }
            });
        }
    };

    // ✅ Get available roles for dropdown based on user role
    const getAvailableRoles = () => {
        if (isManager) {
            // Manager can only assign staff or manager roles
            return ['manager', 'staff'];
        }
        // Admin can assign all roles
        return ['admin', 'manager', 'staff'];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                {user.name}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'} className="text-[10px]">
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </Badge>
                                <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                {isAdminUser && (
                                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                                        <ShieldAlert className="h-2.5 w-2.5 mr-1" />
                                        Protected
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogDescription>
                        Joined on {formatDate(user.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* User Info */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm border-b pb-2">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium">{user.email}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b pb-2">
                            <span className="text-muted-foreground">Role</span>
                            <span className="font-medium capitalize">{user.role}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b pb-2">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b pb-2">
                            <span className="text-muted-foreground">Invited By</span>
                            <span className="font-medium">{user.invitedBy?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Joined</span>
                            <span className="font-medium">{formatDate(user.createdAt)}</span>
                        </div>
                    </div>

                    {/* Actions - Only Admin can perform all actions, Manager has limited actions */}
                    {userRole === 'admin' && (
                        <>
                            <div className="border-t pt-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">Update Role</span>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="h-8 w-32 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Roles</SelectLabel>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleUpdateRole}
                                        disabled={selectedRole === user.role || isUpdating}
                                    >
                                        Update
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant={user.isActive ? 'destructive' : 'default'}
                                        size="sm"
                                        className="flex-1 h-8 text-xs"
                                        onClick={handleToggleStatus}
                                        disabled={isUpdating}
                                    >
                                        {user.isActive ? (
                                            <>
                                                <UserX className="mr-1 h-3 w-3" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="mr-1 h-3 w-3" />
                                                Activate
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="flex-1 h-8 text-xs"
                                        onClick={handleDelete}
                                        disabled={isUpdating}
                                    >
                                        <Trash2 className="mr-1 h-3 w-3" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ✅ Manager limited actions - only for non-admin users */}
                    {userRole === 'manager' && !isAdminUser && (
                        <>
                            <div className="border-t pt-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">Update Role</span>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="h-8 w-32 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Roles</SelectLabel>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleUpdateRole}
                                        disabled={selectedRole === user.role || isUpdating}
                                    >
                                        Update
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant={user.isActive ? 'destructive' : 'default'}
                                        size="sm"
                                        className="flex-1 h-8 text-xs"
                                        onClick={handleToggleStatus}
                                        disabled={isUpdating}
                                    >
                                        {user.isActive ? (
                                            <>
                                                <UserX className="mr-1 h-3 w-3" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="mr-1 h-3 w-3" />
                                                Activate
                                            </>
                                        )}
                                    </Button>
                                    {/* ✅ Manager cannot delete users */}
                                    {/* Delete button removed for manager */}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ✅ Manager viewing admin user - show restricted message */}
                    {userRole === 'manager' && isAdminUser && (
                        <div className="border-t pt-4">
                            <div className="bg-muted p-3 text-center">
                                <Shield className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                                <p className="text-sm text-muted-foreground">
                                    Admin users cannot be modified by Managers
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Only Admins can manage other Admins
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter showCloseButton={false}>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TeamList = () => {
    const { user } = useAuth();
    const role = user?.role || 'admin';
    const rolePrefix = getRolePrefix(role);
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedUser, setSelectedUser] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // ✅ Get user role from auth
    const userRole = user?.role || 'admin';

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const { data: response, isLoading, isError } = useOrganizationUsers({
        page,
        limit,
        search,
        role: roleFilter === 'all' ? undefined : roleFilter,
        isActive: status === 'all' ? undefined : (status === 'active' ? 'true' : 'false'),
        sortBy,
        order,
    });

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
                <p className="text-destructive font-medium">Failed to load team members</p>
                <p className="text-xs text-muted-foreground">Please try again.</p>
            </div>
        );
    }

    const users = response.data || [];
    const pagination = response.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalUsers: 0,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false,
    };

    const stats = response.stats || {
        adminCount: 0,
        managerCount: 0,
        staffCount: 0,
        activeCount: 0,
    };

    // Stats calculations
    const totalUsers = pagination.totalUsers;
    const adminCount = stats.adminCount;
    const managerCount = stats.managerCount;
    const staffCount = stats.staffCount;
    const activeCount = stats.activeCount;

    const filteredUsers = users;

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== 'all' && value !== '') {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        if (key !== 'page') {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const capitalize = (value) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const getPageNumbers = () => {
        const total = pagination.totalPages;
        const current = page;
        const pages = [];
        const maxVisible = 5;

        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (current > 3) {
                pages.push('ellipsis');
            }
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }
            if (current < total - 2) {
                pages.push('ellipsis');
            }
            if (!pages.includes(total)) {
                pages.push(total);
            }
        }
        return pages;
    };

    const paginatedUsers = filteredUsers;

    const openDetailDialog = (user) => {
        setSelectedUser(user);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team</h1>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Manage your organization's team members.
                    </p>
                </div>
                {/* ✅ Both Admin and Manager can invite users */}
                <Button className="w-full sm:w-auto" asChild>
                    <Link to={`/${rolePrefix}/team/invite`} className='flex items-center'>
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Invite User
                    </Link>
                </Button>
            </div>

            {/* Stats Cards - Admin sees all, Manager sees filtered stats */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Total Members</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">
                            {userRole === 'manager' ? filteredUsers.length : totalUsers}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Admins</CardTitle>
                        <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-primary">
                            {userRole === 'manager' ? 0 : adminCount}
                        </div>
                        {userRole === 'manager' && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Restricted</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Managers</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-blue-500">{managerCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Staff</CardTitle>
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold">{staffCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                        <CardTitle className="text-[10px] sm:text-xs font-medium">Active</CardTitle>
                        <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg sm:text-2xl font-bold text-green-500">
                            {userRole === 'manager' ? filteredUsers.filter(u => u.isActive).length : activeCount}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {Math.round(((userRole === 'manager' ? filteredUsers.filter(u => u.isActive).length : activeCount) / (userRole === 'manager' ? filteredUsers.length : totalUsers)) * 100)}% of total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative flex-1 min-w-37.5 sm:min-w-50">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                    />
                </div>

                {/* ✅ Role filter - Manager cannot see Admin option */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Role: {roleFilter === 'all' ? 'All' : capitalize(roleFilter)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Role</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('role', 'all')}>All</DropdownMenuItem>
                            {/* ✅ Manager cannot see Admin option in filter */}
                            {userRole !== 'manager' && (
                                <DropdownMenuItem onClick={() => updateFilter('role', 'admin')}>
                                    <UserCog className="mr-2 h-3.5 w-3.5 text-primary" />
                                    Admin
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateFilter('role', 'manager')}>
                                <Users className="mr-2 h-3.5 w-3.5 text-blue-500" />
                                Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('role', 'staff')}>
                                <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Staff
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Status: {status === 'all' ? 'All' : capitalize(status)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('status', 'all')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'active')}>
                                <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                                Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('status', 'inactive')}>
                                <XCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
                                Inactive
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                Sort: {sortBy === 'createdAt' ? 'Date' : capitalize(sortBy)}
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                        }
                    />
                    <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'name')}>
                                Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'email')}>
                                Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'role')}>
                                Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('sortBy', 'createdAt')}>
                                Date
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>Order</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateFilter('order', 'asc')}>
                                Ascending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateFilter('order', 'desc')}>
                                Descending
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {(search || roleFilter !== 'all' || status !== 'all' || sortBy !== 'createdAt' || order !== 'desc') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={() => {
                            const newParams = new URLSearchParams();
                            newParams.set('page', '1');
                            newParams.set('limit', '10');
                            setSearchParams(newParams);
                        }}
                    >
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-37.5">Name</TableHead>
                                <TableHead className="min-w-45">Email</TableHead>
                                <TableHead className="w-25">Role</TableHead>
                                <TableHead className="w-25">Status</TableHead>
                                <TableHead className="hidden md:table-cell">Invited By</TableHead>
                                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                <TableHead className="text-right w-15">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell className="font-medium">
                                            <button
                                                onClick={() => openDetailDialog(user)}
                                                className="hover:text-primary transition-colors text-xs sm:text-sm cursor-pointer"
                                            >
                                                {user.name}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'} className="text-[10px] sm:text-xs">
                                                {capitalize(user.role)}
                                            </Badge>
                                            {user.role === 'admin' && userRole === 'manager' && (
                                                <span className="text-[10px] text-muted-foreground ml-1">(Restricted)</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                            {user.invitedBy?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 sm:h-8 sm:w-8"
                                                onClick={() => openDetailDialog(user)}
                                            >
                                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t px-3 py-3 sm:px-4">
                    <div className="whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                        Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * limit, filteredUsers.length)}</span>{' '}
                        of <span className="font-medium">{filteredUsers.length}</span> results
                    </div>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page > 1) updateFilter('page', page - 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page <= 1 && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>
                            {getPageNumbers().map((p, index) => (
                                <PaginationItem key={index}>
                                    {p === 'ellipsis' ? (
                                        <PaginationEllipsis className="h-8 sm:h-9" />
                                    ) : (
                                        <PaginationLink
                                            href="#"
                                            isActive={p === page}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                updateFilter('page', p);
                                            }}
                                            className="h-8 sm:h-9 min-w-8 sm:min-w-9 text-xs sm:text-sm"
                                        >
                                            {p}
                                        </PaginationLink>
                                    )}
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page < pagination.totalPages) updateFilter('page', page + 1);
                                    }}
                                    className={cn(
                                        'h-8 sm:h-9 text-xs sm:text-sm',
                                        page >= pagination.totalPages && 'pointer-events-none opacity-50'
                                    )}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>

            {/* User Detail Dialog */}
            <UserDetailDialog
                user={selectedUser}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                userRole={userRole}
            />
        </div>
    );
};

export default TeamList;