import Editor, { OnMount } from "@monaco-editor/react";
import * as React from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { X, Command, Sparkles, Plus, FolderOpen, GitBranch, Settings, ExternalLink, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIFloatingInput } from "./AIFloatingInput";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface EditorAreaProps {
  activeFile?: FileNode;
  openFiles: FileNode[];
  onCloseFile: (fileId: string) => void;
  onSelectFile: (file: FileNode) => void;
  onContentChange: (fileId: string, content: string) => void;
}

export function EditorArea({ 
  activeFile, 
  openFiles, 
  onCloseFile, 
  onSelectFile,
  onContentChange
}: EditorAreaProps) {
  const editorRef = React.useRef<any>(null);
  const [aiInputVisible, setAiInputVisible] = React.useState(false);

  // Listen for Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAiInputVisible(v => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#858585',
        'editor.lineHighlightBackground': '#2F3337',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorCursor.foreground': '#A6E22E', 
        'editorWhitespace.foreground': '#3B3A32',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
      }
    });
    monaco.editor.setTheme('custom-dark');
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      onContentChange(activeFile.id, value);
    }
  };

  if (!activeFile) {
    return (
      <div className="h-full w-full bg-[hsl(var(--editor-bg))] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        
        <AIFloatingInput visible={aiInputVisible} onClose={() => setAiInputVisible(false)} />
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="space-y-2">
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.5 }}
                 >
                   <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                      <LayoutTemplate className="text-white" size={24} />
                   </div>
                   <h1 className="text-3xl font-light tracking-tight text-white">Ultimate IDE <span className="text-purple-400 font-normal">Pro</span></h1>
                   <p className="text-[hsl(var(--muted-foreground))] text-lg font-light">The future of development is here.</p>
                 </motion.div>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-3">Start</p>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-400 transition-colors w-full text-left py-1">
                  <Plus size={18} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400" />
                  <span className="text-sm">New File</span>
                </button>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-400 transition-colors w-full text-left py-1">
                  <FolderOpen size={18} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400" />
                  <span className="text-sm">Open Folder...</span>
                </button>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-400 transition-colors w-full text-left py-1">
                  <GitBranch size={18} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400" />
                  <span className="text-sm">Clone Repository...</span>
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-3">Recent</p>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-white transition-colors w-full text-left py-1">
                   <span className="text-sm flex-1">react-project-alpha</span>
                   <span className="text-xs text-[hsl(var(--muted-foreground))]">~/dev/react-project-alpha</span>
                </button>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-white transition-colors w-full text-left py-1">
                   <span className="text-sm flex-1">nextjs-dashboard</span>
                   <span className="text-xs text-[hsl(var(--muted-foreground))]">~/dev/nextjs-dashboard</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[hsl(var(--card))] rounded-xl p-6 border border-[hsl(var(--sidebar-border))] shadow-xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-4 text-purple-400">
                      <Sparkles size={18} />
                      <span className="font-medium text-sm">AI Assistant</span>
                   </div>
                   <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">
                     Your intelligent coding partner is ready. Use <kbd className="bg-[hsl(var(--input))] px-1.5 py-0.5 rounded text-xs text-[hsl(var(--foreground))] font-mono border border-[hsl(var(--sidebar-border))]">⌘K</kbd> to generate code or <kbd className="bg-[hsl(var(--input))] px-1.5 py-0.5 rounded text-xs text-[hsl(var(--foreground))] font-mono border border-[hsl(var(--sidebar-border))]">⌘L</kbd> to chat.
                   </p>
                   <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0">
                     Try AI Features
                   </Button>
                 </div>
              </div>

              <div className="space-y-2">
                 <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Help</p>
                 <a href="#" className="block text-sm text-blue-400 hover:underline">Show All Commands</a>
                 <a href="#" className="block text-sm text-blue-400 hover:underline">Documentation</a>
                 <a href="#" className="block text-sm text-blue-400 hover:underline">Release Notes</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--editor-bg))] relative group/editor">
      <AIFloatingInput visible={aiInputVisible} onClose={() => setAiInputVisible(false)} />

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-[hsl(var(--tab-inactive-bg))] no-scrollbar h-9 shrink-0">
        {openFiles.map(file => {
          const Icon = getFileIcon(file.name, file.type);
          const isActive = activeFile.id === file.id;
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center h-9 px-3 border-r border-[hsl(var(--sidebar-border))] cursor-pointer min-w-[120px] max-w-[200px] select-none transition-all relative",
                isActive 
                  ? "bg-[hsl(var(--editor-bg))] text-[hsl(var(--tab-active-fg))]" 
                  : "bg-[hsl(var(--tab-inactive-bg))] text-[hsl(var(--tab-inactive-fg))] hover:bg-[hsl(var(--editor-bg))] opacity-80 hover:opacity-100"
              )}
              onClick={() => onSelectFile(file)}
            >
              {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[hsl(var(--primary))]" />}
              <Icon size={14} className={cn("mr-2 shrink-0", isActive ? "text-blue-400" : "opacity-70")} />
              <span className="text-xs truncate flex-1">{file.name}</span>
              <div
                className={cn(
                  "ml-2 p-0.5 rounded hover:bg-[hsl(var(--sidebar-accent))] opacity-0 group-hover:opacity-100 transition-opacity",
                  isActive && "opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.id);
                }}
              >
                <X size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Breadcrumbs */}
      <div className="h-6 flex items-center px-4 bg-[hsl(var(--editor-bg))] text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">src</span>
        <span className="mx-1">›</span>
        <span className="text-[hsl(var(--foreground))] font-medium">{activeFile.name}</span>
        <div className="ml-auto flex items-center gap-2 text-[10px]">
           <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
             <Sparkles size={8} /> AI Enhanced
           </span>
           <span className="px-2 py-0.5 hover:bg-[hsl(var(--sidebar-accent))] rounded cursor-pointer transition-colors">Ln 12, Col 40</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={activeFile.language || 'text'}
          value={activeFile.content || ''}
          theme="custom-dark"
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          path={activeFile.id}
          options={{
            fontFamily: "'Fira Code', monospace",
            fontSize: 14,
            lineHeight: 21,
            minimap: { enabled: true, scale: 0.75 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true }
          }}
        />
        
        {/* Floating Action Button (Cursor/Manus style) */}
        <div className="absolute bottom-6 right-6 z-10">
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-600/30 flex items-center gap-2 text-sm font-medium transition-colors"
             onClick={() => setAiInputVisible(true)}
           >
              <Sparkles size={16} />
              <span>Edit with AI</span>
              <span className="ml-1 bg-purple-500/50 px-1.5 rounded text-xs">⌘K</span>
           </motion.button>
        </div>
      </div>
    </div>
  );
}
