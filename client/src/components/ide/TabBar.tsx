import { X } from 'lucide-react';
import { getFileIcon } from '@/lib/file-system';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/lib/file-system';

interface TabBarProps {
    files: FileNode[];
    activeFileId?: string;
    onSelectTab: (file: FileNode) => void;
    onCloseTab: (fileId: string) => void;
    unsavedFiles: Set<string>;
}

export function TabBar({ files, activeFileId, onSelectTab, onCloseTab, unsavedFiles }: TabBarProps) {
    if (files.length === 0) return null;

    return (
        <div className="h-9 bg-[#18181B] border-b border-[hsl(var(--sidebar-border))] flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {files.map((file) => {
                const Icon = getFileIcon(file.name, file.type);
                const isActive = file.id === activeFileId;
                const hasUnsavedChanges = unsavedFiles.has(file.id);

                return (
                    <div
                        key={file.id}
                        className={cn(
                            "group flex items-center gap-2 px-3 h-full border-r border-[hsl(var(--sidebar-border))] cursor-pointer transition-colors shrink-0",
                            isActive
                                ? "bg-[#09090b] text-white"
                                : "bg-[#18181B] text-gray-400 hover:bg-[#1E1E24] hover:text-white"
                        )}
                        onClick={() => onSelectTab(file)}
                    >
                        <Icon size={14} className="shrink-0" />
                        <span className="text-xs font-mono max-w-[120px] truncate">
                            {file.name}
                        </span>
                        {hasUnsavedChanges && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onCloseTab(file.id);
                            }}
                            className={cn(
                                "ml-1 p-0.5 rounded hover:bg-white/10 transition-opacity shrink-0",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                        >
                            <X size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
