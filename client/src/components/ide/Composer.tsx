import { useState, useEffect } from "react";
import { Send, Sparkles, FileCode, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ComposerProps {
    onSendToMimi?: (prompt: string) => void;
}

export function Composer({ onSendToMimi }: ComposerProps) {
    const [instruction, setInstruction] = useState("");
    const [contextFiles, setContextFiles] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAddingFile, setIsAddingFile] = useState(false);
    const [newContextFile, setNewContextFile] = useState("");

    useEffect(() => {
        try {
            const stored = localStorage.getItem("mimiverse_composer_instruction");
            if (stored) {
                setInstruction(stored);
                localStorage.removeItem("mimiverse_composer_instruction");
            }
        } catch (error) {
            console.error("Failed to restore Composer instruction:", error);
        }
    }, []);

    const handleAddFile = () => {
        // In a real implementation, this would open a file picker
        setIsAddingFile(true);
    };

    const removeFile = (file: string) => {
        setContextFiles(contextFiles.filter(f => f !== file));
    };

    const handleGenerate = async () => {
        if (!instruction.trim()) return;
        setIsGenerating(true);

        // TODO: Implement actual multi-file generation API
        try {
            const trimmed = instruction.trim();
            const lines: string[] = [];

            lines.push("You are the Multi-file Composer agent for Mimiverse.");
            if (contextFiles.length > 0) {
                lines.push("");
                lines.push("The following files should be treated as primary context:");
                for (const file of contextFiles) {
                    lines.push(`- ${file}`);
                }
            }

            lines.push("");
            lines.push("Task:");
            lines.push(trimmed);

            onSendToMimi?.(lines.join("\n"));
            toast.success("Sent Composer instructions to MIMI. The AI panel will open with this request.");
        } catch (error) {
            console.error("Composer send failed:", error);
            toast.error("Failed to send instructions to MIMI");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
            <div className="p-4 border-b border-white/5 bg-[#1E1E24]">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-bold text-white tracking-wide">COMPOSER</h2>
                </div>
                <p className="text-xs text-gray-400">Multi-file generation & refactoring</p>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {/* Context Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-bold tracking-wider">
                        <span>Context</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-white" onClick={handleAddFile}>
                            <Plus size={12} />
                        </Button>
                    </div>

                    {isAddingFile && (
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                value={newContextFile}
                                onChange={(e) => setNewContextFile(e.target.value)}
                                placeholder="src/components/Example.tsx"
                                className="h-8 bg-[#27272A] border-white/10 text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const file = newContextFile.trim();
                                        if (file && !contextFiles.includes(file)) {
                                            setContextFiles([...contextFiles, file]);
                                        }
                                        setNewContextFile("");
                                        setIsAddingFile(false);
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setIsAddingFile(false);
                                        setNewContextFile("");
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                disabled={!newContextFile.trim()}
                                onClick={() => {
                                    const file = newContextFile.trim();
                                    if (file && !contextFiles.includes(file)) {
                                        setContextFiles([...contextFiles, file]);
                                    }
                                    setNewContextFile("");
                                    setIsAddingFile(false);
                                }}
                            >
                                Add
                            </Button>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {contextFiles.length === 0 && (
                            <div className="text-xs text-gray-600 italic px-2">No files selected</div>
                        )}
                        {contextFiles.map(file => (
                            <div key={file} className="flex items-center gap-1 bg-[#27272A] border border-white/10 px-2 py-1 rounded text-xs text-gray-300">
                                <FileCode size={10} className="text-blue-400" />
                                <span>{file}</span>
                                <X
                                    size={10}
                                    className="cursor-pointer hover:text-red-400 transition-colors ml-1"
                                    onClick={() => removeFile(file)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Instructions</span>
                    <Textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="Describe the feature or refactor you want to implement across multiple files..."
                        className="flex-1 bg-[#27272A] border-white/10 resize-none focus-visible:ring-purple-500/50 text-sm p-3 leading-relaxed"
                    />
                </div>

                {/* Action Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !instruction.trim()}
                    className={cn(
                        "w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-6 shadow-lg shadow-purple-900/20 transition-all",
                        isGenerating && "opacity-80 cursor-wait"
                    )}
                >
                    {isGenerating ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating Plan...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} />
                            <span>Generate Changes</span>
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}
