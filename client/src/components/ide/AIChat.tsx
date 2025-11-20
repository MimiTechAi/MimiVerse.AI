import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Paperclip, Mic } from "lucide-react";
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
}

export function AIChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your DeepMind-powered coding assistant. How can I help you optimize your code today?",
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
        content: "I can certainly help with that. Based on the current context, I recommend refactoring the component to use useMemo for expensive calculations. Here's an example...",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--sidebar-foreground))]">
          <Sparkles size={14} className="text-purple-400" />
          <span>AI Assistant</span>
        </div>
        <div className="flex gap-1">
           <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn(
                "flex gap-3 text-sm",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                {msg.role === 'assistant' ? (
                  <div className="bg-purple-600 h-full w-full flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                ) : (
                  <AvatarImage src="https://github.com/shadcn.png" />
                )}
                <AvatarFallback>{msg.role === 'assistant' ? 'AI' : 'ME'}</AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "p-3 rounded-lg max-w-[85%]",
                msg.role === 'user' 
                  ? "bg-[hsl(var(--primary))] text-white" 
                  : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--sidebar-border))]"
              )}>
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
               <div className="bg-purple-600 h-8 w-8 rounded-full flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
               </div>
               <div className="bg-[hsl(var(--card))] p-3 rounded-lg border border-[hsl(var(--sidebar-border))] flex items-center gap-1 h-10">
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="pr-20 bg-[hsl(var(--input))] border-none focus-visible:ring-1 focus-visible:ring-purple-500/50"
          />
          <div className="absolute right-1 top-1 flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-white">
                <Paperclip size={14} />
             </Button>
             <Button 
              size="icon" 
              className="h-7 w-7 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSend}
            >
              <Send size={12} />
            </Button>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
           <div className="flex gap-2">
             <span className="flex items-center gap-1"><Sparkles size={8} /> DeepMind Gemini Pro</span>
           </div>
           <span>Enter to send</span>
        </div>
      </div>
    </div>
  );
}
