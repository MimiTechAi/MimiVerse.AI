import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import { FileNode, getFileIcon } from "@/lib/file-system";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define theme
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#858585',
        'editor.lineHighlightBackground': '#2F3337',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
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
      <div className="h-full w-full bg-[hsl(var(--editor-bg))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        <div className="text-center">
          <div className="text-2xl mb-2 font-light">Visual Studio Code</div>
          <div className="text-sm">Show All Commands <span className="bg-[hsl(var(--muted))] px-1 rounded text-xs">Ctrl+Shift+P</span></div>
          <div className="text-sm mt-1">Go to File <span className="bg-[hsl(var(--muted))] px-1 rounded text-xs">Ctrl+P</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--editor-bg))]">
      {/* Tabs */}
      <div className="flex overflow-x-auto bg-[hsl(var(--tab-inactive-bg))] no-scrollbar">
        {openFiles.map(file => {
          const Icon = getFileIcon(file.name, file.type);
          const isActive = activeFile.id === file.id;
          return (
            <div
              key={file.id}
              className={cn(
                "group flex items-center h-9 px-3 border-r border-[hsl(var(--sidebar-border))] cursor-pointer min-w-[120px] max-w-[200px] select-none",
                isActive 
                  ? "bg-[hsl(var(--editor-bg))] text-[hsl(var(--tab-active-fg))] border-t-2 border-t-[hsl(var(--primary))]" 
                  : "bg-[hsl(var(--tab-inactive-bg))] text-[hsl(var(--tab-inactive-fg))] hover:bg-[hsl(var(--editor-bg))] opacity-80 hover:opacity-100"
              )}
              onClick={() => onSelectFile(file)}
            >
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

      {/* Breadcrumbs (Simplified) */}
      <div className="h-6 flex items-center px-4 bg-[hsl(var(--editor-bg))] text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--sidebar-border))]">
        <span>src</span>
        <span className="mx-1">›</span>
        <span className="text-[hsl(var(--foreground))]">{activeFile.name}</span>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={activeFile.language || 'text'}
          value={activeFile.content || ''}
          theme="custom-dark"
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          path={activeFile.id} // Important for model recycling
          options={{
            fontFamily: "'Fira Code', monospace",
            fontSize: 14,
            lineHeight: 21,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on'
          }}
        />
      </div>
    </div>
  );
}
