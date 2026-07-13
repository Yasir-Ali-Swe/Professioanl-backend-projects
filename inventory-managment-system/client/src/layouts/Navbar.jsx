// layouts/Navbar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    LogOutIcon,
    ChevronRight,
    Home,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { selectUser } from '@/store/slices/authSlice';
import { useAuth } from '@/hooks/useRedux';
import { getDefaultDashboardPath } from '@/routes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Navbar = ({ routes }) => {
    const location = useLocation();
    const user = useSelector(selectUser);

    const currentRoute = routes.find(r => r.path === location.pathname);
    const pageTitle = currentRoute?.label || 'Dashboard';

    const getBreadcrumbs = () => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs = [];

        breadcrumbs.push({
            label: 'Home',
            path: getDefaultDashboardPath(user?.role),
        });

        let currentPath = '';
        for (const segment of pathSegments) {
            currentPath += `/${segment}`;
            const route = routes.find(r => r.path === currentPath);
            if (route) {
                breadcrumbs.push({
                    label: route.label,
                    path: currentPath,
                });
            }
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-sidebar px-4 sm:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <SidebarTrigger className="h-8 w-8 text-foreground" />

                <nav className="hidden sm:flex" aria-label="Breadcrumb">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((item, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <BreadcrumbItem key={item.path}>
                                        {index === 0 && (
                                            <BreadcrumbLink asChild>
                                                <Link to={item.path}>
                                                    <Home className="h-3.5 w-3.5 text-foreground" />
                                                </Link>
                                            </BreadcrumbLink>
                                        )}
                                        {index > 0 && !isLast && (
                                            <BreadcrumbLink asChild>
                                                <Link to={item.path}>{item.label}</Link>
                                            </BreadcrumbLink>
                                        )}
                                        {isLast && index > 0 && (
                                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                        )}
                                        {index < breadcrumbs.length - 1 && index > 0 && (
                                            <BreadcrumbSeparator>
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </BreadcrumbSeparator>
                                        )}
                                    </BreadcrumbItem>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </nav>

                <span className="text-sm font-medium sm:hidden">{pageTitle}</span>
            </div>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                    <Bell className="h-4 w-4 text-foreground" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>

                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full"><Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                        <AvatarFallback>LR</AvatarFallback>
                    </Avatar></Button>} />
                    <DropdownMenuContent align="end">
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
            </div>
        </header>
    );
};