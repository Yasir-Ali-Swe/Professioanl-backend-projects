import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp } from "lucide-react"
import "highlight.js/styles/github-dark.css"

// Custom Markdown renderers to match existing design language
const markdownComponents = {
    h1: ({ node, ...props }) => <h1 className="text-base font-bold mt-4 mb-2 text-foreground break-words [word-break:break-word]" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-sm font-semibold mt-3 mb-1.5 text-foreground break-words [word-break:break-word]" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-xs font-semibold mt-3 mb-1 text-foreground break-words [word-break:break-word]" {...props} />,
    p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0 leading-relaxed text-sm text-foreground break-words [word-break:break-word]" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-sm text-foreground break-words [word-break:break-word]" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-sm text-foreground break-words [word-break:break-word]" {...props} />,
    li: ({ node, ...props }) => <li className="pl-0.5 break-words [word-break:break-word]" {...props} />,
    blockquote: ({ node, ...props }) => (
        <blockquote className="border-l-4 border-primary/50 bg-muted/40 pl-3 py-1 my-2.5 italic rounded-r text-foreground/80 text-sm break-words [word-break:break-word]" {...props} />
    ),
    strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
    em: ({ node, ...props }) => <em className="italic text-foreground" {...props} />,
    table: ({ node, ...props }) => (
        <div className="w-full overflow-x-auto my-4 border border-border rounded-md shadow-2xs">
            <table className="w-full text-xs border-collapse" {...props} />
        </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-muted/70 text-foreground border-b border-border font-semibold" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="divide-y divide-border" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
    th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold border-r last:border-0 border-border text-foreground break-words [word-break:break-word]" {...props} />,
    td: ({ node, ...props }) => <td className="px-3 py-2 border-r last:border-0 border-border text-foreground break-words [word-break:break-word]" {...props} />,
    code: ({ node, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const inline = !className;
        if (inline) {
            return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border text-foreground font-semibold break-words [word-break:break-word] whitespace-pre-wrap" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <pre className="bg-muted/60 border border-border rounded-lg p-3.5 overflow-x-auto my-3 font-mono text-[11px] text-foreground leading-normal scrollbar-thin">
                <code className={cn("block w-full whitespace-pre", className)} {...props}>
                    {children}
                </code>
            </pre>
        );
    }
};

export function MessageAnimated({
    message,
    scrollAnchor = false,
    typingSpeed = 15,
    className,
    ...props
}) {
    const [isVisible, setIsVisible] = useState(false)
    const [displayContent, setDisplayContent] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const messageRef = useRef(null)
    const isUser = message.role === "user"
    const isAssistant = message.role === "assistant"

    // Collapsible states
    const [isOverflowing, setIsOverflowing] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [scrollHeight, setScrollHeight] = useState(0)
    const contentRef = useRef(null)

    useEffect(() => {
        // Animate message container in
        const timer = setTimeout(() => {
            setIsVisible(true)
        }, 50)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        // Typing animation for assistant messages
        if (isAssistant && isVisible && message.content) {
            setIsTyping(true)
            let index = 0
            const content = message.content

            const typingTimer = setInterval(() => {
                if (index < content.length) {
                    setDisplayContent(content.slice(0, index + 1))
                    index++
                } else {
                    setIsTyping(false)
                    clearInterval(typingTimer)
                }
            }, typingSpeed)

            return () => clearInterval(typingTimer)
        } else if (isUser && isVisible) {
            setDisplayContent(message.content)
        }
    }, [isVisible, isAssistant, message.content, typingSpeed])

    // Detect if content overflows 135px (~5-6 lines) using ResizeObserver
    useEffect(() => {
        if (isUser && contentRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const sh = entry.target.scrollHeight
                    setScrollHeight(sh)
                    setIsOverflowing(sh > 135)
                }
            })
            observer.observe(contentRef.current)
            return () => observer.disconnect()
        }
    }, [isUser, message.content])

    // If it's a user message or we want to show all content at once
    const content = isUser ? message.content : displayContent || message.content

    return (
        <div
            ref={messageRef}
            className={cn(
                "flex w-full gap-3 transition-all duration-300 ease-out",
                isUser ? "justify-end" : "justify-start",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
                scrollAnchor && "scroll-mt-4",
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    "transition-all duration-200 break-words [word-break:break-word] overflow-hidden flex flex-col",
                    isUser
                        ? "max-w-[75%] bg-primary text-slate-950 px-4 py-3 rounded-tr-none shadow-sm rounded-2xl font-semibold"
                        : "w-full bg-background px-5 py-4 rounded-tl-none ring-0 text-foreground"
                )}
            >
                {isAssistant ? (
                    <div className="relative leading-relaxed break-words [word-break:break-word]">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                        >
                            {content}
                        </ReactMarkdown>
                        {isTyping && (
                            <span className="inline-flex gap-1 items-center ml-2 select-none h-4 align-middle">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </span>
                        )}
                    </div>
                ) : (
                    <>
                        <div
                            ref={contentRef}
                            style={{
                                maxHeight: isOverflowing && !isExpanded ? "135px" : (isExpanded ? `${scrollHeight}px` : "none"),
                                transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            className={cn(
                                "relative overflow-hidden transition-all duration-300 w-full"
                            )}
                        >
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words [word-break:break-word]">{content}</p>

                            {isOverflowing && !isExpanded && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-primary via-primary/80 to-transparent pointer-events-none"
                                />
                            )}
                        </div>
                        {isOverflowing && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                aria-expanded={isExpanded}
                                className="w-full text-center mt-2.5 pt-2 border-t border-slate-950/15 text-xs font-bold text-slate-950/70 hover:text-slate-950 transition-colors cursor-pointer flex items-center justify-center gap-1 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-slate-950/30 rounded"
                            >
                                {isExpanded ? (
                                    <>
                                        <span>Show less</span>
                                        <ChevronUp className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </>
                                ) : (
                                    <>
                                        <span>Show more</span>
                                        <ChevronDown className="h-3.5 w-3.5 stroke-[2.5]" />
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}