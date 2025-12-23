import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Zap, Download, ArrowRight, Play, Check, Code2, Apple, Monitor, Command } from "lucide-react";
import { useLocation } from "wouter";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Hero() {
    const [_, setLocation] = useLocation();
    const [codeStep, setCodeStep] = useState(0);

    // Simulated code typing animation steps
    const codeLines = [
        { type: 'comment', text: '// AI: Implement a secure login flow' },
        { type: 'code', text: 'function handleLogin(email, password) {' },
        { type: 'code', text: '  const user = await db.users.find({ email });' },
        { type: 'code', text: '  if (!user || !verify(password, user.hash))' },
        { type: 'code', text: '    throw new Error("Invalid Credentials");' },
        { type: 'code', text: '  return generateToken(user.id);' },
        { type: 'code', text: '}' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCodeStep(prev => (prev < codeLines.length ? prev + 1 : 0));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-600/10 blur-[100px] rounded-full animate-pulse" />
                <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-8 max-w-4xl mx-auto"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 backdrop-blur-sm hover:bg-white/10 transition-colors cursor-pointer">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        Mimiverse v1.0 Alpha is safe to use
                        <ArrowRight className="w-3 h-3 ml-1" />
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
                        Code at the Speed of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
                            Thought
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-400 leading-relaxed font-light">
                        An AI-first IDE that doesn't just autocomplete—it architectures.
                        Local LLMs, Rust-powered speed, and context-aware reasoning built in.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="lg"
                                    className="h-12 px-8 text-base bg-white text-black hover:bg-zinc-200 border-0 shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)] transition-transform hover:scale-105"
                                >
                                    <Download className="mr-2 h-5 w-5" />
                                    Download Beta
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1E1E24] border-[#333] text-white min-w-[200px]">
                                <DropdownMenuLabel>Select Platform</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#333]" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.open('https://github.com/mimiverse/ide/releases/latest/download/Mimiverse-x64.dmg', '_blank')}>
                                    <Apple className="mr-2 h-4 w-4" /> macOS (Intel)
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.open('https://github.com/mimiverse/ide/releases/latest/download/Mimiverse-arm64.dmg', '_blank')}>
                                    <Cpu className="mr-2 h-4 w-4" /> macOS (Silicon)
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-[#333]" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.open('https://github.com/mimiverse/ide/releases/latest/download/Mimiverse-Setup.exe', '_blank')}>
                                    <Monitor className="mr-2 h-4 w-4" /> Windows
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-[#333]" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.location.href = '/download/Mimiverse-linux-arm64-1.0.0.zip'}>
                                    <Terminal className="mr-2 h-4 w-4" /> Linux (Direct)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-12 px-8 text-base border-zinc-700 bg-transparent text-white hover:bg-white/5 hover:border-zinc-600 transition-all"
                            onClick={() => setLocation("/auth")}
                        >
                            Open Web Editor
                            <Terminal className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    <div className="pt-12 text-sm text-zinc-500 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" /> Free for individuals
                        </span>
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" /> Runs offline
                        </span>
                        <span className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" /> Privacy-first
                        </span>
                    </div>
                </motion.div>

                {/* Floating Preview Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-[#0F0F16] group"
                >
                    {/* Glass Overlay Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-20 pointer-events-none opacity-50" />

                    {/* Mockup Window Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1a1a20]/80 backdrop-blur-md">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[rgb(255,95,87)]" />
                            <div className="w-3 h-3 rounded-full bg-[rgb(254,188,46)]" />
                            <div className="w-3 h-3 rounded-full bg-[rgb(40,200,64)]" />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/20 border border-white/5 text-xs text-zinc-500 font-mono">
                            <Cpu className="w-3 h-3" />
                            cascade.rs
                        </div>
                        <div className="w-12" /> {/* Spacer */}
                    </div>

                    {/* Code Area */}
                    <div className="aspect-[16/9] relative bg-[#0F0F16] p-8 grid grid-cols-12 gap-8 text-left font-mono text-sm leading-relaxed">
                        {/* Sidebar */}
                        <div className="col-span-2 hidden md:block space-y-3 opacity-50 border-r border-white/5 pr-4">
                            <div className="text-zinc-500 text-xs mb-4 uppercase tracking-wider font-semibold">Explorer</div>
                            <div className="flex items-center gap-2 text-zinc-300 bg-white/5 p-1 rounded"><Code2 className="w-3 h-3 text-blue-400" /> src</div>
                            <div className="pl-4 space-y-2 text-zinc-500">
                                <div className="hover:text-zinc-300 transition-colors cursor-pointer">main.rs</div>
                                <div className="text-purple-400 font-medium">cascade.rs</div>
                                <div className="hover:text-zinc-300 transition-colors cursor-pointer">utils.rs</div>
                            </div>
                        </div>

                        {/* Editor */}
                        <div className="col-span-12 md:col-span-6 space-y-1">
                            {codeLines.map((line, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: i <= codeStep ? 1 : 0, x: 0 }}
                                    className={line.type === 'comment' ? 'text-zinc-500' : 'text-zinc-300'}
                                >
                                    <span className="text-zinc-700 select-none mr-4">{i + 1}</span>
                                    {line.type === 'code' ? (
                                        <span>{line.text}</span>
                                    ) : line.text}
                                </motion.div>
                            ))}
                            {codeStep < codeLines.length && (
                                <motion.div
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="w-2 h-5 bg-purple-500 inline-block align-middle ml-1"
                                />
                            )}
                        </div>

                        {/* AI Panel */}
                        <div className="col-span-12 md:col-span-4 mt-4 md:mt-0">
                            <div className="h-full rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 backdrop-blur-sm flex flex-col">
                                <div className="flex items-center gap-2 font-mono text-xs text-purple-300 mb-4 pb-2 border-b border-purple-500/10">
                                    <Zap className="w-3 h-3" />
                                    Cascade AI Reasoning
                                </div>
                                <div className="space-y-3 flex-1 overflow-hidden">
                                    <div className="text-zinc-400 text-xs">Analysis:</div>
                                    <div className="space-y-2">
                                        <div className="h-1.5 w-3/4 bg-purple-400/20 rounded animate-pulse" />
                                        <div className="h-1.5 w-1/2 bg-purple-400/20 rounded animate-pulse delay-75" />
                                        <div className="h-1.5 w-full bg-purple-400/20 rounded animate-pulse delay-150" />
                                        <div className="h-1.5 w-2/3 bg-purple-400/20 rounded animate-pulse delay-200" />
                                    </div>
                                    <div className="text-green-400/80 text-xs mt-4">Suggested Action:</div>
                                    <div className="p-2 bg-black/40 rounded border border-green-500/20 text-green-300 text-xs font-mono">
                                        &gt; Scaffold Auth Middleware
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
