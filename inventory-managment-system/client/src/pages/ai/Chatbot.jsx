import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    ArrowUpIcon,
    Bot,
    Sparkles,
    Trash2,
    RefreshCw,
} from "lucide-react"

import { MessageAnimated } from "@/components/chatbot/MessageAnimate"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import {
    useChatHistory,
    useChatWithAI,
    useClearContext,
} from "@/hooks/useChat"

const mockConversationsData = {
    '1': [], // Live chat starts empty or loads backend history
    '2': [
        {
            id: 'm2-1',
            role: 'user',
            content: 'Give me a list of products currently low in stock.'
        },
        {
            id: 'm2-2',
            role: 'assistant',
            content: 'Here is the current list of products that have fallen below their safety stock thresholds and require replenishment:\n\n| Product Name | SKU | Current Stock | Safety Stock | Threshold |\n| :--- | :--- | :---: | :---: | :---: |\n| Heavy Duty Caster | CS-402 | **8** | 20 | -60% |\n| Steel Shelf Brackets | SH-091 | **14** | 50 | -72% |\n| Linear Actuator | LA-100 | **4** | 10 | -60% |\n\n> [!IMPORTANT]\n> Lead times for Acme Corp (Supplier for Heavy Duty Casters) are currently averaging 4.2 days. I recommend drafting a Purchase Order immediately to avoid warehouse picking disruptions.'
        }
    ],
    '3': [
        {
            id: 'm3-1',
            role: 'user',
            content: 'How is our supplier Acme Logistical Services performing?'
        },
        {
            id: 'm3-2',
            role: 'assistant',
            content: 'Here is the performance card for **Acme Logistical Services** based on order logs over the last 90 days:\n\n* **On-Time Delivery Rate**: `97.8%` (Exceeds target of `95%`)\n* **Order Defect Rate**: `0.3%` (Exceeds target of `<1.0%`)\n* **Average Lead Time**: `3.4 days` (Benchmark target is `4.0 days`)\n\nOverall status: **Excellent (Tier 1)**. Acme is currently our most reliable supplier for warehouse logistics components.'
        }
    ],
    '4': [
        {
            id: 'm4-1',
            role: 'user',
            content: 'What is the sales forecast for Q3?'
        },
        {
            id: 'm4-2',
            role: 'assistant',
            content: 'Based on our predictive models, sales for Q3 are projected to increase by **12% YoY**, driven by back-to-school demand.\n\n### Forecast Highlights:\n- **Expected Total Sales**: `$145,200`\n- **Fastest Growing Category**: `Consumer Electronics` (+18% projected)\n- **Key Constraint**: `Silicon scarcity` could delay semiconductor items in late August.'
        }
    ],
    '5': [
        {
            id: 'm5-1',
            role: 'user',
            content: 'Explain our current warehouse capacity utilization.'
        },
        {
            id: 'm5-2',
            role: 'assistant',
            content: 'Our current warehouse storage is at **82% total utilization** across all three zones:\n\n- **Zone A (Fast-Moving Retail)**: `91%` utilization. This zone is nearing maximum capacity, which is slowing pick times.\n- **Zone B (Bulk Inventory)**: `78%` utilization.\n- **Zone C (Cold Storage)**: `64%` utilization.\n\n> [!TIP]\n> Consider shifting slow-moving items from Zone A to Zone B to free up premium pick faces.'
        }
    ],
    '6': [
        {
            id: 'm6-1',
            role: 'user',
            content: 'What are the top selling products this month?'
        },
        {
            id: 'm6-2',
            role: 'assistant',
            content: 'Here are the top 3 selling products for this billing period:\n\n1. **Wireless Gaming Mouse** (342 units sold, `$17,100` total value)\n2. **Ergonomic Office Chair** (118 units sold, `$23,600` total value)\n3. **USB-C Hub Multi-Port** (290 units sold, `$8,700` total value)'
        }
    ],
    '7': [
        {
            id: 'm7-1',
            role: 'user',
            content: 'Show customer buying patterns.'
        },
        {
            id: 'm7-2',
            role: 'assistant',
            content: 'Our customer cohort analysis reveals three distinct buying patterns:\n\n- **Enterprise Bulk Orders**: Occur regularly between the 1st and 5th of every month, accounting for 62% of revenue.\n- **Mid-Week Spikes**: Retail orders peak on Wednesdays and Thursdays.\n- **High Attachment Rates**: 40% of chair purchases include a desk mat accessory.'
        }
    ],
    '8': [
        {
            id: 'm8-1',
            role: 'user',
            content: 'Show our inventory turnover analysis.'
        },
        {
            id: 'm8-2',
            role: 'assistant',
            content: 'The inventory turnover ratio stands at **6.4x** annually. This is healthy, indicating our stock is cycling roughly every 57 days. \n\n*Target benchmark is 6.0x, so we are performing slightly above average, which optimizes working capital.*'
        }
    ],
    '9': [
        {
            id: 'm9-1',
            role: 'user',
            content: 'Show supplier lead times.'
        },
        {
            id: 'm9-2',
            role: 'assistant',
            content: 'Here are the average lead times for our active suppliers:\n\n- **Logitech Inc**: `2.8 days`\n- **Steelcase Corp**: `12.5 days` (Domestic freight bottlenecks)\n- **Acme Logistical**: `3.4 days`\n- **Global Parts Corp**: `18.1 days` (International shipping delays)'
        }
    ],
    '10': [
        {
            id: 'm10-1',
            role: 'user',
            content: 'Review monthly sales report.'
        },
        {
            id: 'm10-2',
            role: 'assistant',
            content: 'Our monthly sales report shows total gross revenues of `$112,450`, a **4.5% increase** over last month. Net operating margin holds steady at **22.4%**.'
        }
    ]
};

const suggestionChips = [
    "Which products are low in stock right now?",
    "Evaluate Acme Corp delivery compliance",
    "What was our total sales revenue this week?",
    "Explain Zone A warehouse capacity issues"
];

function ChatbotPage() {
    const [searchParams] = useSearchParams()
    const conversationId = searchParams.get('c') || '1'
    const [localMessages, setLocalMessages] = useState([])
    const [input, setInput] = useState("")

    const textareaRef = useRef(null)

    // Load hooks
    const { data: historyData, isLoading: historyLoading } = useChatHistory({}, {
        enabled: conversationId === '1'
    })
    const chatMutation = useChatWithAI()
    const clearMutation = useClearContext()

    const isPending = chatMutation.isPending
    const isClearing = clearMutation.isPending

    // Sync database history or mock states
    useEffect(() => {
        if (conversationId === '1') {
            if (historyData?.data) {
                const chatMessages = []
                const sortedHistory = [...historyData.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                sortedHistory.forEach(log => {
                    chatMessages.push({
                        id: `${log._id}-user`,
                        role: "user",
                        content: log.query
                    })
                    chatMessages.push({
                        id: `${log._id}-assistant`,
                        role: "assistant",
                        content: log.response
                    })
                })
                setLocalMessages(chatMessages)
            } else {
                setLocalMessages([])
            }
        } else {
            setLocalMessages(mockConversationsData[conversationId] || [])
        }
    }, [conversationId, historyData])

    const handleTextareaInput = (e) => {
        const textarea = e.target
        textarea.style.height = "auto"
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
        setInput(e.target.value)
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim() || isPending) return

        const query = input.trim()
        setInput("")

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }

        // Add user query message locally
        const userMsgId = Date.now().toString()
        setLocalMessages(prev => [...prev, {
            id: userMsgId,
            role: "user",
            content: query
        }])

        // Request response from backend
        chatMutation.mutate({ query }, {
            onSuccess: (res) => {
                const assistantMsgId = (Date.now() + 1).toString()
                setLocalMessages(prev => [...prev, {
                    id: assistantMsgId,
                    role: "assistant",
                    content: res.reply
                }])
            }
        })
    }

    const handleClearContext = () => {
        clearMutation.mutate(null, {
            onSuccess: () => {
                setLocalMessages([])
            }
        })
    }

    const handleSuggestionClick = (chip) => {
        setInput(chip)
        if (textareaRef.current) {
            textareaRef.current.focus()
            // Delay auto height calculation slightly to capture value
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.style.height = "auto"
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
                }
            }, 50)
        }
    }

    return (
        <MessageScrollerProvider>
            <div className="flex h-full w-full flex-col bg-background">
                {/* Scrollable Messages Area */}
                <div className="flex-1 overflow-hidden min-h-0 relative">
                    {historyLoading && conversationId === '1' ? (
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
                        // Beautiful Minimal Empty State
                        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center max-w-[600px] w-full"
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-xs">
                                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">How can I help you today?</h2>
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
                                <MessageScrollerContent className="px-4 py-6 max-w-4xl mx-auto w-full">
                                    <div className="flex flex-col gap-6">
                                        <AnimatePresence initial={false}>
                                            {localMessages.map((message) => (
                                                <MessageAnimated
                                                    key={message.id}
                                                    message={message}
                                                    scrollAnchor={message.role === "user"}
                                                />
                                            ))}
                                        </AnimatePresence>

                                        {isPending && (
                                            <div className="flex w-full gap-3 justify-start opacity-100 translate-y-0">
                                                <div className="w-full max-w-full sm:w-auto sm:max-w-[85%] bg-background border border-border text-foreground px-5 py-4 rounded-2xl rounded-tl-none shadow-2xs flex items-center gap-2.5 select-none">
                                                    <span className="text-xs text-muted-foreground font-medium">Thinking...</span>
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

                {/* Input Bar Area */}
                <div className="bg-background px-4 py-4 sm:px-6 shrink-0">
                    <div className="max-w-3xl mx-auto w-full">
                        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 border border-border bg-card rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-2xs">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={input}
                                onChange={handleTextareaInput}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your message here..."
                                className="flex-1 max-h-[80px] min-h-[24px] bg-transparent border-0 p-0 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-hidden resize-none py-1 pr-12 scrollbar-thin overflow-y-auto leading-relaxed"
                                style={{ height: "auto" }}
                                disabled={isPending}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                variant="default"
                                disabled={!input.trim() || isPending}
                                className="absolute right-3 bottom-3 h-8 w-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                            >
                                {isPending ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowUpIcon className="h-4 w-4" />
                                )}
                                <span className="sr-only">Send message</span>
                            </Button>
                        </form>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground select-none">
                            StockPilot can make mistakes. Please verify important inventory details.
                        </p>
                    </div>
                </div>
            </div>
        </MessageScrollerProvider>
    )
}

export default ChatbotPage