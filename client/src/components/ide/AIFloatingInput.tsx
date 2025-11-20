import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X, Command } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AIFloatingInputProps {
  visible: boolean;
  onClose: () => void;
}

export function AIFloatingInput({ visible, onClose }: AIFloatingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute top-4 left-1/2 -translate-x-1/2 w-[600px] z-50"
        >
          <div className="relative bg-[#252526] rounded-xl shadow-2xl border border-purple-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />
            
            <div className="flex items-center p-1">
               <div className="h-10 w-10 flex items-center justify-center text-purple-400 shrink-0">
                 <Sparkles size={20} />
               </div>
               <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 h-10 text-sm font-medium"
                  placeholder="Generate code, fix bugs, or ask a question..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'Enter') {
                      // Handle AI action
                      onClose();
                    }
                  }}
               />
               <div className="flex items-center gap-2 pr-3">
                  {query && (
                    <div className="text-[10px] text-white/50 flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                      <span>Run</span> <ArrowRight size={10} />
                    </div>
                  )}
                  <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
               </div>
            </div>
            
            {query && (
               <motion.div 
                 initial={{ height: 0 }}
                 animate={{ height: 'auto' }}
                 className="border-t border-white/10 bg-black/20 px-4 py-2 text-xs text-white/50 flex justify-between"
               >
                 <span>Context: Current File</span>
                 <div className="flex gap-3">
                    <span><span className="text-white">@</span> Files</span>
                    <span><span className="text-white">/</span> Commands</span>
                 </div>
               </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
