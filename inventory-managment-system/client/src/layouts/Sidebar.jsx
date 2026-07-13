// layouts/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    Boxes,
    LayoutDashboard,
    Building2,
    BarChart3,
    CreditCard,
    User,
    Settings,
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    LogOutIcon,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { selectUser } from '@/store/slices/authSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sidebar as SidebarContainer,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';

// Icon mapping
const iconMap = {
    LayoutDashboard: LayoutDashboard,
    Building2: Building2,
    BarChart3: BarChart3,
    CreditCard: CreditCard,
    User: User,
    Settings: Settings,
};

export const Sidebar = ({ routes }) => {
    const location = useLocation();
    const user = useSelector(selectUser);
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    // Super Admin Main Routes
    const mainRoutes = routes.filter(r =>
        ['/dashboard', '/super-admin/organizations', '/super-admin/analytics', '/super-admin/subscriptions'].includes(r.path)
    );

    // User Routes (Profile & Settings)
    const userRoutes = routes.filter(r =>
        ['/profile', '/settings'].includes(r.path)
    );

    return (
        <SidebarContainer collapsible="icon" variant="sidebar">
            {/* Header - Logo */}
            <SidebarHeader className="border-b">
                <div className="flex items-center gap-2 px-2 py-1">
                    <Boxes className="h-6 w-6" />
                    {!isCollapsed && (
                        <span className="text-lg font-semibold">StockPilot</span>
                    )}
                </div>
            </SidebarHeader>

            {/* Content - Navigation */}
            <SidebarContent>
                {/* Main Group */}
                <SidebarGroup>
                    {!isCollapsed && (
                        <SidebarGroupLabel>Main</SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1.5">
                            {mainRoutes.map((route) => {
                                const Icon = iconMap[route.icon] || LayoutDashboard;
                                const isActive = location.pathname === route.path ||
                                    location.pathname.startsWith(route.path + '/');

                                return (
                                    <SidebarMenuItem key={route.path}>
                                        <SidebarMenuButton
                                            render={<Link to={route.path} />}
                                            isActive={isActive}
                                            tooltip={isCollapsed ? route.label : ''}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{route.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* User Group - Profile & Settings */}
                {userRoutes.length > 0 && (
                    <SidebarGroup>
                        {!isCollapsed && (
                            <SidebarGroupLabel>Account</SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1.5">
                                {userRoutes.map((route) => {
                                    const Icon = iconMap[route.icon] || Settings;
                                    const isActive = location.pathname === route.path;

                                    return (
                                        <SidebarMenuItem key={route.path}>
                                            <SidebarMenuButton
                                                render={<Link to={route.path} />}
                                                isActive={isActive}
                                                tooltip={isCollapsed ? route.label : ''}
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span>{route.label}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            {/* Footer - User Info */}
            <SidebarFooter className="border-t">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                                    />
                                }
                            >
                                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                                    <AvatarFallback className="rounded-lg">LR</AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                    <div className="grid flex-1 text-left text-sm leading-tight truncate">
                                        <span className="truncate font-medium">{user?.name}</span>
                                        <span className="truncate text-xs text-muted-foreground capitalize">
                                            {user?.role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                side={isCollapsed ? 'right' : 'top'}
                                sideOffset={8}
                                className="w-56"
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <BadgeCheckIcon />
                                        Account
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <CreditCardIcon />
                                        Billing
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <BellIcon />
                                        Notifications
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <LogOutIcon />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </SidebarContainer>
    );
};