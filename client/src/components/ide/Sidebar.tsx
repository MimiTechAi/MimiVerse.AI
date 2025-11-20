import { useState } from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { ChevronRight, ChevronDown, MoreHorizontal, FolderPlus, FilePlus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-[hsl(var(--sidebar-accent))] transition-colors select-none text-sm",
          activeFileId === node.id && "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]",
          activeFileId !== node.id && "text-[hsl(var(--sidebar-foreground))]"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1 opacity-70 w-4 h-4 flex items-center justify-center shrink-0">
          {node.type === 'folder' && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </span>
        <Icon size={16} className={cn("mr-2 shrink-0", node.type === 'folder' ? "text-blue-400" : "opacity-80")} />
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              activeFileId={activeFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ files, onFileSelect, activeFileId }: SidebarProps) {
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between text-[hsl(var(--sidebar-foreground))] text-xs font-medium uppercase tracking-wider shrink-0">
        <span>Explorer</span>
        <MoreHorizontal size={16} className="cursor-pointer hover:text-white" />
      </div>
      
      <div className="px-4 py-2 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] mb-2 shrink-0">
        <span className="text-sm font-bold text-white">PROJECT-ROOT</span>
        <div className="flex gap-2">
          <FilePlus size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer" />
          <FolderPlus size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer" />
          <RefreshCw size={16} className="text-[hsl(var(--sidebar-foreground))] hover:text-white cursor-pointer" />
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
    </div>
  );
}
