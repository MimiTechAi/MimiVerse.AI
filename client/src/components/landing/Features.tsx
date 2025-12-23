import React from 'react';
import { motion } from "framer-motion";
import { Terminal, Bot, Database, Zap, Code, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
    {
        title: "Mimi Engine",
        description: "An AI architect that sees your entire project. Mimi plans and executes multi-file refactors with precision.",
        icon: Bot,
        className: "md:col-span-2",
        gradient: "from-purple-500/20 to-blue-500/20"
    },
    {
        title: "Integrated Terminal",
        description: "Execute commands, run servers, and debug without leaving context.",
        icon: Terminal,
        className: "md:col-span-1",
        gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
        title: "RAG Knowledge Base",
        description: "Instant semantic search across docs, code, and history.",
        icon: Database,
        className: "md:col-span-1",
        gradient: "from-orange-500/20 to-red-500/20"
    },
    {
        title: "Local-First LLMs",
        description: "Run Llama 3 & Mistral locally. Zero data leaves your machine.",
        icon: Shield,
        className: "md:col-span-2",
        gradient: "from-blue-500/20 to-cyan-500/20"
    },
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-[#0a0a0f] relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Everything you need to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                            ship faster
                        </span>
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl">
                        Mimiverse isn't just an editor—it's a complete development environment integrated with an autonomous AI agent.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            className={cn(
                                "group relative rounded-2xl border border-white/10 bg-[#12121a] p-8 overflow-hidden transition-colors hover:border-white/20",
                                feature.className
                            )}
                        >
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                                feature.gradient
                            )} />

                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                                <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
