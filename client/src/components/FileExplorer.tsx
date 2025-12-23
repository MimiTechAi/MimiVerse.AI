import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File, ChevronUp, Loader2, Plus, FolderPlus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    path: string;
}

interface FileExplorerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (path: string) => void;
    title?: string;
    actionLabel?: string;
    allowCreateFolder?: boolean;
}

export function FileExplorer({
    open,
    onOpenChange,
    onSelect,
    title = "Select Folder",
    actionLabel = "Select",
    allowCreateFolder = true
}: FileExplorerProps) {
    const [currentPath, setCurrentPath] = useState<string>('');
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchFiles = async (path: string = '') => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/system/list?path=${encodeURIComponent(path)}`);
            if (!res.ok) {
                let message = 'Failed to list files';
                try {
                    const data = await res.json();
                    if (data?.message) {
                        message = data.message;
                    }
                } catch {
                    // ignore json parse error
                }
                throw new Error(message);
            }
            const data = await res.json();
            setFiles(data.files);
            setCurrentPath(data.path);
            setErrorMessage(null);
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to list files');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log('[FileExplorer] Open state changed:', open);
        if (open) {
            console.log('[FileExplorer] Fetching files for path:', currentPath);
            fetchFiles(currentPath);
        }
    }, [open]);

    const handleNavigate = (path: string) => {
        fetchFiles(path);
        setSelectedPath(null);
    };

    const handleUp = () => {
        // Simple parent directory logic
        const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
        handleNavigate(parent);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            const res = await fetch('/api/system/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: currentPath,
                    name: newFolderName,
                    type: 'directory'
                })
            });

            if (!res.ok) {
                let message = 'Failed to create folder';
                try {
                    const data = await res.json();
                    if (data?.message) {
                        message = data.message;
                    }
                } catch {
                    // ignore json parse error
                }
                throw new Error(message);
            }

            setIsCreatingFolder(false);
            setNewFolderName('');
            fetchFiles(currentPath);
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to create folder');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#1E1E24] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-xs text-gray-400">
                        Browse your local filesystem to select a workspace folder.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleUp}
                            disabled={currentPath === '/'}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <ChevronUp size={20} />
                        </Button>
                        <Input
                            value={currentPath}
                            onChange={(e) => setCurrentPath(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchFiles(currentPath)}
                            className="bg-[#27272A] border-white/10 text-white font-mono text-sm"
                        />
                        {allowCreateFolder && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                                className={cn("text-gray-400 hover:text-white hover:bg-white/10", isCreatingFolder && "bg-white/10 text-white")}
                            >
                                <FolderPlus size={20} />
                            </Button>
                        )}
                    </div>

                    {errorMessage && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                            {errorMessage}
                        </div>
                    )}

                    {isCreatingFolder && (
                        <div className="flex items-center gap-2 bg-[#27272A] p-2 rounded-md border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <Folder size={16} className="text-blue-400" />
                            <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder name"
                                className="h-8 bg-transparent border-none focus-visible:ring-0 px-0"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                            <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
                        </div>
                    )}

                    <ScrollArea className="h-[400px] border border-white/5 rounded-md bg-[#18181B]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <Loader2 className="animate-spin mr-2" /> Loading...
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {files.map((file) => (
                                    <div
                                        key={file.path}
                                        onClick={() => {
                                            if (file.isDirectory) {
                                                setSelectedPath(file.path);
                                            }
                                        }}
                                        onDoubleClick={() => {
                                            if (file.isDirectory) {
                                                handleNavigate(file.path);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors text-sm",
                                            selectedPath === file.path ? "bg-purple-500/20 text-purple-200" : "hover:bg-white/5 text-gray-300"
                                        )}
                                    >
                                        {file.isDirectory ? (
                                            <Folder size={16} className="text-blue-400 shrink-0" />
                                        ) : (
                                            <File size={16} className="text-gray-500 shrink-0" />
                                        )}
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                ))}
                                {files.length === 0 && (
                                    <div className="text-center text-gray-500 py-8 text-sm">
                                        Empty directory
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                    <Button
                        onClick={() => selectedPath && onSelect(selectedPath)}
                        disabled={!selectedPath}
                        className="bg-white text-black hover:bg-gray-200"
                    >
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
