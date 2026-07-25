// layouts/Sidebar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useLogoutUser } from '@/hooks/useAuth';
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
    Bot,
    Package,
    Tags,
    Truck,
    Warehouse,
    Receipt,
    ShoppingCart,
    Users,
    FileText,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    ArrowDown,
    ArrowUp,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';

const ICONS = {
    LayoutDashboard,
    Building2,
    BarChart3,
    CreditCard,
    User,
    Settings,
    Bot,
    Package,
    Tags,
    Truck,
    Warehouse,
    Receipt,
    ShoppingCart,
    Users,
    FileText,
    AlertCircle,
    ArrowDown,
    ArrowUp,
};

const isUserRoute = (route) => route.section === 'account';
const isMainRoute = (route) => !isUserRoute(route);

export const Sidebar = ({ routes }) => {
    const location = useLocation();
    const user = useSelector(selectUser);
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const mainRoutes = routes.filter(isMainRoute);
    const userRoutes = routes.filter(isUserRoute);
    const logoutMutation = useLogoutUser();

    const isPathActive = (path) =>
        location.pathname === path || location.pathname.startsWith(path + '/');

    const [openDropdown, setOpenDropdown] = useState(() => {
        const activeParent = routes.find(
            (route) =>
                route.children?.length > 1 &&
                route.children.some((child) => isPathActive(child.path))
        );
        return activeParent?.path ?? null;
    });

    useEffect(() => {
        if (!openDropdown) return;

        const openRoute = routes.find((route) => route.path === openDropdown);
        const stillInsideOpenDropdown = openRoute?.children?.some((child) =>
            isPathActive(child.path)
        );

        if (!stillInsideOpenDropdown) {
            setOpenDropdown(null);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    const renderRouteItem = (route) => {
        const Icon = ICONS[route.icon] || LayoutDashboard;
        const hasSubItems = route.children && route.children.length > 1;

        if (hasSubItems) {
            const isGroupActive = route.children.some((child) => isPathActive(child.path));
            const isOpen = openDropdown === route.path;

            return (
                <Collapsible
                    key={route.path}
                    open={isOpen}
                    onOpenChange={(open) => setOpenDropdown(open ? route.path : null)}
                    className="group/collapsible"
                >
                    <SidebarMenuItem>
                        <CollapsibleTrigger
                            render={
                                <SidebarMenuButton
                                    isActive={isGroupActive}
                                    tooltip={isCollapsed ? route.label : ''}
                                />
                            }
                        >
                            <Icon className="h-4 w-4" />
                            <span>{route.label}</span>
                            {isOpen ? (
                                <ChevronUp className="ml-auto h-4 w-4" />
                            ) : (
                                <ChevronDown className="ml-auto h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {route.children.map((child) => (
                                    <SidebarMenuSubItem key={child.path}>
                                        <SidebarMenuSubButton
                                            render={<Link to={child.path} />}
                                            isActive={location.pathname === child.path}
                                        >
                                            <span>{child.label}</span>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            );
        }

        return (
            <SidebarMenuItem key={route.path}>
                <SidebarMenuButton
                    render={<Link to={route.path} />}
                    isActive={isPathActive(route.path)}
                    tooltip={isCollapsed ? route.label : ''}
                >
                    <Icon className="h-4 w-4" />
                    <span>{route.label}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <SidebarContainer collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex items-center gap-2 px-2 py-1">
                    <Boxes className="h-6 w-6 text-primary" />
                    {!isCollapsed && (
                        <span className="text-lg font-semibold text-sidebar-foreground">StockPilot</span>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="hide-scrollbar">
                <SidebarGroup>
                    {!isCollapsed && (
                        <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs">
                            Main
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1.5">
                            {mainRoutes.map(renderRouteItem)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {userRoutes.length > 0 && (
                    <SidebarGroup>
                        {!isCollapsed && (
                            <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs">
                                Account
                            </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1.5">
                                {userRoutes.map(renderRouteItem)}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                                    />
                                }
                            >
                                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                                    <AvatarFallback className="rounded-lg">
                                        {user?.name?.substring(0, 2)?.toUpperCase() || 'LR'}
                                    </AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                    <div className="grid flex-1 text-left text-sm leading-tight truncate">
                                        <span className="truncate font-medium">{user?.name || 'User'}</span>
                                        <span className="truncate text-xs text-muted-foreground capitalize">
                                            {user?.role?.replace('_', ' ') || 'Admin'}
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
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-md"
                                >
                                    <LogOutIcon className="mr-2 h-4 w-4" />
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