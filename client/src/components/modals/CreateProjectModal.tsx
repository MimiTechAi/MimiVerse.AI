import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Terminal, Rocket, Code2 } from "lucide-react";
import { motion } from "framer-motion";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithAI: (name: string, prompt: string) => void;
  onCreateEmpty: (name: string) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreateWithAI, onCreateEmpty }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"ai" | "empty">("ai");

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    if (mode === "ai") {
      onCreateWithAI(name, prompt);
    } else {
      onCreateEmpty(name);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#1E1E24] border-white/10 text-white p-0 overflow-hidden gap-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        <DialogHeader className="p-6 pb-2 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Rocket className="text-white" size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Create New Project</DialogTitle>
              <DialogDescription className="text-gray-400">
                Initialize a new workspace with AI assistance or start from scratch.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6 relative z-10">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => setMode("ai")}
              className={`cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group ${
                mode === "ai" 
                  ? "bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/20" 
                  : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
              }`}
            >
              {mode === "ai" && (
                <motion.div layoutId="active-mode" className="absolute inset-0 bg-purple-500/5" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={18} className={mode === "ai" ? "text-purple-400" : "text-gray-400"} />
                <span className={`font-medium ${mode === "ai" ? "text-white" : "text-gray-300"}`}>AI Architect</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Describe your idea and let MIMI plan, scaffold, and build the entire project structure for you.
              </p>
            </div>

            <div 
              onClick={() => setMode("empty")}
              className={`cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group ${
                mode === "empty" 
                  ? "bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/20" 
                  : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
              }`}
            >
              {mode === "empty" && (
                <motion.div layoutId="active-mode" className="absolute inset-0 bg-blue-500/5" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <Code2 size={18} className={mode === "empty" ? "text-blue-400" : "text-gray-400"} />
                <span className={`font-medium ${mode === "empty" ? "text-white" : "text-gray-300"}`}>Empty Project</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Start with a clean slate. Best for when you want to set up the structure manually.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Project Name</label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-awesome-app"
                className="bg-[#27272A] border-white/10 focus-visible:ring-purple-500/50 h-11"
              />
            </div>

            {mode === "ai" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">What should we build?</label>
                <Textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A modern landing page for a coffee shop with a menu section and contact form..."
                  className="bg-[#27272A] border-white/10 focus-visible:ring-purple-500/50 min-h-[100px] resize-none"
                />
              </motion.div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-[#1E1E24] relative z-10">
          <Button variant="ghost" onClick={onClose} className="hover:bg-white/5 text-gray-400 hover:text-white">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!name.trim() || (mode === "ai" && !prompt.trim())}
            className={`
              ${mode === "ai" 
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-purple-500/20" 
                : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"}
              text-white font-medium px-8 transition-all
            `}
          >
            {mode === "ai" ? (
              <>
                <Sparkles size={16} className="mr-2" />
                Generate Project
              </>
            ) : (
              <>
                <Terminal size={16} className="mr-2" />
                Create Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
