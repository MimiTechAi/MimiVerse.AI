import { useState } from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { ChevronRight, ChevronDown, MoreHorizontal, FolderPlus, FilePlus, RefreshCw, GitBranch, Copy, Trash2, Edit2 } from "lucide-react";
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
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onSelect: (node: FileNode) => void;
  activeFileId?: string;
}

function FileTreeItem({ node, level, onSelect, activeFileId }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(node.isOpen);
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
            "truncate flex-1 transition-colors",
            isModified && "text-yellow-400",
            isNew && "text-green-400",
            !isModified && !isNew && "group-hover:text-white"
          )}>
            {node.name}
          </span>
          
          {isModified && <span className="text-[10px] text-yellow-400 mr-2">M</span>}
          {isNew && <span className="text-[10px] text-green-400 mr-2">U</span>}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#252526] border-[#333] text-white/90">
        <ContextMenuItem className="focus:bg-[#094771] focus:text-white cursor-pointer">
           <Edit2 size={14} className="mr-2" /> Rename
        </ContextMenuItem>
        <ContextMenuItem className="focus:bg-[#094771] focus:text-white cursor-pointer">
           <Copy size={14} className="mr-2" /> Copy Path
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#333]" />
        <ContextMenuItem className="focus:bg-[#094771] focus:text-white cursor-pointer text-red-400 focus:text-red-100">
           <Trash2 size={14} className="mr-2" /> Delete
           <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function Sidebar({ files, onFileSelect, activeFileId }: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 group">
        <span>Explorer</span>
        <MoreHorizontal size={16} className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:text-white" />
      </div>
      
      <div className="px-4 py-2 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] mb-2 shrink-0 bg-[hsl(var(--sidebar))] z-10">
        <div className="flex items-center gap-2 group cursor-pointer">
           <ChevronDown size={14} className="text-white/70 group-hover:text-white" />
           <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">PROJECT-ROOT</span>
        </div>
        <div className="flex gap-2">
          <FilePlus size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors" />
          <FolderPlus size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors" />
          <RefreshCw size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="pb-4">
          {files.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              level={0}
              onSelect={onFileSelect}
              activeFileId={activeFileId}
            />
          ))}
        </div>
      </ScrollArea>

       {/* Timeline / Outline (Mock) */}
      <div className="border-t border-[hsl(var(--sidebar-border))] flex flex-col">
         <div className="h-7 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[hsl(var(--sidebar))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
            <ChevronRight size={14} className="mr-1" />
            <span>Outline</span>
         </div>
         <div className="h-7 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[hsl(var(--sidebar))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
            <ChevronRight size={14} className="mr-1" />
            <span>Timeline</span>
         </div>
          <div className="h-7 px-4 flex items-center text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0 cursor-pointer hover:text-white bg-[hsl(var(--sidebar))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors">
            <ChevronRight size={14} className="mr-1" />
            <span>NPM Scripts</span>
         </div>
      </div>
    </div>
  );
}
