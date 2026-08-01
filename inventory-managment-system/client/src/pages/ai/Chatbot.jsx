// pages/ChatbotPage.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpIcon, Bot, Sparkles, Square } from "lucide-react";

import { MessageAnimated } from "@/components/chatbot/MessageAnimate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@/components/ui/message-scroller";

import {
    useChatHistory,
    useChatWithAI,
} from "@/hooks/useChat";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const newConversationId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const suggestionChips = [
    "Show me all Products",
    "Show all categories",
    "Show me all suppliers",
    "Show me all invoices",
];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
function ChatbotPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // The URL param "c" is the SINGLE source of truth for which conversation
    // is active. We never generate a new ID inside a render cycle to avoid
    // the ID-change → history-clear race condition.
    const urlConversationId = searchParams.get("c");

    // On first render with no URL param, pick an ID once and write it to URL.
    // Use a ref so the lazy-init only fires one time.
    const initIdRef = useRef(urlConversationId || newConversationId());

    // The conversation ID we are rendering. Derived purely from URL.
    const activeConversationId = urlConversationId || initIdRef.current;

    // ── Chat history query ──────────────────────────────────────
    const {
        data: historyData,
        isLoading: historyLoading,
        error: historyError,
    } = useChatHistory(activeConversationId, {
        enabled: Boolean(activeConversationId),
    });

    // ── Mutation ────────────────────────────────────────────────
    const chatMutation = useChatWithAI();
    const isPending = chatMutation.isPending;

    // ── Local message list ──────────────────────────────────────
    // "history" messages loaded from DB on mount / conversation switch.
    // "live" messages optimistically added while streaming.
    const [liveMessages, setLiveMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [input, setInput] = useState("");

    // Refs that survive re-renders without causing them
    const textareaRef = useRef(null);
    const abortControllerRef = useRef(null);
    const pendingAssistantIdRef = useRef(null);
    const isMountedRef = useRef(true);

    // Track which conversation the in-flight mutation belongs to so we can
    // discard stale callbacks when the user switches conversations mid-stream.
    const mutationConvRef = useRef(null);
    const activeConvRef = useRef(activeConversationId);

    // ── On mount: write initial ID to URL if missing ────────────
    useEffect(() => {
        isMountedRef.current = true;
        if (!urlConversationId) {
            setSearchParams({ c: initIdRef.current }, { replace: true });
        }
        return () => {
            isMountedRef.current = false;
        };
    }, []); // run once on mount only

    // ── Keep the activeConvRef in sync ──────────────────────────
    useEffect(() => {
        activeConvRef.current = activeConversationId;
    }, [activeConversationId]);

    // ── When the active conversation changes, clear live messages ─
    const prevConvIdRef = useRef(activeConversationId);
    useEffect(() => {
        if (prevConvIdRef.current === activeConversationId) return;
        prevConvIdRef.current = activeConversationId;

        // Abort any in-flight stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        pendingAssistantIdRef.current = null;
        mutationConvRef.current = null;
        chatMutation.reset();

        // Clear live messages — history will load from the query
        setLiveMessages([]);
        setIsThinking(false);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Derive the full displayed message list ──────────────────
    // History messages come from the DB query. Live messages are appended on
    // top during streaming.
    const historyMessages = useMemo(() => {
        if (!historyData?.data?.logs?.length) return [];
        return [...historyData.data.logs]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .flatMap((log) => [
                {
                    id: `${log.id}-user`,
                    role: "user",
                    content: log.query,
                    source: "history",
                    logQuery: log.query,
                },
                {
                    id: `${log.id}-assistant`,
                    role: "assistant",
                    content: log.response,
                    source: "history",
                    metadata: log.metadata,
                    intent: log.intent,
                    createdAt: log.createdAt,
                    logQuery: log.query,
                },
            ]);
    }, [historyData]);

    // Clear live messages when history re-fetches and streaming is idle,
    // making historyMessages the single source of truth for completed turns.
    useEffect(() => {
        if (!isPending && !isThinking && historyData?.data?.logs) {
            setLiveMessages([]);
        }
    }, [historyData, isPending, isThinking]);

    // The actual list shown in the UI: DB history + any in-progress live messages.
    // Deduplicates history items (both user & assistant) whose query is in liveMessages.
    const displayMessages = useMemo(() => {
        if (liveMessages.length === 0) return historyMessages;

        const liveUserQueries = new Set(
            liveMessages.filter((m) => m.role === "user").map((m) => m.content)
        );
        const dedupedHistory = historyMessages.filter(
            (m) => !(m.source === "history" && liveUserQueries.has(m.logQuery || m.content))
        );
        return [...dedupedHistory, ...liveMessages];
    }, [historyMessages, liveMessages]);

    const isPremiumUpgradeRequired =
        historyError?.response?.status === 403 ||
        chatMutation.error?.response?.status === 403;

    // ── Form handlers ───────────────────────────────────────────
    const handleTextareaInput = (e) => {
        const el = e.target;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
        setInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // ── Send message ────────────────────────────────────────────
    const submitQuery = useCallback(
        async (query) => {
            if (!query.trim() || isPending) return;

            setInput("");
            setIsThinking(true);
            if (textareaRef.current) textareaRef.current.style.height = "auto";

            const userMsgId = `live-${Date.now()}-user`;
            const assistantMsgId = `live-${Date.now()}-assistant`;
            pendingAssistantIdRef.current = assistantMsgId;
            mutationConvRef.current = activeConversationId;

            // Optimistically append user + empty assistant bubble
            setLiveMessages((prev) => [
                ...prev,
                { id: userMsgId, role: "user", content: query, source: "live" },
                { id: assistantMsgId, role: "assistant", content: "", source: "live" },
            ]);

            const controller = new AbortController();
            abortControllerRef.current = controller;

            chatMutation.mutate(
                {
                    message: query,
                    conversationId: activeConversationId,
                    signal: controller.signal,
                    onThinking: () => { /* handled by isThinking state */ },
                    onChunk: (_chunk, fullMarkdown) => {
                        if (!isMountedRef.current) return;
                        if (mutationConvRef.current !== activeConvRef.current) return;
                        if (!pendingAssistantIdRef.current) return;

                        setIsThinking(false);
                        setLiveMessages((prev) =>
                            prev.map((m) =>
                                m.id === pendingAssistantIdRef.current
                                    ? { ...m, content: fullMarkdown }
                                    : m
                            )
                        );
                    },
                    onComplete: (res) => {
                        if (!isMountedRef.current) return;
                        if (mutationConvRef.current !== activeConvRef.current) return;

                        setIsThinking(false);
                        const finalMarkdown = res.markdown || "";

                        setLiveMessages((prev) =>
                            prev.map((m) =>
                                m.id === pendingAssistantIdRef.current
                                    ? { ...m, content: finalMarkdown, intent: res.intent, entityRefs: res.entityRefs }
                                    : m
                            )
                        );

                        // Ensure the correct conversation ID is in the URL
                        const resConvId = res.conversationId || activeConversationId;
                        if (resConvId && searchParams.get("c") !== resConvId) {
                            setSearchParams({ c: resConvId }, { replace: true });
                        }
                    },
                },
                {
                    onError: (error) => {
                        const isAbort =
                            error?.name === "AbortError" ||
                            error?.code === "ERR_CANCELED" ||
                            error?.message?.includes("aborted");
                        if (isAbort) return;
                        if (!isMountedRef.current) return;
                        if (mutationConvRef.current !== activeConvRef.current) return;

                        setIsThinking(false);
                        setLiveMessages((prev) =>
                            prev.map((m) =>
                                m.id === pendingAssistantIdRef.current
                                    ? { ...m, content: "Sorry, I could not complete that request. Please try again." }
                                    : m
                            )
                        );
                    },
                    onSettled: () => {
                        if (mutationConvRef.current === activeConvRef.current) {
                            abortControllerRef.current = null;
                            pendingAssistantIdRef.current = null;
                        }
                    },
                }
            );
        },
        [isPending, activeConversationId, chatMutation, searchParams, setSearchParams]
    );

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();
            if (!input.trim()) return;
            await submitQuery(input.trim());
        },
        [input, submitQuery]
    );

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            chatMutation.reset();
            setIsThinking(false);
        }
    };

    const handleSuggestionClick = useCallback(
        (question) => {
            if (isPending) return;
            submitQuery(question);
        },
        [isPending, submitQuery]
    );

    // ── Render ──────────────────────────────────────────────────
    if (isPremiumUpgradeRequired) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none max-w-md mx-auto">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-xs">
                    <Bot className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                    Unlock StockPilot Assistant
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    StockPilot AI assistant can answer natural language questions about your inventory levels, orders, and sales forecasts. Upgrade to the Premium Plan to unlock.
                </p>
                <Button asChild>
                    <Link to="/admin/billing" className="font-semibold shadow-sm">
                        Upgrade to Premium
                    </Link>
                </Button>
            </div>
        );
    }

    const showSkeleton = historyLoading && displayMessages.length === 0;
    const showEmptyState = !historyLoading && displayMessages.length === 0 && !isPending && !isThinking;

    return (
        <MessageScrollerProvider>
            <div className="flex h-full w-full flex-col relative">
                <div className="flex-1 overflow-hidden min-h-0 relative">
                    {showSkeleton ? (
                        <div className="px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
                            <div className="flex justify-end w-full">
                                <Skeleton className="h-10 w-1/3 rounded-2xl rounded-tr-none" />
                            </div>
                            <div className="flex justify-start w-full">
                                <Skeleton className="h-24 w-2/3 rounded-2xl rounded-tl-none" />
                            </div>
                            <div className="flex justify-end w-full">
                                <Skeleton className="h-10 w-1/4 rounded-2xl rounded-tr-none" />
                            </div>
                        </div>
                    ) : showEmptyState ? (
                        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center max-w-150 w-full"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-xs">
                                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">
                                    How can I help you today?
                                </h2>
                                <p className="text-sm text-muted-foreground mb-8">
                                    Ask StockPilot about inventory levels, order forecasting, supplier metrics, and database anomalies.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                    {suggestionChips.map((chip, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSuggestionClick(chip)}
                                            className="text-left px-4 py-3 rounded-xl border border-border bg-card/35 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs leading-relaxed"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <MessageScroller>
                            <MessageScrollerViewport>
                                <MessageScrollerContent className="px-4 pb-6 max-w-4xl mx-auto w-full">
                                    <div className="flex flex-col gap-6">
                                        <AnimatePresence initial={false}>
                                            {displayMessages.map((message) => (
                                                <MessageScrollerItem
                                                    key={message.id}
                                                    scrollAnchor={message.role === "user"}
                                                >
                                                    <MessageAnimated
                                                        message={message}
                                                        scrollAnchor={message.role === "user"}
                                                        isChatPending={isPending}
                                                    />
                                                </MessageScrollerItem>
                                            ))}
                                        </AnimatePresence>

                                        {(isPending || isThinking) && (
                                            <div className="flex w-full gap-3 justify-start opacity-100 translate-y-0">
                                                <div className="w-full max-w-full sm:w-auto sm:max-w-[85%] bg-background border border-border text-foreground px-5 py-4 rounded-2xl rounded-tl-none shadow-2xs flex items-center gap-2.5 select-none">
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {isThinking ? "Analyzing your request..." : "Thinking..."}
                                                    </span>
                                                    <span className="flex gap-1 items-center h-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </MessageScrollerContent>
                            </MessageScrollerViewport>
                            <MessageScrollerButton />
                        </MessageScroller>
                    )}
                </div>

                <div className="bg-background px-4 py-4 sm:px-6 shrink-0">
                    <div className="max-w-3xl mx-auto w-full">
                        <form
                            onSubmit={handleSubmit}
                            className="relative flex items-end gap-2 border border-border bg-card rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-2xs"
                        >
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={input}
                                onChange={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    isPending || isThinking
                                        ? "Processing..."
                                        : "Type your message here..."
                                }
                                className="flex-1 max-h-20 min-h-6 bg-transparent border-0 p-0 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-hidden resize-none py-1 pr-12 scrollbar-thin overflow-y-auto leading-relaxed"
                                style={{ height: "auto" }}
                                disabled={isPending || isThinking}
                            />
                            {(isPending || isThinking) ? (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="default"
                                    onClick={handleStopGeneration}
                                    className="absolute right-3 bottom-3 h-8 w-8 rounded-lg bg-foreground hover:bg-foreground/80 text-background transition-all duration-200 cursor-pointer shrink-0"
                                >
                                    <Square className="h-3 w-3 fill-current" />
                                    <span className="sr-only">Stop generating</span>
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="icon"
                                    variant="default"
                                    disabled={!input.trim() || isPending || isThinking}
                                    className="absolute right-3 bottom-3 h-8 w-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                                >
                                    <ArrowUpIcon className="h-4 w-4" />
                                    <span className="sr-only">Send message</span>
                                </Button>
                            )}
                        </form>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground select-none">
                            StockPilot can make mistakes. Please verify important inventory details.
                        </p>
                    </div>
                </div>
            </div>
        </MessageScrollerProvider>
    );
}

export default ChatbotPage;
