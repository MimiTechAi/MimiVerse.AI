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
        { type: 'comment', text: '// Mimi: Optimized project architecture' },
        { type: 'code', text: 'async function bootstrapApp() {' },
        { type: 'code', text: '  const engine = await MimiEngine.init();' },
        { type: 'code', text: '  await engine.indexWorkspace("./src");' },
        { type: 'code', text: '  return engine.startReasoning();' },
        { type: 'code', text: '}' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCodeStep(prev => (prev < codeLines.length ? prev + 1 : 0));
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            {/* Background Orbs (SOTA 2025 Style) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        x: [0, -40, 0],
                        y: [0, 60, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 blur-[130px] rounded-full"
                />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-8 max-w-4xl mx-auto"
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        Mimiverse v1.0 Alpha (SOTA 2025)
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </motion.div>

                    {/* Headline */}
                    <div className="space-y-4">
                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.9] text-white">
                            Beyond <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-blue-400 animate-gradient pb-2">
                                Reasoning.
                            </span>
                        </h1>
                    </div>

                    <p className="max-w-2xl mx-auto text-xl md:text-2xl text-zinc-400 leading-relaxed font-light">
                        Mimiverse is the ultimate AI Architect. Powered by the <span className="text-white font-medium">Mimi Engine</span>, it handles deep project-wide refactors with native Rust speed.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="lg"
                                    className="h-14 px-10 text-lg bg-white text-black hover:bg-zinc-200 border-0 shadow-[0_0_50px_-10px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95"
                                >
                                    <Download className="mr-2 h-5 w-5" />
                                    Get Mimi Engine
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#111118]/90 border-white/10 text-white min-w-[240px] backdrop-blur-xl">
                                <DropdownMenuLabel className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Select OS</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer py-3" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse.dmg'}>
                                    <Apple className="mr-3 h-5 w-5" /> macOS <span className="ml-auto text-[10px] opacity-50">Silicon / Intel</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer py-3" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse-1.0.0.Setup.exe'}>
                                    <Monitor className="mr-3 h-5 w-5" /> Windows <span className="ml-auto text-[10px] opacity-50">.exe</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-white/5" />

                                <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer py-3" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/mimiverse_1.0.0_amd64.deb'}>
                                    <Terminal className="mr-3 h-5 w-5" /> Linux <span className="ml-auto text-[10px] opacity-50">.deb</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 px-10 text-lg border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all font-medium"
                            onClick={() => setLocation("/dashboard")}
                        >
                            <Zap className="mr-2 h-5 w-5 text-purple-400" />
                            User Dashboard
                        </Button>
                    </div>

                    {/* Trust Badges */}
                    <div className="pt-12 text-[11px] text-zinc-500 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 uppercase tracking-[0.2em] font-bold">
                        <span className="flex items-center gap-2 group cursor-help">
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-500 transition-colors" /> End-to-End Privacy
                        </span>
                        <span className="flex items-center gap-2 group cursor-help">
                            <Zap className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-500 transition-colors" /> Native Rust Core
                        </span>
                        <span className="flex items-center gap-2 group cursor-help">
                            <Bot className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-500 transition-colors" /> Local Context
                        </span>
                    </div>
                </motion.div>

                {/* Main Mockup (Integrated Dashboard/Engine View) */}
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="mt-24 relative mx-auto max-w-6xl"
                >
                    {/* Glow effect behind mockup */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />

                    <div className="relative rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-[#0F0F16] group">
                        {/* Windows Buttons */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1a1a20]/40 backdrop-blur-md">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/20" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/20" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/20" />
                            </div>
                            <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[10px] text-zinc-400 font-mono tracking-wider">
                                <Command className="w-3 h-3" />
                                mimi_engine --v1.2.0 --stable
                            </div>
                            <div className="w-12" />
                        </div>

                        {/* Content Split */}
                        <div className="aspect-[21/9] flex bg-[#0a0a0f]">
                            {/* Sidebar Sim */}
                            <div className="w-1/4 border-r border-white/5 p-6 space-y-6 hidden md:block">
                                <div className="space-y-1">
                                    <div className="h-2 w-12 bg-zinc-800 rounded mb-4" />
                                    <div className="h-2 w-full bg-white/5 rounded" />
                                    <div className="h-2 w-3/4 bg-white/5 rounded" />
                                    <div className="h-2 w-5/6 bg-white/5 rounded" />
                                </div>
                                <div className="space-y-1 pt-4">
                                    <div className="h-2 w-8 bg-purple-500/20 rounded mb-4" />
                                    <div className="h-2 w-full bg-white/5 rounded" />
                                    <div className="h-2 w-1/2 bg-white/5 rounded" />
                                </div>
                            </div>

                            {/* Editor Sim */}
                            <div className="flex-1 p-8 text-left font-mono text-sm">
                                <div className="space-y-2">
                                    {codeLines.map((line, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: i <= codeStep ? 1 : 0, x: 0 }}
                                            className={line.type === 'comment' ? 'text-zinc-600' : 'text-zinc-400'}
                                        >
                                            <span className="text-zinc-800 mr-6 text-xs">{i + 1}</span>
                                            {line.text}
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
                            </div>

                            {/* Reasoning Sim */}
                            <div className="w-1/3 border-l border-white/5 p-6 bg-purple-500/[0.02]">
                                <div className="flex items-center gap-2 mb-6">
                                    <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Mimi Reasoning</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                                        <div className="h-1.5 w-full bg-purple-300/10 rounded overflow-hidden">
                                            <motion.div
                                                animate={{ x: [-100, 300] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="h-full w-1/3 bg-purple-400/40"
                                            />
                                        </div>
                                        <div className="h-1.5 w-2/3 bg-purple-300/10 rounded" />
                                        <div className="h-1.5 w-5/6 bg-purple-300/10 rounded" />
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono italic">
                                        &quot;Architecture analyzed. Dependency graph updated with 412 nodes.&quot;
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

import { ShieldCheck, Bot } from 'lucide-react';
