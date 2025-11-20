import Editor, { OnMount } from "@monaco-editor/react";
import * as React from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { X, Command, Sparkles, Plus, FolderOpen, GitBranch, Settings, ExternalLink, LayoutTemplate, Cpu, Globe, Activity } from "lucide-react";
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
    
    monaco.editor.defineTheme('mimiverse-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272A4' },
        { token: 'keyword', foreground: 'FF79C6' },
        { token: 'string', foreground: 'F1FA8C' },
        { token: 'type', foreground: '8BE9FD' },
        { token: 'class', foreground: '8BE9FD' },
        { token: 'function', foreground: '50FA7B' },
        { token: 'variable', foreground: 'F8F8F2' },
        { token: 'number', foreground: 'BD93F9' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#F8F8F2',
        'editorLineNumber.foreground': '#6272A4',
        'editor.lineHighlightBackground': '#44475A',
        'editorIndentGuide.background': '#44475A',
        'editorIndentGuide.activeBackground': '#6272A4',
        'editorCursor.foreground': '#FF79C6', 
        'editorWhitespace.foreground': '#3B3A32',
        'editor.selectionBackground': '#44475A',
        'editor.inactiveSelectionBackground': '#44475A',
      }
    });
    monaco.editor.setTheme('mimiverse-dark');
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      onContentChange(activeFile.id, value);
    }
  };

  if (!activeFile) {
    return (
      <div className="h-full w-full bg-[#0F0F12] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay pointer-events-none" />
        
        <AIFloatingInput visible={aiInputVisible} onClose={() => setAiInputVisible(false)} />
        
        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="max-w-3xl w-full grid grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="space-y-2">
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.7, ease: "easeOut" }}
                 >
                   <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-6 ring-1 ring-white/10">
                      <Cpu className="text-white" size={32} />
                   </div>
                   <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">Mimiverse<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">.ai</span></h1>
                   <p className="text-purple-200/60 text-xl font-light tracking-wide">Autonomous Cognitive Operating System</p>
                 </motion.div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-purple-300/40 font-semibold mb-4">System Actions</p>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-300 transition-colors w-full text-left py-2 px-3 -mx-3 rounded-lg hover:bg-white/5">
                  <Plus size={20} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400 transition-colors" />
                  <span className="text-sm font-medium">Initialize New Project</span>
                </button>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-300 transition-colors w-full text-left py-2 px-3 -mx-3 rounded-lg hover:bg-white/5">
                  <FolderOpen size={20} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400 transition-colors" />
                  <span className="text-sm font-medium">Load Context from Folder</span>
                </button>
                <button className="group flex items-center gap-3 text-[hsl(var(--foreground))] hover:text-purple-300 transition-colors w-full text-left py-2 px-3 -mx-3 rounded-lg hover:bg-white/5">
                  <GitBranch size={20} className="text-[hsl(var(--muted-foreground))] group-hover:text-purple-400 transition-colors" />
                  <span className="text-sm font-medium">Connect to Repository</span>
                </button>
              </div>

              <div className="space-y-2 pt-4">
                <p className="text-xs uppercase tracking-widest text-purple-300/40 font-semibold mb-4">Recent Simulations</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors cursor-pointer group">
                    <div className="h-8 w-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">R</div>
                    <div className="flex-1">
                       <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">react-project-alpha</div>
                       <div className="text-xs text-white/40">~/simulations/react-project-alpha</div>
                    </div>
                    <div className="text-[10px] text-white/30">2h ago</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors cursor-pointer group">
                    <div className="h-8 w-8 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-mono text-xs font-bold">JS</div>
                    <div className="flex-1">
                       <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">snake-game-gen-2</div>
                       <div className="text-xs text-white/40">~/simulations/snake-game-gen-2</div>
                    </div>
                    <div className="text-[10px] text-white/30">5h ago</div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gradient-to-b from-[#1E1E24] to-[#16161A] rounded-2xl p-1 border border-white/10 shadow-2xl relative overflow-hidden group"
              >
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                 
                 <div className="p-6 relative z-10">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur opacity-60 animate-pulse" />
                            <Sparkles size={24} className="text-purple-300 relative z-10" />
                         </div>
                         <span className="font-bold text-lg text-white tracking-wide">MIMI Agent</span>
                      </div>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/20 uppercase tracking-wider font-semibold">Online</span>
                   </div>
                   
                   <p className="text-sm text-purple-100/70 mb-6 leading-relaxed">
                     "Stop searching. Start solving. I simulate the solution."
                     <br/><br/>
                     I am ready to browse the web, architect complex systems, and write code in real-time.
                   </p>
                   
                   <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex flex-col gap-2 hover:border-purple-500/30 transition-colors cursor-pointer">
                         <Globe size={16} className="text-blue-400" />
                         <span className="text-xs font-medium text-white/80">Neural Browsing</span>
                      </div>
                      <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex flex-col gap-2 hover:border-purple-500/30 transition-colors cursor-pointer">
                         <Activity size={16} className="text-green-400" />
                         <span className="text-xs font-medium text-white/80">Cognitive Graph</span>
                      </div>
                   </div>

                   <Button className="w-full h-10 bg-white text-black hover:bg-purple-50 font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] border-0">
                     Initialize Session <span className="ml-2 opacity-50">⌘L</span>
                   </Button>
                 </div>
              </motion.div>

              <div className="space-y-3">
                 <p className="text-xs uppercase tracking-widest text-purple-300/40 font-semibold">Resources</p>
                 <div className="flex gap-4">
                    <a href="#" className="text-sm text-purple-400 hover:text-purple-300 hover:underline decoration-purple-500/50 underline-offset-4 transition-colors">Master Plan</a>
                    <a href="#" className="text-sm text-purple-400 hover:text-purple-300 hover:underline decoration-purple-500/50 underline-offset-4 transition-colors">Architect Protocol</a>
                    <a href="#" className="text-sm text-purple-400 hover:text-purple-300 hover:underline decoration-purple-500/50 underline-offset-4 transition-colors">v3.0.1 Changelog</a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--editor-bg))] relative group/editor font-sans">
      <AIFloatingInput visible={aiInputVisible} onClose={() => setAiInputVisible(false)} />

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-[hsl(var(--tab-inactive-bg))] no-scrollbar h-9 shrink-0 border-b border-[hsl(var(--sidebar-border))]">
        {openFiles.map(file => {
          const Icon = getFileIcon(file.name, file.type);
          const isActive = activeFile.id === file.id;
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center h-9 px-3 border-r border-[hsl(var(--sidebar-border))] cursor-pointer min-w-[140px] max-w-[200px] select-none transition-all relative",
                isActive 
                  ? "bg-[hsl(var(--editor-bg))] text-[hsl(var(--tab-active-fg))]" 
                  : "bg-[hsl(var(--tab-inactive-bg))] text-[hsl(var(--tab-inactive-fg))] hover:bg-[hsl(var(--editor-bg))] opacity-60 hover:opacity-100"
              )}
              onClick={() => onSelectFile(file)}
            >
              {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500" />}
              <Icon size={14} className={cn("mr-2 shrink-0", isActive ? "text-purple-400" : "opacity-70")} />
              <span className="text-xs truncate flex-1 font-medium">{file.name}</span>
              <div
                className={cn(
                  "ml-2 p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity",
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
      <div className="h-8 flex items-center px-4 bg-[hsl(var(--editor-bg))] text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors hover:underline decoration-white/20">src</span>
        <span className="mx-1 text-white/20">/</span>
        <span className="text-[hsl(var(--foreground))] font-medium">{activeFile.name}</span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
           <span className="flex items-center gap-1.5 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 font-medium">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
             MIMI Monitoring
           </span>
           <span className="px-2 py-0.5 hover:bg-[hsl(var(--sidebar-accent))] rounded cursor-pointer transition-colors text-white/50">UTF-8</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={activeFile.language || 'text'}
          value={activeFile.content || ''}
          theme="mimiverse-dark"
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          path={activeFile.id}
          options={{
            fontFamily: "'Fira Code', monospace",
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: true, scale: 0.75 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 20, bottom: 20 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true }
          }}
        />
        
        {/* Floating Action Button (MIMI) */}
        <div className="absolute bottom-6 right-6 z-10">
           <motion.button 
             whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(168,85,247,0.4)" }}
             whileTap={{ scale: 0.95 }}
             className="h-12 px-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-2xl shadow-purple-600/30 flex items-center gap-3 text-sm font-bold transition-all border border-white/10"
             onClick={() => setAiInputVisible(true)}
           >
              <Sparkles size={18} fill="currentColor" />
              <span>Edit with MIMI</span>
              <span className="ml-2 bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/70">⌘K</span>
           </motion.button>
        </div>
      </div>
    </div>
  );
}
