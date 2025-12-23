import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Sparkles, Terminal, Code2, Cpu, Loader2, AlertCircle, GitBranch } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { FileExplorer } from "./FileExplorer";

interface OnboardingProps {
    onOpenProject: (path: string) => Promise<void>;
}

export default function Onboarding({ onOpenProject }: OnboardingProps) {
    const [path, setPath] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentProjects, setRecentProjects] = useState<string[]>([]);
    const [showExplorer, setShowExplorer] = useState(false);
    const [gitUrl, setGitUrl] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [gitError, setGitError] = useState<string | null>(null);

    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem("mimiverse_recent") || "[]");
        setRecentProjects(recent);
    }, []);

    const handleOpen = async (pathToOpen: string = path) => {
        if (!pathToOpen.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await onOpenProject(pathToOpen);
        } catch (e) {
            setError("Failed to open workspace. Please check the path and permissions.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClone = async () => {
        if (!gitUrl.trim()) return;

        setIsCloning(true);
        setGitError(null);

        try {
            const res = await fetch('/api/v1/projects/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: gitUrl.trim() })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.path) {
                const message = data?.message || 'Failed to clone repository.';
                setGitError(message);
                return;
            }

            await onOpenProject(data.path);
        } catch (e) {
            setGitError('Failed to clone repository. Please check the URL and try again.');
        } finally {
            setIsCloning(false);
        }
    };

    const handleExplorerSelect = (selectedPath: string) => {
        setPath(selectedPath);
        setShowExplorer(false);
        handleOpen(selectedPath);
    };

    return (
        <div className="min-h-screen bg-[#1E1E24] flex items-center justify-center p-4 text-white font-sans">
            <FileExplorer
                open={showExplorer}
                onOpenChange={setShowExplorer}
                onSelect={handleExplorerSelect}
            />

            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                {/* Left Side: Branding */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-50 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-2xl">
                                <Cpu size={32} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Mimiverse.ai</h1>
                            <p className="text-purple-400 text-sm font-medium tracking-wide">COGNITIVE OS v3.0.1</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-gray-400">
                        <p className="text-lg leading-relaxed">
                            Stop searching. Start solving. <span className="text-white font-medium">MIMI</span> simulates the solution.
                        </p>
                        <p className="text-sm border-l-2 border-purple-500/30 pl-4 italic">
                            "I am ready to browse the web, architect complex systems, and write code in real-time."
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <div className="bg-[#27272A] p-3 rounded-lg border border-white/5 flex items-center gap-3">
                            <div className="bg-blue-500/20 p-2 rounded-md text-blue-400">
                                <Terminal size={18} />
                            </div>
                            <div className="text-xs">
                                <div className="font-medium text-white">Autonomous</div>
                                <div className="text-gray-500">Execution</div>
                            </div>
                        </div>
                        <div className="bg-[#27272A] p-3 rounded-lg border border-white/5 flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-md text-green-400">
                                <Code2 size={18} />
                            </div>
                            <div className="text-xs">
                                <div className="font-medium text-white">Cognitive</div>
                                <div className="text-gray-500">Graph</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Actions */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#27272A] border border-white/10 rounded-2xl p-8 shadow-2xl"
                >
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Initialize Session
                    </h2>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace Path</label>
                            <div className="flex gap-2">
                                <Input
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                    placeholder="/home/user/projects/my-app"
                                    className="bg-[#1E1E24] border-white/10 text-white h-11 focus-visible:ring-purple-500/50 font-mono text-sm flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
                                />
                                <Button
                                    variant="outline"
                                    className="h-11 border-white/10 hover:bg-white/5"
                                    onClick={() => setShowExplorer(true)}
                                >
                                    <FolderOpen size={16} />
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-md border border-red-500/20">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-white/10 mt-4">
                            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <GitBranch size={14} className="text-green-400" />
                                Clone from Git URL
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={gitUrl}
                                    onChange={(e) => setGitUrl(e.target.value)}
                                    placeholder="https://github.com/user/repo.git"
                                    className="bg-[#1E1E24] border-white/10 text-white h-11 focus-visible:ring-purple-500/50 font-mono text-sm flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleClone()}
                                />
                                <Button
                                    disabled={isCloning || !gitUrl.trim()}
                                    className="h-11 bg-white text-black hover:bg-gray-200"
                                    onClick={handleClone}
                                >
                                    {isCloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitBranch className="mr-2 h-4 w-4" />}
                                    {isCloning ? 'Cloning...' : 'Clone from Git'}
                                </Button>
                            </div>
                            {gitError && (
                                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded-md border border-red-500/20">
                                    <AlertCircle size={14} />
                                    {gitError}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                onClick={() => {
                                    console.log('[Onboarding] Open Folder clicked');
                                    setShowExplorer(true);
                                }}
                                disabled={isLoading}
                                className="h-12 bg-white text-black hover:bg-gray-200 font-medium"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                                Open Folder
                            </Button>
                            <Button
                                onClick={() => setShowExplorer(true)}
                                disabled={isLoading}
                                variant="outline"
                                className="h-12 border-white/10 hover:bg-white/5 text-white hover:text-white"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Create New
                            </Button>
                        </div>

                        {recentProjects.length > 0 && (
                            <div className="pt-6 border-t border-white/5">
                                <p className="text-xs text-gray-500 mb-2">Recent Projects:</p>
                                <div className="flex flex-wrap gap-2">
                                    {recentProjects.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => handleOpen(p)}
                                            className="text-xs text-purple-400 hover:text-purple-300 hover:underline bg-purple-500/10 px-2 py-1 rounded cursor-pointer transition-colors"
                                        >
                                            {p.split('/').pop()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
