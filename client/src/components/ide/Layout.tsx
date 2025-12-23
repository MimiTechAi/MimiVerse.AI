import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { EditorArea } from "./Editor";
import Terminal from "./Terminal";
import { StatusBar } from "./StatusBar";
import { Header } from "./Header";
import { Preview } from "./Preview";
import { CommandPalette } from "./CommandPalette";
import { AIChat } from "./AIChat";
import { Composer } from "./Composer";
import { GitPanel } from "./GitPanel";
import { useState, useEffect, useRef } from "react";
import type React from "react";
import { FileNode, INITIAL_FILES } from "@/lib/file-system";
import { useFiles } from "@/hooks/useFiles";
import { useSettings } from "@/hooks/useSettings";
import { SettingsDialog } from "./SettingsDialog";
import { SearchPanel } from "./SearchPanel";
import { NeuralBrowserPanel } from "./NeuralBrowserPanel";
import { CognitiveGraphPanel } from "./CognitiveGraphPanel";
import { AgentManagerPanel } from "./AgentManagerPanel";
import { AgentTimeline } from "./AgentTimeline";
import { ContextSection } from "./ContextSection";
import { useDevServerDetector } from "@/hooks/useDevServerDetector";

export function IDELayout() {
  // Project & File Management
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const { files, loading: filesLoading, error: filesError, refreshFiles } = useFiles(currentProject);

  // UI State
  const [activeView, setActiveView] = useState("explorer");
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSetting } = useSettings();

  // Editor state for StatusBar
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());
  const [gitBranch, setGitBranch] = useState('main');
  const [errorCounts, setErrorCounts] = useState({ errors: 0, warnings: 0 });
  const editorRef = useRef<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [aiDockMode, setAiDockMode] = useState<'side' | 'bottom'>('side');
  const [layoutPreset, setLayoutPreset] = useState<'build' | 'debug' | 'chat'>('build');

  // Load active project from session
  useEffect(() => {
    const loadActiveProject = async () => {
      try {
        const response = await fetch('/api/v1/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentProject('mimiverse');
        }
      } catch (error) {
        console.error('Failed to load active project:', error);
      }
    };
    loadActiveProject();
  }, []);

  // Background dev-server detection: when a dev server on localhost is
  // discovered, offer the user to open the Preview panel via toast.
  useDevServerDetector({
    onDevServerDetected: () => {
      setPreviewVisible(true);
      setActiveView((current) => current === 'explorer' ? 'explorer' : current);
    },
  });

  // Initialize with App.tsx open (if files are loaded)
  useEffect(() => {
    if (files.length === 0 || openFiles.length > 0) return;

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

  useEffect(() => {
    if (layoutPreset === 'build') {
      setAiDockMode('side');
      setPreviewVisible(true);
      setActiveView('explorer');
    } else if (layoutPreset === 'chat') {
      setAiDockMode('bottom');
      setPreviewVisible(false);
      setActiveView('ai');
    } else if (layoutPreset === 'debug') {
      setAiDockMode('side');
      setPreviewVisible(false);
      setActiveView('explorer');
    }
  }, [layoutPreset]);

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
    // Mark file as unsaved
    setUnsavedFiles(prev => new Set(prev).add(fileId));
  };

  const handleFileSaved = (fileId: string) => {
    // Remove file from unsaved Set after successful save
    setUnsavedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  const handleTerminalData = (data: string) => {
    console.log("Terminal input:", data);
  };

  const handleCreateProject = async (name: string, prompt: string, mode: "ai" | "empty") => {
    try {
      const createRes = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      let projectId = name;
      if (createRes.ok) {
        try {
          const data = await createRes.json();
          if (data?.id && typeof data.id === 'string') {
            projectId = data.id;
          }
        } catch {
          // ignore JSON parse errors
        }
      } else if (createRes.status !== 409) {
        console.error('Failed to create project');
      }

      try {
        const openRes = await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/open`, {
          method: 'POST'
        });
        if (!openRes.ok) {
          console.error('Failed to open project');
        } else {
          setCurrentProject(projectId);
          refreshFiles();
        }
      } catch (error) {
        console.error('Open project request failed:', error);
      }

      if (mode === "ai") {
        setActiveView("ai");
        setAiPrompt(`Create a new project named "${name}". ${prompt}`);
      } else {
        setActiveView("explorer");
      }
    } catch (error) {
      console.error('Create project request failed:', error);
    }
  };

  // Get language from active file
  const getLanguage = (filename: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) return 'TypeScript';
    if (filename.endsWith('.jsx') || filename.endsWith('.js')) return 'JavaScript';
    if (filename.endsWith('.css')) return 'CSS';
    if (filename.endsWith('.json')) return 'JSON';
    if (filename.endsWith('.md')) return 'Markdown';
    return 'Plain Text';
  };

  const handleFileRenamed = (oldPath: string, newPath: string) => {
    setOpenFiles(prev => prev.map(file => {
      if (file.id === oldPath) {
        const newName = newPath.split('/').pop() || file.name;
        return { ...file, id: newPath, name: newName };
      }
      return file;
    }));
    if (activeFileId === oldPath) {
      setActiveFileId(newPath);
    }
  };

  const handleFileDeleted = (path: string) => {
    const wasOpen = openFiles.some(f => f.id === path);
    if (wasOpen) {
      handleCloseFile(path);
    }
  };

  const openFileFromPath = (filePath: string) => {
    const findFile = (nodes: FileNode[], target: string): FileNode | undefined => {
      for (const node of nodes) {
        if (node.id === target || (node as any).path === target) return node;
        if (node.children) {
          const found = findFile(node.children, target);
          if (found) return found;
        }
      }
      return undefined;
    };
    const foundFile = findFile(files, filePath);
    if (foundFile) {
      handleFileSelect(foundFile);
    }
  };

  const handleCommand = (commandId: string) => {
    switch (commandId) {
      case 'search':
        setActiveView('search');
        break;
      case 'format':
        // Monaco format will be handled by editor
        console.log('Format command - handled by editor');
        break;
      case 'terminal':
        // Terminal is always visible, could toggle in future
        console.log('Terminal toggle');
        break;
      case 'file:new':
        // Trigger new file dialog
        console.log('New file');
        break;
      case 'file:saveAll':
        // Save all open files
        console.log('Save all');
        break;
      case 'git:commit':
        setActiveView('git');
        break;
      case 'git:pull':
        console.log('Git pull');
        break;
      default:
        console.warn('Unknown command:', commandId);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-hidden font-sans selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-[#09090b] to-[#09090b] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-full">
        <Header
          currentProject={currentProject}
          onProjectChange={setCurrentProject}
          onSettingsClick={() => setSettingsOpen(true)}
          onRefreshFiles={refreshFiles}
          onAskMimi={() => {
            setActiveView('ai');
            setAiPrompt(undefined);
          }}
          onSearchSubmit={(query) => {
            setActiveView('ai');
            setAiPrompt(query);
          }}
        />
        <CommandPalette onCommand={handleCommand} />

        <div className="flex-1 flex overflow-hidden">
          <ActivityBar activeView={activeView} setActiveView={setActiveView} onSettingsClick={() => setSettingsOpen(true)} />

          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel
              defaultSize={18}
              minSize={14}
              maxSize={28}
              className="glass-strong z-10"
              collapsible={true}
              collapsedSize={0}
            >
              {(activeView === 'explorer' || activeView === 'ai') && (
                <Sidebar
                  files={files}
                  onFileSelect={handleFileSelect}
                  activeFileId={activeFileId}
                  onRefresh={refreshFiles}
                  currentProject={currentProject}
                  onFileRenamed={handleFileRenamed}
                  onFileDeleted={handleFileDeleted}
                  onGoToLine={(line) => {
                    if (editorRef.current?.scrollToLine) {
                      editorRef.current.scrollToLine(line);
                    }
                  }}
                  onAskMimi={(prompt) => {
                    setActiveView('ai');
                    setAiPrompt(prompt);
                  }}
                />
              )}
              {activeView === 'composer' && (
                <Composer
                  onSendToMimi={(prompt) => {
                    setActiveView('ai');
                    setAiPrompt(prompt);
                  }}
                />
              )}
              {activeView === 'search' && (
                <SearchPanel
                  onFileSelect={(file, line) => {
                    // Find file in tree and open it
                    const findFile = (nodes: FileNode[], path: string): FileNode | undefined => {
                      for (const node of nodes) {
                        if (node.id === path || node.path === path) return node;
                        if (node.children) {
                          const found = findFile(node.children, path);
                          if (found) return found;
                        }
                      }
                      return undefined;
                    };
                    const foundFile = findFile(files, file);
                    if (foundFile) {
                      handleFileSelect(foundFile);
                      // Scroll to line after file opens
                      setTimeout(() => {
                        editorRef.current?.scrollToLine?.(line);
                      }, 100);
                    }
                  }}
                />
              )}
              {activeView === 'git' && (
                <GitPanel onRefresh={refreshFiles} />
              )}
              {activeView === 'agent' && (
                <AgentManagerPanel
                  onOpenInChat={(prompt: string) => {
                    setActiveView('ai');
                    setAiPrompt(prompt);
                  }}
                />
              )}
              {activeView === 'browser' && (
                <NeuralBrowserPanel
                  onOpenFile={(path) => openFileFromPath(path)}
                  onSendToMimi={(prompt) => {
                    setActiveView('ai');
                    setAiPrompt(prompt);
                  }}
                />
              )}
              {activeView === 'graph' && (
                <CognitiveGraphPanel
                  onOpenFile={(path) => openFileFromPath(path)}
                  onSendToMimi={(prompt) => {
                    setActiveView('ai');
                    setAiPrompt(prompt);
                  }}
                />
              )}
              {activeView === 'timeline' && (
                <AgentTimeline
                  events={[]} // Mock data - would come from agent state
                  isLoading={false}
                />
              )}
              {activeView === 'context' && (
                <ContextSection
                  isLoading={false}
                />
              )}
              {activeView !== 'explorer' && activeView !== 'ai' && activeView !== 'composer' && activeView !== 'search' && activeView !== 'git' && activeView !== 'browser' && activeView !== 'graph' && activeView !== 'timeline' && activeView !== 'context' && activeView !== 'agent' && (
                <div className="p-4 text-sm text-[hsl(var(--muted-foreground))]">
                  {activeView} view not implemented in this mockup.
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle className="bg-white/5 w-[1px] hover:bg-purple-500/50 transition-colors" />

            <ResizablePanel defaultSize={82}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={70} minSize={55}>
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={72} minSize={60} className="bg-[#09090b]">
                      <EditorArea
                        ref={editorRef}
                        activeFile={activeFile}
                        openFiles={openFiles}
                        onCloseFile={handleCloseFile}
                        onSelectFile={handleFileSelect}
                        onContentChange={handleContentChange}
                        onCreateProject={handleCreateProject}
                        settings={settings}
                        unsavedFiles={unsavedFiles}
                        onCursorChange={setCursorPosition}
                        onFileSaved={handleFileSaved}
                        onErrorsChanged={(errors, warnings) => setErrorCounts({ errors, warnings })}
                        onOpenAIChat={(prompt) => {
                          setActiveView('ai');
                          setAiPrompt(prompt);
                        }}
                      />
                    </ResizablePanel>

                    <ResizableHandle className="bg-white/5 h-[1px] hover:bg-purple-500/50 transition-colors" />

                    <ResizablePanel defaultSize={28} minSize={18} maxSize={40} className="bg-[#09090b]">
                      {aiDockMode === 'bottom' && activeView === 'ai' ? (
                        <AIChat
                          openFiles={openFiles}
                          initialPrompt={aiPrompt}
                          onClearInitialPrompt={() => setAiPrompt(undefined)}
                          onFileChange={(path: string) => {
                            refreshFiles();
                            openFileFromPath(path);
                          }}
                        />
                      ) : (
                        <Terminal onData={handleTerminalData} />
                      )}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle className="bg-white/5 w-[1px] hover:bg-purple-500/50 transition-colors" />

                <ResizablePanel
                  defaultSize={30}
                  minSize={22}
                  maxSize={45}
                  className="bg-[#09090b]"
                  collapsible={true}
                >
                  {activeView === 'ai' && aiDockMode === 'side' ? (
                    <AIChat
                      openFiles={openFiles}
                      initialPrompt={aiPrompt}
                      onClearInitialPrompt={() => setAiPrompt(undefined)}
                      onFileChange={(path: string) => {
                        refreshFiles();
                        openFileFromPath(path);
                      }}
                    />
                  ) : previewVisible ? (
                    <Preview />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-xs text-[hsl(var(--muted-foreground))] px-4 text-center">
                      <p className="mb-2 font-medium text-[hsl(var(--foreground))]">Preview disabled</p>
                      <p className="mb-1">
                        Start your app&apos;s dev server (for example with <code>npm run dev</code>) to enable live preview.
                      </p>
                      <p className="mb-3">When a dev server is detected on localhost, MIMI will offer to open the preview.</p>
                      <button
                        className="mt-1 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white hover:bg-white/10 transition-colors"
                        onClick={() => setPreviewVisible(true)}
                      >
                        Open Preview manually
                      </button>
                    </div>
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <StatusBar
          line={cursorPosition.line}
          column={cursorPosition.column}
          language={activeFile ? getLanguage(activeFile.name) : 'Plain Text'}
          gitBranch={gitBranch}
          gitChanges={unsavedFiles.size}
          errors={errorCounts.errors}
          warnings={errorCounts.warnings}
          layoutPreset={layoutPreset}
          onLayoutPresetChange={setLayoutPreset}
        />
      </div>

      <SettingsDialog
        settings={settings}
        updateSetting={updateSetting}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
