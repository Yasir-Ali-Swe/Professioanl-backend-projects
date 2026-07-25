// layouts/Navbar.jsx
import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getBreadcrumbs } from '@/routes/breadcrumbsConfig';
import {
    BadgeCheckIcon,
    BellIcon,
    CreditCardIcon,
    LogOutIcon,
    Bell,
    Boxes
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
import { useLogoutUser } from '@/hooks/useAuth';
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
    const reduxState = useSelector((state) => state);
    const logoutMutation = useLogoutUser();

    const breadcrumbs = getBreadcrumbs(location.pathname, user?.role, reduxState);
    const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-sidebar px-4 sm:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent hover:text-accent-foreground" />

                <nav className="hidden sm:flex" aria-label="Breadcrumb">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((item, index) => {
                                const isLast = index === breadcrumbs.length - 1 || !item.path;
                                return (
                                    <Fragment key={`${item.label}-${index}`}>
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
                                        {user?.name?.substring(0, 2)?.toUpperCase() || 'LR'}
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
                            <DropdownMenuItem
                                render={<Link to={`/${user?.role || 'admin'}/profile`} />}
                                className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground"
                            >
                                <BadgeCheckIcon className="mr-2 h-4 w-4" />
                                Account Profile
                            </DropdownMenuItem>

                            {user?.role !== 'super-admin' && (
                                <DropdownMenuItem
                                    render={<Link to={`/${user?.role || 'admin'}/organization-profile`} />}
                                    className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground"
                                >
                                    <Boxes className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Organization Profile
                                </DropdownMenuItem>
                            )}

                            {user?.role === 'admin' && (
                                <DropdownMenuItem
                                    render={<Link to="/admin/billing" />}
                                    className="cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground"
                                >
                                    <CreditCardIcon className="mr-2 h-4 w-4" />
                                    Billing & Plan
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-md"
                        >
                            <LogOutIcon className="mr-2 h-4 w-4" />
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};