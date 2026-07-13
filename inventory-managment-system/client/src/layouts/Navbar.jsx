// layouts/Navbar.jsx
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    LogOutIcon,
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
import { getDefaultDashboardPath } from '@/routes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const isIdLike = (segment) => /^\d+$/.test(segment) || /^[0-9a-fA-F]{16,}$/.test(segment);
const buildBreadcrumbs = (routes, pathname, userRole) => {
    const dashboardPath = getDefaultDashboardPath(userRole);
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', path: dashboardPath }];

    let currentPath = '';
    for (const segment of pathSegments) {
        currentPath += `/${segment}`;
        if (currentPath === dashboardPath) continue;

        const route = routes.find((r) => r.path === currentPath);

        if (route) {
            breadcrumbs.push({ label: route.label, path: currentPath });
        } else if (isIdLike(segment)) {
            breadcrumbs.push({ label: 'Details', path: currentPath });
        }
    }

    return breadcrumbs;
};

export const Navbar = ({ routes }) => {
    const location = useLocation();
    const user = useSelector(selectUser);

    const breadcrumbs = buildBreadcrumbs(routes, location.pathname, user?.role);
    const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-sidebar px-4 sm:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent hover:text-accent-foreground" />

                <nav className="hidden sm:flex" aria-label="Breadcrumb">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((item, index) => {
                                const isLast = index === breadcrumbs.length - 1;
                                return (
                                    <Fragment key={item.path}>
                                        <BreadcrumbItem>
                                            {isLast ? (
                                                <BreadcrumbPage className="font-semibold text-foreground">
                                                    {item.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink
                                                    render={<Link to={item.path} />}
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {item.label}
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {!isLast && <BreadcrumbSeparator />}
                                    </Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </nav>

                <span className="text-sm font-semibold text-foreground sm:hidden">{pageTitle}</span>
            </div>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg hover:bg-accent"
                >
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                </Button>

                <div className="rounded-md">
                    <ThemeToggle />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full hover:bg-accent"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        LR
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        }
                    />
                    <DropdownMenuContent
                        align="end"
                        sideOffset={10}
                        className="w-56 bg-card border-border"
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground">
                                <BadgeCheckIcon />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground">
                                <CreditCardIcon />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground">
                                <BellIcon />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                            <LogOutIcon />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};