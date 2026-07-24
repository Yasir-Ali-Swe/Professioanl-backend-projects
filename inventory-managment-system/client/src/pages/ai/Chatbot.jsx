import { useEffect, useRef, useState } from "react";
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
    useClearContext,
} from "@/hooks/useChat";

const ACTIVE_CHAT_CONVERSATION_KEY = "stockpilot.activeChatConversationId";

const suggestionChips = [
    "Which products are low in stock right now?",
    "Evaluate Acme Corp delivery compliance",
    "What was our total sales revenue this week?",
    "Explain Zone A warehouse capacity issues",
];

const createConversationId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readStoredConversationId = () => {
    if (typeof window === "undefined") return null;
    try {
        return sessionStorage.getItem(ACTIVE_CHAT_CONVERSATION_KEY);
    } catch {
        return null;
    }
};

const storeConversationId = (conversationId) => {
    if (typeof window === "undefined" || !conversationId) return;
    try {
        sessionStorage.setItem(ACTIVE_CHAT_CONVERSATION_KEY, conversationId);
    } catch {
        // ignore
    }
};

const clearStoredConversationId = () => {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(ACTIVE_CHAT_CONVERSATION_KEY);
    } catch {
        // ignore
    }
};

function ChatbotPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlConversationId = searchParams.get("c");

    const clearMutation = useClearContext();

    const [conversationId, setConversationId] = useState(
        () => urlConversationId || readStoredConversationId() || createConversationId()
    );
    const [localMessages, setLocalMessages] = useState([]);
    const [input, setInput] = useState("");

    const textareaRef = useRef(null);
    const abortControllerRef = useRef(null);
    const pendingAssistantIdRef = useRef(null);
    const isMountedRef = useRef(true);
    const mutationConversationIdRef = useRef(null);
    const currentConversationIdRef = useRef(conversationId);

    const isHistoryConversation = Boolean(urlConversationId);
    const activeConversationId = urlConversationId || conversationId;

    // ---- QUERIES ----
    const {
        data: historyData,
        isLoading: historyLoading,
        error: historyError,
    } = useChatHistory(
        { conversationId: activeConversationId },
        { enabled: Boolean(activeConversationId) }
    );

    const chatMutation = useChatWithAI();
    const isPending = chatMutation.isPending;
    const isPremiumUpgradeRequired =
        historyError?.response?.status === 403 ||
        chatMutation.error?.response?.status === 403;

    // ---- CONVERSATION ID MANAGEMENT ----
    useEffect(() => {
        if (urlConversationId) {
            setConversationId(urlConversationId);
            return;
        }
        const stored = readStoredConversationId();
        if (stored) {
            setConversationId(stored);
            return;
        }
        const newId = createConversationId();
        setConversationId(newId);
        storeConversationId(newId);
    }, [urlConversationId]);

    useEffect(() => {
        if (urlConversationId) return;
        storeConversationId(conversationId);
    }, [conversationId, urlConversationId]);

    // ---- TRACK CURRENT CONVERSATION IN REF ----
    useEffect(() => {
        currentConversationIdRef.current = conversationId;
    }, [conversationId]);

    // ---- RESET STATE ON CONVERSATION CHANGE (including abort) ----
    useEffect(() => {
        // Cancel any ongoing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        // Clear pending refs
        pendingAssistantIdRef.current = null;
        mutationConversationIdRef.current = null;

        // Clear mutation state – remove dependency on chatMutation to avoid loop
        chatMutation.reset();

        // Reset UI state
        setLocalMessages([]);
        setInput("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]); // <-- Only depend on conversationId

    // ---- HISTORY TO MESSAGES ----
    useEffect(() => {
        // Guard: if we're not loading and we have data, set messages
        if (historyData?.data && !historyLoading) {
            const sortedHistory = [...historyData.data].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            const chatMessages = sortedHistory.flatMap((log) => [
                {
                    id: `${log._id}-user`,
                    role: "user",
                    content: log.query,
                    source: "history",
                },
                {
                    id: `${log._id}-assistant`,
                    role: "assistant",
                    content: log.response,
                    source: "history",
                },
            ]);
            // Only set if the conversation ID still matches (prevent race)
            if (currentConversationIdRef.current === conversationId) {
                setLocalMessages(chatMessages);
            }
        } else if (!historyLoading && isHistoryConversation) {
            // No data for this conversation
            if (currentConversationIdRef.current === conversationId) {
                setLocalMessages([]);
            }
        }
    }, [historyData, historyLoading, isHistoryConversation, conversationId]);

    // ---- MOUNTED REF ----
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ---- HANDLERS ----
    const handleTextareaInput = (e) => {
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        setInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (isHistoryConversation) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isHistoryConversation || !input.trim() || isPending) return;

        const query = input.trim();
        setInput("");

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        const userMsgId = `${Date.now()}-user`;
        const assistantMsgId = `${Date.now()}-assistant`;
        pendingAssistantIdRef.current = assistantMsgId;
        mutationConversationIdRef.current = conversationId;

        setLocalMessages((prev) => [
            ...prev,
            {
                id: userMsgId,
                role: "user",
                content: query,
                source: "live",
            },
            {
                id: assistantMsgId,
                role: "assistant",
                content: "",
                source: "live",
            },
        ]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        chatMutation.mutate(
            {
                query,
                conversationId,
                signal: controller.signal,
                onChunk: (chunkText) => {
                    if (!isMountedRef.current) return;
                    if (mutationConversationIdRef.current !== currentConversationIdRef.current) return;
                    if (!chunkText || !pendingAssistantIdRef.current) return;

                    setLocalMessages((prev) =>
                        prev.map((message) => {
                            if (message.id !== pendingAssistantIdRef.current) {
                                return message;
                            }
                            return {
                                ...message,
                                content: `${message.content || ""}${chunkText}`,
                                source: "live",
                            };
                        })
                    );
                },
                onComplete: (res) => {
                    if (!isMountedRef.current) return;
                    if (mutationConversationIdRef.current !== currentConversationIdRef.current) return;

                    const finalReply = res?.reply || "";
                    if (finalReply && pendingAssistantIdRef.current) {
                        setLocalMessages((prev) =>
                            prev.map((message) => {
                                if (message.id !== pendingAssistantIdRef.current) {
                                    return message;
                                }
                                return {
                                    ...message,
                                    content: finalReply,
                                    source: "live",
                                };
                            })
                        );
                    }

                    if (res?.conversationId && res.conversationId !== conversationId) {
                        if (!urlConversationId) {
                            setConversationId(res.conversationId);
                            storeConversationId(res.conversationId);
                            setSearchParams({ c: res.conversationId });
                        }
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
                    if (mutationConversationIdRef.current !== currentConversationIdRef.current) return;

                    if (pendingAssistantIdRef.current) {
                        setLocalMessages((prev) =>
                            prev.map((message) => {
                                if (message.id !== pendingAssistantIdRef.current) {
                                    return message;
                                }
                                return {
                                    ...message,
                                    content: "Sorry, I could not complete that request.",
                                    source: "live",
                                };
                            })
                        );
                    }
                },
                onSettled: () => {
                    if (mutationConversationIdRef.current === currentConversationIdRef.current) {
                        abortControllerRef.current = null;
                        pendingAssistantIdRef.current = null;
                    }
                },
            }
        );
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            chatMutation.reset();
        }
    };

    const handleClearContext = () => {
        clearMutation.mutate(
            { conversationId },
            {
                onSuccess: () => {
                    setLocalMessages([]);
                },
            }
        );
    };

    const handleSuggestionClick = (chip) => {
        if (isHistoryConversation) return;
        setInput(chip);
        if (textareaRef.current) {
            textareaRef.current.focus();
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${Math.min(
                        textareaRef.current.scrollHeight,
                        200
                    )}px`;
                }
            }, 50);
        }
    };

    // ---- RENDER ----
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

    return (
        <MessageScrollerProvider>
            <div className="flex h-full w-full flex-col relative">
                {/* Clear Context Button at Top Right */}
                {/* {!isHistoryConversation && localMessages.length > 0 && (
                    <div className="absolute right-4 bottom-30 z-10">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearContext}
                            disabled={clearMutation.isPending || isPending}
                            className="text-xs font-semibold cursor-pointer bg-background/80 backdrop-blur-xs hover:bg-muted"
                        >
                            Clear AI Context
                        </Button>
                    </div>
                )} */}

                <div className="flex-1 overflow-hidden min-h-0 relative">
                    {historyLoading && isHistoryConversation ? (
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
                    ) : localMessages.length === 0 ? (
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
                                    {isHistoryConversation
                                        ? "No saved messages found"
                                        : "How can I help you today?"}
                                </h2>
                                <p className="text-sm text-muted-foreground mb-8">
                                    {isHistoryConversation
                                        ? "This conversation has no stored messages."
                                        : "Ask StockPilot about inventory levels, order forecasting, supplier metrics, and database anomalies."}
                                </p>
                                {!isHistoryConversation && (
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
                                )}
                            </motion.div>
                        </div>
                    ) : (
                        <MessageScroller>
                            <MessageScrollerViewport>
                                <MessageScrollerContent className="px-4 py-6 max-w-4xl mx-auto w-full">
                                    <div className="flex flex-col gap-6">
                                        <AnimatePresence initial={false}>
                                            {localMessages.map((message) => (
                                                <MessageScrollerItem
                                                    key={message.id}
                                                    scrollAnchor={message.role === "user"}
                                                >
                                                    <MessageAnimated
                                                        message={message}
                                                        scrollAnchor={message.role === "user"}
                                                    />
                                                </MessageScrollerItem>
                                            ))}
                                        </AnimatePresence>

                                        {isPending && !isHistoryConversation && (
                                            <div className="flex w-full gap-3 justify-start opacity-100 translate-y-0">
                                                <div className="w-full max-w-full sm:w-auto sm:max-w-[85%] bg-background border border-border text-foreground px-5 py-4 rounded-2xl rounded-tl-none shadow-2xs flex items-center gap-2.5 select-none">
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        Thinking...
                                                    </span>
                                                    <span className="flex gap-1 items-center h-2">
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                                                            style={{ animationDelay: "0ms" }}
                                                        />
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                                                            style={{ animationDelay: "150ms" }}
                                                        />
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                                                            style={{ animationDelay: "300ms" }}
                                                        />
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
                                    isHistoryConversation
                                        ? "History is read-only"
                                        : "Type your message here..."
                                }
                                className="flex-1 max-h-20 min-h-6 bg-transparent border-0 p-0 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-hidden resize-none py-1 pr-12 scrollbar-thin overflow-y-auto leading-relaxed"
                                style={{ height: "auto" }}
                                disabled={isPending || isHistoryConversation}
                            />
                            {isPending ? (
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
                                    disabled={!input.trim() || isHistoryConversation}
                                    className="absolute right-3 bottom-3 h-8 w-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                                >
                                    <ArrowUpIcon className="h-4 w-4" />
                                    <span className="sr-only">Send message</span>
                                </Button>
                            )}
                        </form>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground select-none">
                            {isHistoryConversation
                                ? "History conversations are read-only."
                                : "StockPilot can make mistakes. Please verify important inventory details."}
                        </p>
                    </div>
                </div>
            </div>
        </MessageScrollerProvider>
    );
}

export default ChatbotPage;