import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    Boxes,
    BadgeCheckIcon,
    CreditCardIcon,
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

import { useChatHistory } from '@/hooks/useChat';

const ACTIVE_CHAT_CONVERSATION_KEY = 'stockpilot.activeChatConversationId';

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

import { useSearchParams, Link } from 'react-router-dom';
import { useLogoutUser } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const ChatSidebar = () => {
    const user = useSelector(selectUser);
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;
    const [searchParams, setSearchParams] = useSearchParams();
    const activeConversation = searchParams.get('c') || 'live';
    const logoutMutation = useLogoutUser();
    const { data: chatHistoryResponse } = useChatHistory({ limit: 200 }, { staleTime: 60 * 1000 });

    const recentConversations = useMemo(() => {
        const logs = chatHistoryResponse?.data || [];
        const conversationMap = new Map();

        logs.forEach((log) => {
            const existing = conversationMap.get(log.conversationId);
            const current = {
                conversationId: log.conversationId,
                title: log.query?.trim() || 'Untitled conversation',
                preview: log.response?.trim() || log.query?.trim() || 'Conversation',
                updatedAt: log.createdAt,
            };

            if (!existing || new Date(current.updatedAt) > new Date(existing.updatedAt)) {
                conversationMap.set(log.conversationId, current);
            }
        });

        return [...conversationMap.values()]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 8);
    }, [chatHistoryResponse]);

    const clearLiveConversationState = () => {
        try {
            sessionStorage.removeItem(ACTIVE_CHAT_CONVERSATION_KEY);
        } catch {
            // Ignore storage failures and keep the navigation working.
        }

        window.dispatchEvent(new Event('chatbot:new-chat'));
    };

    const setActiveConversation = (id) => {
        setSearchParams({ c: id });
    };

    const handleNewChat = () => {
        clearLiveConversationState();
        setSearchParams({}, { replace: true });
    };

    return (
        <SidebarContainer variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border">
                <div className="flex items-center gap-2 px-2 py-1">
                    <Boxes className="h-6 w-6 text-primary" />
                    {!isCollapsed && (
                        <span className="text-lg font-semibold text-sidebar-foreground">StockPilot</span>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="hide-scrollbar flex flex-col">
                {!isCollapsed && (
                    <SidebarGroup className="flex flex-col flex-1 min-h-0 px-2 py-3">
                        <Button
                            variant="outline"
                            onClick={handleNewChat}
                            className="w-full flex items-center gap-2 justify-center py-2 mb-3 text-xs border-dashed shrink-0 cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New Chat
                        </Button>
                        <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs px-2 py-1 mb-2 select-none">
                            Active Session
                        </SidebarGroupLabel>
                        <SidebarGroupContent className="flex-1 min-h-0 flex flex-col">
                            <ScrollArea className="flex-1 min-h-0 pr-1">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={handleNewChat}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm transition-all duration-200 ease-in-out truncate rounded-r-md border-l-2 select-none cursor-pointer",
                                            activeConversation === 'live'
                                                ? "bg-accent/40 border-primary font-semibold text-foreground"
                                                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <span className="block truncate">StockPilot Assistant</span>
                                    </button>

                                    {recentConversations.length > 0 && (
                                        <div className="pt-3">
                                            <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground select-none">
                                                Recent Chats
                                            </p>
                                            <div className="flex flex-col gap-1">
                                                {recentConversations.map((conversation) => {
                                                    const isActive = activeConversation === conversation.conversationId;

                                                    return (
                                                        <button
                                                            key={conversation.conversationId}
                                                            onClick={() => setActiveConversation(conversation.conversationId)}
                                                            className={cn(
                                                                "w-full text-left px-3 py-2 text-sm transition-all duration-200 ease-in-out rounded-r-md border-l-2 select-none cursor-pointer",
                                                                isActive
                                                                    ? "bg-accent/40 border-primary font-semibold text-foreground"
                                                                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                            )}
                                                        >
                                                            <span className="block truncate">{conversation.title}</span>
                                                            <span className="block truncate text-[11px] text-muted-foreground/80">
                                                                {formatTime(conversation.updatedAt)}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
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
                                    <DropdownMenuItem render={<Link to={`/${user?.role || 'admin'}/profile`} />}>
                                        <BadgeCheckIcon className="mr-2 h-4 w-4" />
                                        Account
                                    </DropdownMenuItem>
                                    {user?.role === 'admin' && (
                                        <DropdownMenuItem render={<Link to="/admin/billing" />}>
                                            <CreditCardIcon className="mr-2 h-4 w-4" />
                                            Billing
                                        </DropdownMenuItem>
                                    )}
                                    {user?.role !== 'super-admin' && (
                                        <DropdownMenuItem render={<Link to={`/${user?.role || 'admin'}/organization-profile`} />}>
                                            <Boxes className="mr-2 h-4 w-4 text-muted-foreground" />
                                            Organization
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => logoutMutation.mutate()}
                                    className="cursor-pointer text-destructive focus:text-destructive"
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