import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitFork, FileText, Plus, Minus, Circle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GitStatus {
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
    branch: string;
}

interface GitCommitType {
    hash: string;
    author: string;
    email: string;
    date: string;
    message: string;
}

// Assuming GitFile interface is defined elsewhere or needs to be added
// For the purpose of this edit, I'll assume a basic GitFile structure
interface GitFile {
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'untracked';
}

interface GitPanelProps {
    onRefresh?: () => void;
}

export function GitPanel({ onRefresh }: GitPanelProps = {}) {
    const [status, setStatus] = useState<GitStatus | null>(null);
    const [commits, setCommits] = useState<GitCommitType[]>([]);
    const [loading, setLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    useEffect(() => {
        loadGitStatus();
        loadCommitHistory();
    }, []);

    async function loadGitStatus() {
        try {
            const res = await fetch('/api/git/status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to load git status:', error);
        }
    }

    async function loadCommitHistory() {
        try {
            const res = await fetch('/api/git/log?limit=10');
            if (res.ok) {
                const data = await res.json();
                setCommits(data.commits || []);
            }
        } catch (error) {
            console.error('Failed to load commits:', error);
        }
    }

    async function handleCommit(autoGenerate: boolean = false) {
        setLoading(true);
        try {
            // If auto-generate is requested, get the message first
            let message = commitMessage;
            if (autoGenerate) {
                const msgRes = await fetch('/api/git/generate-message', { method: 'POST' });
                if (msgRes.ok) {
                    const data = await msgRes.json();
                    message = data.message;
                    setCommitMessage(message);
                }
            }

            if (!message && !autoGenerate) {
                alert('Please enter a commit message');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/git/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('Committed:', data.message);
                setCommitMessage('');
                await loadGitStatus();
                await loadCommitHistory();
                onRefresh?.();  // Refresh file tree after commit
            } else {
                throw new Error('Commit failed');
            }
        } catch (error) {
            console.error('Commit failed:', error);
            alert('Failed to commit changes');
        } finally {
            setLoading(false);
        }
    }

    async function handleRefresh() {
        setLoading(true);
        await loadGitStatus();
        await loadCommitHistory();
        setLoading(false);
    }

    if (!status) {
        return (
            <div className="p-4 text-center text-gray-500">
                <p>Loading Git status...</p>
            </div>
        );
    }

    const totalChanges =
        status.modified.length +
        status.added.length +
        status.deleted.length +
        status.untracked.length;

    return (
        <div className="flex flex-col h-full bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
            {/* Header */}
            <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">
                        Git
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono truncate">
                        {status.branch}
                    </span>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="h-7 w-7 p-0 text-gray-300 hover:text-white hover:bg-white/5"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Changes Section */}
                    {totalChanges > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase">
                                    Changes ({totalChanges})
                                </h3>
                            </div>

                            {/* Modified Files */}
                            {status.modified.length > 0 && (
                                <FileList
                                    files={status.modified}
                                    icon={<Circle className="w-3 h-3 text-yellow-500" />}
                                    label="Modified"
                                    onFileClick={setSelectedFile}
                                />
                            )}

                            {/* Added Files */}
                            {status.added.length > 0 && (
                                <FileList
                                    files={status.added}
                                    icon={<Plus className="w-3 h-3 text-green-500" />}
                                    label="Staged"
                                    onFileClick={setSelectedFile}
                                />
                            )}

                            {/* Deleted Files */}
                            {status.deleted.length > 0 && (
                                <FileList
                                    files={status.deleted}
                                    icon={<Minus className="w-3 h-3 text-red-500" />}
                                    label="Deleted"
                                    onFileClick={setSelectedFile}
                                />
                            )}

                            {/* Untracked Files */}
                            {status.untracked.length > 0 && (
                                <FileList
                                    files={status.untracked}
                                    icon={<FileText className="w-3 h-3 text-gray-500" />}
                                    label="Untracked"
                                    onFileClick={setSelectedFile}
                                />
                            )}

                            {/* Commit Section */}
                            <div className="pt-2 space-y-2 border-t border-white/10">
                                <input
                                    type="text"
                                    placeholder="Commit message..."
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-white placeholder-gray-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && commitMessage.trim()) {
                                            handleCommit(false);
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleCommit(false)}
                                        disabled={!commitMessage.trim() || loading}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm"
                                        size="sm"
                                    >
                                        <GitCommit className="w-3 h-3 mr-1" />
                                        Commit
                                    </Button>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={() => handleCommit(true)}
                                                disabled={loading}
                                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm"
                                                size="sm"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>AI-generated commit message</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <GitFork className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No changes</p>
                        </div>
                    )}

                    {/* Commit History */}
                    {commits.length > 0 && (
                        <div className="pt-4 border-t border-white/10 space-y-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase">
                                Recent Commits
                            </h3>
                            {commits.map((commit) => (
                                <div
                                    key={commit.hash}
                                    className="p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <p className="text-sm text-white font-medium truncate">
                                        {commit.message}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-gray-400">
                                            {commit.author}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {commit.date}
                                        </span>
                                    </div>
                                    <code className="text-xs text-purple-400 font-mono">
                                        {commit.hash.substring(0, 7)}
                                    </code>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

interface FileListProps {
    files: string[];
    icon: React.ReactNode;
    label: string;
    onFileClick: (file: string) => void;
}

function FileList({ files, icon, label, onFileClick }: FileListProps) {
    return (
        <div className="space-y-1">
            <p className="text-xs text-gray-500">{label} ({files.length})</p>
            {files.map((file) => (
                <div
                    key={file}
                    onClick={() => onFileClick(file)}
                    className="flex items-center gap-2 px-2 py-1 text-sm text-gray-300 hover:bg-white/5 rounded cursor-pointer transition-colors group"
                >
                    {icon}
                    <span className="truncate group-hover:text-white">{file}</span>
                </div>
            ))}
        </div>
    );
}
