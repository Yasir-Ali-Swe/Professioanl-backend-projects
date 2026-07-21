import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    Boxes,
    BadgeCheckIcon,
    CreditCardIcon,
    BellIcon,
    LogOutIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { selectUser } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';

// Dummy conversation data
const dummyConversations = [
    { id: '1', title: 'Inventory Optimization', updatedAt: '2024-07-15T10:30:00Z' },
    { id: '2', title: 'Low Stock Analysis', updatedAt: '2024-07-14T14:20:00Z' },
    { id: '3', title: 'Supplier Performance Review', updatedAt: '2024-07-13T09:15:00Z' },
    { id: '4', title: 'Sales Forecasting Q3', updatedAt: '2024-07-12T16:45:00Z' },
    { id: '5', title: 'Warehouse Utilization Report', updatedAt: '2024-07-11T11:00:00Z' },
    { id: '6', title: 'Top Selling Products', updatedAt: '2024-07-10T09:30:00Z' },
    { id: '7', title: 'Customer Buying Patterns', updatedAt: '2024-07-09T14:20:00Z' },
    { id: '8', title: 'Inventory Turnover Analysis', updatedAt: '2024-07-08T10:00:00Z' },
    { id: '9', title: 'Supplier Lead Time Review', updatedAt: '2024-07-07T08:30:00Z' },
    { id: '10', title: 'Monthly Sales Report', updatedAt: '2024-07-06T13:45:00Z' },
];

// Format time helper
const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
        return 'Just now';
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
        return 'Yesterday';
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

export const ChatSidebar = () => {
    const user = useSelector(selectUser);
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const [activeConversation, setActiveConversation] = useState('1');

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

            <SidebarContent className="hide-scrollbar flex flex-col">
                <SidebarGroup className="flex-1 min-h-0">
                    {!isCollapsed && (
                        <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs">
                            Previous Chats
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <ScrollArea className="h-full">
                            <SidebarMenu className="gap-1.5">
                                {dummyConversations.map((conversation) => {
                                    const isActive = activeConversation === conversation.id;
                                    return (
                                        <SidebarMenuItem key={conversation.id}>
                                            <SidebarMenuButton
                                                size="lg"
                                                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                                                onClick={() => setActiveConversation(conversation.id)}
                                                isActive={isActive}
                                                tooltip={isCollapsed ? conversation.title : ''}
                                            >
                                                <div className="flex flex-1 items-center gap-2 min-w-0">
                                                    {!isCollapsed && (
                                                        <div className="flex flex-1 flex-col min-w-0">
                                                            <span className={cn(
                                                                "truncate text-sm transition-colors",
                                                                isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                                                            )}>
                                                                {conversation.title}
                                                            </span>
                                                            <span className={cn(
                                                                "truncate text-sm transition-colors",
                                                                isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                                                            )}>
                                                                {formatTime(conversation.updatedAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </ScrollArea>
                    </SidebarGroupContent>
                </SidebarGroup>
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
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </AvatarFallback>
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
                                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
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