import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./Editor";
import { Terminal } from "./Terminal";
import { StatusBar } from "./StatusBar";
import { Header } from "./Header";
import { Preview } from "./Preview";
import { CommandPalette } from "./CommandPalette";
import { AIChat } from "./AIChat";
import { useState, useEffect } from "react";
import { FileNode, INITIAL_FILES } from "@/lib/file-system";

export function IDELayout() {
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
  const [activeView, setActiveView] = useState("explorer");
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);

  // Initialize with App.tsx open
  useEffect(() => {
    const findFile = (nodes: FileNode[], id: string): FileNode | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findFile(node.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const appFile = findFile(INITIAL_FILES, 'App.tsx');
    if (appFile) {
      setOpenFiles([appFile]);
      setActiveFileId(appFile.id);
    }
  }, []);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  const handleFileSelect = (file: FileNode) => {
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles([...openFiles, file]);
    }
    setActiveFileId(file.id);
  };

  const handleCloseFile = (fileId: string) => {
    const newOpenFiles = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(newOpenFiles);
    
    if (activeFileId === fileId) {
      if (newOpenFiles.length > 0) {
        setActiveFileId(newOpenFiles[newOpenFiles.length - 1].id);
      } else {
        setActiveFileId(undefined);
      }
    }
  };

  const handleContentChange = (fileId: string, content: string) => {
    setOpenFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden font-sans">
      <Header />
      <CommandPalette />
      
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar activeView={activeView} setActiveView={setActiveView} />
        
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel 
            defaultSize={20} 
            minSize={15} 
            maxSize={30} 
            className="bg-[hsl(var(--sidebar))]"
            collapsible={true}
            collapsedSize={0}
          >
            {activeView === 'explorer' && (
              <Sidebar 
                files={files} 
                onFileSelect={handleFileSelect}
                activeFileId={activeFileId}
              />
            )}
             {activeView === 'ai' && (
              <AIChat />
            )}
            {activeView !== 'explorer' && activeView !== 'ai' && (
              <div className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
                {activeView} view not implemented in this mockup.
              </div>
            )}
          </ResizablePanel>
          
          <ResizableHandle className="bg-[hsl(var(--sidebar-border))] w-[1px]" />
          
          <ResizablePanel defaultSize={80}>
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={70}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={70}>
                    <EditorArea 
                      activeFile={activeFile}
                      openFiles={openFiles}
                      onCloseFile={handleCloseFile}
                      onSelectFile={handleFileSelect}
                      onContentChange={handleContentChange}
                    />
                  </ResizablePanel>
                  
                  <ResizableHandle className="bg-[hsl(var(--sidebar-border))] h-[1px]" />
                  
                  <ResizablePanel defaultSize={30}>
                    <Terminal />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle className="bg-[hsl(var(--sidebar-border))] w-[1px]" />

              <ResizablePanel defaultSize={30} minSize={20}>
                <Preview />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <StatusBar />
    </div>
  );
}
