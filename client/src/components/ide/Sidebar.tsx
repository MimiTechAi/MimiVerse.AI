import { useState, useEffect } from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { ChevronRight, ChevronDown, MoreHorizontal, FolderPlus, FilePlus, RefreshCw, GitBranch, Copy, Trash2, Edit2, Database, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface SidebarProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  activeFileId?: string;
  onRefresh?: () => void;
  currentProject?: string | null;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (path: string) => void;
  onGoToLine?: (line: number) => void;
  onAskMimi?: (prompt: string) => void;
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onSelect: (node: FileNode) => void;
  activeFileId?: string;
  onRefresh?: () => void;
  currentProject?: string | null;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (path: string) => void;
}

interface OutlineSymbol {
  name: string;
  kind: string;
  line: number;
  endLine: number;
  children?: OutlineSymbol[];
}

interface OutlineItemProps {
  symbol: OutlineSymbol;
  level: number;
  filePath?: string;
  onGoToLine?: (line: number) => void;
  onAskMimi?: (prompt: string) => void;
}

function OutlineItem({ symbol, level, filePath, onGoToLine, onAskMimi }: OutlineItemProps) {
  const hasChildren = Array.isArray(symbol.children) && symbol.children.length > 0;
  const kindLabel = symbol.kind;

  const handleClick = () => {
    if (onGoToLine) {
      onGoToLine(symbol.line);
    }
  };

  const handleAsk = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAskMimi) return;
    const location = filePath ? `${filePath}:${symbol.line}` : '';
    const parts: string[] = [];
    parts.push(`Focus on the ${kindLabel} "${symbol.name}"${location ? ` in ${location}` : ''}.`);
    parts.push("Review this symbol and propose improvements or fixes.");
    onAskMimi(parts.join(' '));
  };

  return (
    <div
      className={cn(
        "px-3 py-1 hover:bg-[hsl(var(--sidebar-accent))] cursor-pointer group flex flex-col gap-0.5"
      )}
      style={{ paddingLeft: 12 + level * 10 }}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-[hsl(var(--sidebar-foreground))] group-hover:text-white">
          {symbol.name}
        </span>
        <span className="text-[10px] text-gray-500 uppercase">{kindLabel}</span>
      </div>
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">
        <button
          type="button"
          className="px-1 py-0.5 rounded border border-white/10 hover:bg-white/10"
        >
          Go
        </button>
        {onAskMimi && (
          <button
            type="button"
            className="px-1 py-0.5 rounded border border-purple-500/40 hover:bg-purple-500/20 text-purple-200"
            onClick={handleAsk}
          >
            Ask MIMI
          </button>
        )}
      </div>
      {hasChildren && symbol.children!.map((child) => (
        <OutlineItem
          key={`${child.name}-${child.line}-${child.kind}`}
          symbol={child}
          level={level + 1}
          filePath={filePath}
          onGoToLine={onGoToLine}
          onAskMimi={onAskMimi}
        />
      ))}
    </div>
  );
}

function FileTreeItem({ node, level, onSelect, activeFileId, onRefresh, currentProject, onFileRenamed, onFileDeleted }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(node.isOpen);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const Icon = getFileIcon(node.name, node.type);
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  const handleRename = async () => {
    if (newName === node.name || !newName.trim()) {
      setIsRenaming(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: node.id,
          newPath: node.id.replace(node.name, newName.trim()) // Construct new path
        })
      });

      if (response.ok) {
        // Notify parent of rename for tab sync
        const newPath = node.id.replace(node.name, newName.trim());
        onFileRenamed?.(node.id, newPath);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Rename failed:', error);
    }
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${node.name}?`)) return;

    try {
      const response = await fetch('/api/v1/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: node.id })
      });

      if (response.ok) {
        // Notify parent of deletion for tab sync
        onFileDeleted?.(node.id);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.id);
  };

  // Mock git status colors
  const isModified = node.name === 'App.tsx';
  const isNew = node.name === 'Button.tsx';

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "flex items-center py-1 px-2 cursor-pointer hover:bg-[hsl(var(--sidebar-accent))] transition-colors select-none text-sm group relative",
            activeFileId === node.id && "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]",
            activeFileId !== node.id && "text-[hsl(var(--sidebar-foreground))]"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={handleClick}
        >
          {/* Indent guide */}
          {level > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5"
              style={{ left: `${level * 12}px` }}
            />
          )}

          <span className="mr-1 opacity-70 w-4 h-4 flex items-center justify-center shrink-0 hover:text-white transition-colors">
            {node.type === 'folder' && (
              isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            )}
          </span>
          <Icon size={16} className={cn("mr-2 shrink-0 transition-colors", node.type === 'folder' ? "text-blue-400 group-hover:text-blue-300" : "opacity-80 group-hover:opacity-100")} />
          <span className={cn(
            "truncate flex-1 transition-colors font-mono text-[13px]",
            isModified && "text-yellow-400",
            isNew && "text-green-400",
            !isModified && !isNew && "group-hover:text-white"
          )}>
            {node.name}
          </span>

          {isModified && <span className="text-[10px] text-yellow-400 mr-2 font-bold">M</span>}
          {isNew && <span className="text-[10px] text-green-400 mr-2 font-bold">U</span>}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#252526] border-[#333] text-white/90 backdrop-blur-xl bg-opacity-95">
        <ContextMenuItem
          className="focus:bg-purple-600 focus:text-white cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsRenaming(true);
          }}
        >
          <Edit2 size={14} className="mr-2" /> Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="focus:bg-purple-600 focus:text-white cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyPath();
          }}
        >
          <Copy size={14} className="mr-2" /> Copy Path
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#333]" />
        <ContextMenuItem
          className="focus:bg-purple-600 focus:text-white cursor-pointer text-red-400 focus:text-red-100"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
        >
          <Trash2 size={14} className="mr-2" /> Delete
          <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function Sidebar({ files, onFileSelect, activeFileId, onRefresh, currentProject, onFileRenamed, onFileDeleted, onGoToLine, onAskMimi }: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [outlineSymbols, setOutlineSymbols] = useState<OutlineSymbol[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);

  const loadOutline = async (filePath: string) => {
    setOutlineLoading(true);
    try {
      const response = await fetch('/api/files/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        setOutlineSymbols([]);
        return;
      }

      const data = await response.json();
      const symbols = Array.isArray(data.symbols) ? data.symbols : [];
      setOutlineSymbols(symbols);
    } catch (error) {
      console.error('Outline load failed:', error);
      setOutlineSymbols([]);
    } finally {
      setOutlineLoading(false);
    }
  };

  useEffect(() => {
    if (isOutlineOpen && activeFileId) {
      loadOutline(activeFileId);
    }
  }, [isOutlineOpen, activeFileId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    try {
      const formData = new FormData();
      droppedFiles.forEach(file => formData.append('files', file));
      if (currentProject) {
        formData.append('project', currentProject);
      }

      const response = await fetch('/api/v1/files/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        onRefresh?.();
      } else {
        console.error('File upload failed:', await response.text());
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };
  const [showGitPanel, setShowGitPanel] = useState(false);

  const handleNewFile = async () => {
    const name = prompt('File name:');
    if (!name) return;

    try {
      const response = await fetch('/api/v1/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: name,
          type: 'file'
        })
      });
      if (response.ok && onRefresh) onRefresh();
    } catch (error) {
      console.error('Create file failed:', error);
    }
  };

  const handleNewFolder = async () => {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      const response = await fetch('/api/v1/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: name,
          type: 'folder'
        })
      });
      if (response.ok && onRefresh) onRefresh();
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--sidebar-border))] relative",
        isDragging && "ring-2 ring-purple-500 ring-inset bg-purple-500/10"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="text-white text-lg font-semibold">Drop files to upload</div>
        </div>
      )}
      <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-1">
          <FolderPlus
            size={14}
            className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors"
            onClick={handleNewFolder}
          />
          <FilePlus
            size={14}
            className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors"
            onClick={handleNewFile}
          />
          <RefreshCw
            size={14}
            className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors"
            onClick={onRefresh}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.map((file) => (
            <FileTreeItem
              key={file.id}
              node={file}
              level={0}
              onSelect={onFileSelect}
              activeFileId={activeFileId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Timeline / Outline / Git */}
      <div className="border-t border-[hsl(var(--sidebar-border))] flex flex-col">
        <div
          className="h-8 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[#1E1E24] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          onClick={() => setIsOutlineOpen(!isOutlineOpen)}
        >
          <ChevronRight size={14} className={cn("mr-2 transition-transform", isOutlineOpen && "rotate-90")} />
          <span>Outline</span>
        </div>
        {isOutlineOpen && (
          <div className="max-h-56 overflow-auto border-t border-[hsl(var(--sidebar-border))] bg-[#111827]">
            {!activeFileId && (
              <div className="px-4 py-2 text-[11px] text-gray-500">
                No file selected.
              </div>
            )}
            {activeFileId && outlineLoading && (
              <div className="px-4 py-2 text-[11px] text-gray-500">
                Loading outline...
              </div>
            )}
            {activeFileId && !outlineLoading && outlineSymbols.length === 0 && (
              <div className="px-4 py-2 text-[11px] text-gray-500">
                No symbols found for this file.
              </div>
            )}
            {activeFileId && !outlineLoading && outlineSymbols.length > 0 && (
              <div className="py-1">
                {outlineSymbols.map((symbol) => (
                  <OutlineItem
                    key={`${symbol.name}-${symbol.line}-${symbol.kind}`}
                    symbol={symbol}
                    level={0}
                    filePath={activeFileId}
                    onGoToLine={onGoToLine}
                    onAskMimi={onAskMimi}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="h-8 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[#1E1E24] hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
          <ChevronRight size={14} className="mr-2" />
          <span>Timeline</span>
        </div>
        <div className="h-8 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[#1E1E24] hover:bg-[hsl(var(--sidebar-accent))] transition-colors" onClick={() => setShowGitPanel(!showGitPanel)}>
          <ChevronRight size={14} className={cn("mr-2 transition-transform", showGitPanel && "rotate-90")} />
          <GitBranch size={14} className="mr-2" />
          <span>Git</span>
        </div>
        {showGitPanel && (
          <div className="max-h-64 overflow-hidden border-t border-[hsl(var(--sidebar-border))]">
            <GitPanelCompact />
          </div>
        )}
      </div>
    </div>
  );
}

function GitPanelCompact() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/git/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error('Git status failed:', err));
  }, []);

  if (!status) return null;

  const totalChanges = (status.modified?.length || 0) + (status.added?.length || 0) +
    (status.deleted?.length || 0) + (status.untracked?.length || 0);

  return (
    <div className="p-2 text-xs bg-[#1E1E24]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">{status.branch || 'main'}</span>
        <span className="text-gray-500">{totalChanges} changes</span>
      </div>
      {totalChanges > 0 && (
        <div className="space-y-1">
          {status.modified?.slice(0, 3).map((file: string) => (
            <div key={file} className="text-yellow-400 truncate">M {file}</div>
          ))}
          {status.added?.slice(0, 3).map((file: string) => (
            <div key={file} className="text-green-400 truncate">A {file}</div>
          ))}
          {totalChanges > 3 && (
            <div className="text-gray-500">+{totalChanges - 3} more...</div>
          )}
        </div>
      )}
    </div>
  );
}
