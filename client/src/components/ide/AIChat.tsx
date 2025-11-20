import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Paperclip, Mic, Cpu, Globe, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  artifacts?: {
    type: 'file' | 'search' | 'plan';
    title: string;
  }[];
}

export function AIChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Mimiverse Cognitive OS online. I am MIMI (Gemini 2.5). I can browse the web, plan architectures, and generate full file systems. What are we building today?",
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'll start a simulation for that. First, I'm researching the latest libraries...",
        timestamp: new Date(),
        artifacts: [
          { type: 'search', title: 'Searching: modern react patterns 2024' },
          { type: 'plan', title: 'Architecting Project Structure' },
          { type: 'file', title: 'src/components/GameLoop.tsx' }
        ]
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#1E1E24] shrink-0">
        <div className="flex items-center gap-3 text-sm font-bold tracking-wide text-white">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 blur-md opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg">
               <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col">
             <span>MIMI Agent</span>
             <span className="text-[10px] text-purple-400 font-normal">Gemini 2.5 Pro • Online</span>
          </div>
        </div>
        <div className="flex gap-1">
           <div className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 font-mono">IDLE</div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-6">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn(
                "flex gap-4 text-sm",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 border border-white/10 mt-1">
                {msg.role === 'assistant' ? (
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-600 h-full w-full flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                    <Cpu size={18} className="text-white" />
                  </div>
                ) : (
                  <AvatarImage src="https://github.com/shadcn.png" />
                )}
                <AvatarFallback>{msg.role === 'assistant' ? 'AI' : 'ME'}</AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col gap-2 max-w-[85%]">
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm",
                  msg.role === 'user' 
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm" 
                    : "bg-[#27272A] text-gray-100 border border-white/5 rounded-tl-sm"
                )}>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
                
                {msg.artifacts && (
                  <div className="flex flex-col gap-2 mt-1">
                    {msg.artifacts.map((artifact, i) => (
                       <motion.div 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.1 }}
                         key={i}
                         className="flex items-center gap-3 bg-[#27272A] border border-white/5 p-2 rounded-lg text-xs hover:border-purple-500/30 transition-colors cursor-pointer group"
                       >
                          {artifact.type === 'search' && <Globe size={14} className="text-blue-400" />}
                          {artifact.type === 'plan' && <Loader2 size={14} className="text-yellow-400 animate-spin" />}
                          {artifact.type === 'file' && <FileCode size={14} className="text-purple-400" />}
                          <span className="text-gray-400 group-hover:text-white transition-colors">{artifact.title}</span>
                       </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
               <div className="bg-gradient-to-br from-indigo-600 to-purple-600 h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(147,51,234,0.5)] mt-1">
                  <Cpu size={18} className="text-white" />
               </div>
               <div className="bg-[#27272A] p-4 rounded-2xl rounded-tl-sm border border-white/5 flex items-center gap-2 h-12">
                 <span className="text-xs text-gray-400 font-mono mr-2">THINKING</span>
                 <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/5 bg-[#1E1E24] relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div className="relative bg-[#27272A] rounded-xl border border-white/5 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Command MIMI to build..."
            className="pr-20 bg-transparent border-none focus-visible:ring-0 text-sm h-12 text-white placeholder:text-gray-500"
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
                <Paperclip size={16} />
             </Button>
             <Button 
              size="icon" 
              className="h-9 w-9 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg shadow-purple-600/20"
              onClick={handleSend}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
        <div className="flex justify-between mt-3 text-[10px] text-gray-500">
           <div className="flex gap-3">
             <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors cursor-pointer">
               <Globe size={10} /> Neural Search: ON
             </span>
             <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors cursor-pointer">
               <FileCode size={10} /> File Gen: ON
             </span>
           </div>
           <span className="font-mono">MIMI-OS v3.0.1</span>
        </div>
      </div>
    </div>
  );
}
