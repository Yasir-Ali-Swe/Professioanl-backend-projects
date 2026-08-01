// src/components/chatbot/MessageAnimate.jsx
import { useEffect, useRef, useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, PackageX } from "lucide-react"
import "highlight.js/styles/github-dark.css"

// ============ FORMATTING HELPERS ============

const formatCurrency = (value) => {
    const num = typeof value === "number" ? value : parseFloat(value);
    if (num === undefined || num === null || isNaN(num)) return "PKR 0.00";
    return `PKR ${num.toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const formatPercentage = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "0%";
    const pctVal = value > 1 ? value : value * 100;
    return `${Math.round(pctVal)}%`;
};

const formatCellValue = (value, col) => {
    if (value === null || value === undefined || value === "") return "—";

    const keyLower = (col?.key || '').toLowerCase();
    const isIdentifier = keyLower.includes('invoicenumber') || keyLower.includes('ponumber') || keyLower.includes('sku') || keyLower.includes('categoryslug');
    if (isIdentifier) {
        return String(value);
    }

    if (typeof value === 'string') {
        if (value.startsWith('PKR')) return value;
        if (value.endsWith('%')) return value;
        if (col?.format === "date" || col?.type === "date") {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
            }
        }
        return value;
    }

    if (col?.format === "currency") {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return "PKR 0.00";
        return formatCurrency(num);
    }
    if (col?.format === "percentage") {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return "0%";
        return formatPercentage(num);
    }
    if (col?.format === "date") {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
        }
        return String(value);
    }
    if (col?.format === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === 'number') {
        const keyLower = (col?.key || '').toLowerCase();
        if (keyLower.includes('price') || keyLower.includes('cost') ||
            keyLower.includes('revenue') || keyLower.includes('total') ||
            keyLower.includes('amount') || keyLower.includes('value') ||
            keyLower.includes('profit') || keyLower.includes('subtotal') ||
            keyLower.includes('valuation')) {
            return formatCurrency(value);
        }
        if (keyLower.includes('margin') || keyLower.includes('percentage')) {
            return formatPercentage(value);
        }
        return value;
    }

    if (value instanceof Date) {
        return value.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
    }

    if (typeof value === 'boolean') {
        return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
        return value.length;
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

const hasStatusEmoji = (text) => {
    if (!text) return false;
    return /[🟢🟡🔴⚫]/.test(text.toString());
};

const getValueByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
};

// ============ EMPTY STATE ============

function EmptyState({ message }) {
    return (
        <div className="w-full my-4 p-6 border border-border rounded-xl bg-card text-center select-none shadow-2xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground mx-auto mb-3">
                <PackageX className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
                {message || "No matching records found"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
                {message === "No data found matching your criteria."
                    ? "We couldn't find any data matching your search criteria."
                    : "Try adjusting your search terms or filters."}
            </p>
            <div className="text-left bg-muted/40 border border-border/60 rounded-lg p-3 max-w-sm mx-auto text-xs">
                <span className="font-semibold text-foreground block mb-1">Try asking:</span>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>"Show all products"</li>
                    <li>"Remove current filters"</li>
                    <li>"Search using a different keyword"</li>
                </ul>
            </div>
        </div>
    );
}

// ============ MARKDOWN COMPONENTS ============

const markdownComponents = {
    h1: ({ node, ...props }) => (
        <h1 className="text-base font-bold mt-4 mb-2 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    h2: ({ node, ...props }) => (
        <h2 className="text-sm font-bold mt-4 mb-2 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    h3: ({ node, ...props }) => (
        <h3 className="text-xs font-semibold mt-3 mb-1 text-foreground wrap-break-word [word-break:break-word]" {...props} />
    ),
    p: ({ node, children, ...props }) => (
        <p className="mb-2.5 last:mb-0 leading-relaxed text-sm text-foreground wrap-break-word [word-break:break-word]" {...props}>
            {children}
        </p>
    ),
    ul: ({ node, children, ...props }) => (
        <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-sm text-foreground wrap-break-word [word-break:break-word]" {...props}>
            {children}
        </ul>
    ),
    li: ({ node, children, ...props }) => (
        <li className="pl-0.5 wrap-break-word [word-break:break-word] leading-relaxed text-sm" {...props}>
            {children}
        </li>
    ),
    // ============ TABLE COMPONENTS ============
    table: ({ children, ...props }) => (
        <div className="w-full my-4 overflow-x-auto border border-border rounded-lg shadow-2xs bg-card">
            <table className="w-full text-xs border-collapse min-w-[550px]" {...props}>
                {children}
            </table>
        </div>
    ),
    thead: ({ children, ...props }) => (
        <thead className="bg-muted/90 backdrop-blur-xs text-foreground border-b border-border font-semibold sticky top-0 z-10 select-none" {...props}>
            {children}
        </thead>
    ),
    tbody: ({ children, ...props }) => (
        <tbody className="divide-y divide-border" {...props}>
            {children}
        </tbody>
    ),
    tr: ({ children, ...props }) => (
        <tr className="transition-colors hover:bg-muted/40" {...props}>
            {children}
        </tr>
    ),
    th: ({ children, align, ...props }) => (
        <th
            className={cn(
                "px-3.5 py-2.5 border-r last:border-0 border-border text-foreground whitespace-nowrap text-xs font-semibold bg-muted/90",
                align === "right" ? "text-right" :
                    align === "center" ? "text-center" : "text-left"
            )}
            {...props}
        >
            {children}
        </th>
    ),
    td: ({ children, align, ...props }) => (
        <td
            className={cn(
                "px-3.5 py-2.5 border-r last:border-0 border-border text-foreground whitespace-nowrap text-xs",
                align === "right" ? "text-right font-mono text-[11px]" :
                    align === "center" ? "text-center" : "text-left"
            )}
            {...props}
        >
            {children}
        </td>
    ),
    code: ({ node, className, children, ...props }) => {
        const inline = !className;
        if (inline) {
            return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono border border-border text-foreground font-semibold wrap-break-word whitespace-pre-wrap" {...props}>
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
    },
    span: ({ node, className, children, ...props }) => {
        const content = children?.toString() || "";
        const isSectionHeader = /[📦📊💡🎯💬]/.test(content);

        if (isSectionHeader) {
            let colorClass = "text-primary";
            if (content.includes("📦")) colorClass = "text-primary";
            else if (content.includes("📊")) colorClass = "text-blue-600";
            else if (content.includes("💡")) colorClass = "text-amber-600";
            else if (content.includes("🎯")) colorClass = "text-green-600";
            else if (content.includes("💬")) colorClass = "text-purple-600";

            return (
                <span className={cn("font-bold text-base mt-4 block", colorClass, className)} {...props}>
                    {children}
                </span>
            );
        }

        return <span className={className} {...props}>{children}</span>
    },
};

// ============ MAIN MESSAGE COMPONENT ============

export function MessageAnimated({
    message,
    scrollAnchor = false,
    className,
    isHistoryConversation = false,
    isChatPending = false,
    ...props
}) {
    const [displayContent, setDisplayContent] = useState(message.content || "");
    const messageRef = useRef(null);
    const isUser = message.role === "user";
    const isAssistant = message.role === "assistant";

    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [scrollHeight, setScrollHeight] = useState(0);
    const contentRef = useRef(null);

    useEffect(() => {
        setDisplayContent(message.content || "");
    }, [message.content]);

    useEffect(() => {
        if (isUser && contentRef.current && typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const sh = entry.target.scrollHeight;
                    setScrollHeight(sh);
                    setIsOverflowing(sh > 135);
                }
            });
            observer.observe(contentRef.current);
            return () => observer.disconnect();
        }
    }, [isUser, message.content]);

    const content = isUser
        ? message.content || ""
        : displayContent || message.content || "";

    const customMarkdownComponents = useMemo(() => ({
        ...markdownComponents,
    }), []);

    return (
        <div
            ref={messageRef}
            className={cn(
                "flex w-full gap-3 transition-all duration-300 ease-out",
                isUser ? "justify-end" : "justify-start",
                scrollAnchor && "scroll-mt-4",
                className,
            )}
            {...props}
        >
            <div
                className={cn(
                    "transition-all duration-200 wrap-break-word [word-break:break-word] overflow-hidden flex flex-col",
                    isUser
                        ? "max-w-[75%] bg-primary mt-4 text-slate-950 px-4 py-3 rounded-tr-none shadow-sm rounded-2xl font-semibold"
                        : "w-full bg-background px-5 py-4 rounded-tl-none ring-0 text-foreground",
                )}
            >
                {isAssistant ? (
                    <div className="relative leading-relaxed wrap-break-word [word-break:break-word]">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={customMarkdownComponents}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <>
                        <div
                            ref={contentRef}
                            style={{
                                maxHeight: isOverflowing && !isExpanded ? "135px" : isExpanded ? `${scrollHeight}px` : "none",
                                transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                            className={cn("relative overflow-hidden transition-all duration-300 w-full")}
                        >
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap wrap-break-word [word-break:break-word]">
                                {content}
                            </p>

                            {isOverflowing && !isExpanded && (
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-primary via-primary/80 to-transparent pointer-events-none" />
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
    );
}