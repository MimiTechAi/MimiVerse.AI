export interface AgentThinkingProps {
    thoughts: { id: string; text: string }[];
    isThinking: boolean;
    hidden: boolean;
    onToggleHidden?: () => void;
    onCopyAll?: (content: string) => void;
    onSendToComposer?: (content: string) => void;
}

export function AgentThinking({
    thoughts,
    isThinking,
    hidden,
    onToggleHidden,
    onCopyAll,
    onSendToComposer,
}: AgentThinkingProps) {
    if (!thoughts.length) return null;

    const fullText = thoughts.map(t => t.text).join("\n\n");
    const title = isThinking
        ? `Thinking… (${thoughts.length} steps)`
        : `Thought process (${thoughts.length} steps)`;

    return (
        <div className="rounded-2xl border border-zinc-800 bg-[#111114] px-4 py-3 space-y-2">
            {/* Header - Always Visible */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-zinc-100">{title}</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onCopyAll?.(fullText)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    >
                        Copy
                    </button>
                    <button
                        type="button"
                        onClick={() => onSendToComposer?.(fullText)}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-purple-600 text-purple-200 hover:bg-purple-600/20"
                    >
                        Send to Composer
                    </button>
                    <button
                        type="button"
                        onClick={onToggleHidden}
                        className="text-[11px] text-zinc-400 hover:text-zinc-100"
                    >
                        {hidden ? "Show" : "Hide"} thoughts
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!hidden && (
                <ul className="space-y-1 text-[11px] leading-snug text-zinc-200">
                    {thoughts.map((t, idx) => (
                        <li key={t.id ?? idx} className="flex gap-2">
                            <span className="mt-0.5 text-zinc-500">{idx + 1}.</span>
                            <span className="whitespace-pre-wrap">{t.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
