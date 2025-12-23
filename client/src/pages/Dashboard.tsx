import React from 'react';
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Apple, Monitor, Terminal, Cpu, Zap, Download, ExternalLink, ShieldCheck, Activity, BookOpen, Github } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
    const { user, logout } = useAuth();

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-12"
                >
                    {/* Header Section */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                                Welcome back, {user?.username}
                            </h1>
                            <p className="text-zinc-400 mt-2">Manage your account and Mimi Engine installations.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" className="border-white/10 hover:bg-white/5" onClick={logout}>
                                Sign Out
                            </Button>
                        </div>
                    </header>

                    {/* Stats & Engine Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-[#111118]/50 border-white/5 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-400">Engine Tier</p>
                                        <h3 className="text-xl font-bold text-white">Mimi Pro (SOTA)</h3>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#111118]/50 border-white/5 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-400">System Status</p>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-wider text-[12px]">Operational</h3>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#111118]/50 border-white/5 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-400">Account Security</p>
                                        <h3 className="text-xl font-bold text-white">Verified</h3>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Download Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <Download className="w-6 h-6 text-purple-400" />
                                Download Desktop IDE
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button
                                    className="h-24 bg-white text-black hover:bg-zinc-200 flex flex-col items-center justify-center gap-2 group"
                                    onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse.dmg'}
                                >
                                    <Apple className="w-6 h-6 transition-transform group-hover:scale-110" />
                                    <div className="text-center">
                                        <div className="font-bold">macOS</div>
                                        <div className="text-[10px] opacity-70">Intel & Apple Silicon</div>
                                    </div>
                                </Button>
                                <Button
                                    className="h-24 bg-[#111118] border border-white/10 text-white hover:bg-white/5 flex flex-col items-center justify-center gap-2 group"
                                    onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse-1.0.0.Setup.exe'}
                                >
                                    <Monitor className="w-6 h-6 transition-transform group-hover:scale-110" />
                                    <div className="text-center">
                                        <div className="font-bold">Windows</div>
                                        <div className="text-[10px] opacity-70">Portable & Installer</div>
                                    </div>
                                </Button>
                                <Button
                                    className="h-24 bg-[#111118] border border-white/10 text-white hover:bg-white/5 flex flex-col items-center justify-center gap-2 group"
                                    onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/mimiverse_1.0.0_amd64.deb'}
                                >
                                    <Terminal className="w-6 h-6 transition-transform group-hover:scale-110" />
                                    <div className="text-center">
                                        <div className="font-bold">Linux</div>
                                        <div className="text-[10px] opacity-70">.deb (AMD64)</div>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-24 border-dashed border-white/10 bg-transparent text-zinc-500 hover:text-white hover:border-white/30 flex flex-col items-center justify-center gap-2"
                                    disabled
                                >
                                    <Cpu className="w-6 h-6" />
                                    <div className="text-center">
                                        <div className="font-bold">Mimi Mobile</div>
                                        <div className="text-[10px]">Coming 2026</div>
                                    </div>
                                </Button>
                            </div>

                            {/* Release Notes placeholder */}
                            <Card className="bg-[#111118]/30 border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-lg">Recent Updates</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-4 pb-4 border-b border-white/5">
                                        <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono">v1.1.0</span>
                                        <div>
                                            <p className="text-sm font-medium">Mimi Engine Rebranding</p>
                                            <p className="text-xs text-zinc-500">Official transition to Mimi Engine with enhanced reasoning capabilities.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono">v1.0.5</span>
                                        <div>
                                            <p className="text-sm font-medium">Desktop Signing & Notarization</p>
                                            <p className="text-xs text-zinc-500">Seamless installation on macOS and Windows with full security certificates.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar / Resources */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Resources</h2>
                            <div className="space-y-3">
                                <a href="/docs" className="flex items-center justify-between p-4 rounded-xl bg-[#111118]/50 border border-white/5 hover:border-purple-500/30 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="w-5 h-5 text-zinc-400 group-hover:text-purple-400" />
                                        <span className="text-sm">Documentation</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-zinc-600" />
                                </a>
                                <a href="https://github.com/MimiTechAi/MimiVerse.AI" className="flex items-center justify-between p-4 rounded-xl bg-[#111118]/50 border border-white/5 hover:border-purple-500/30 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <Github className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                                        <span className="text-sm">GitHub Repository</span>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-zinc-600" />
                                </a>
                            </div>

                            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-white/5">
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                            <Cpu className="w-8 h-8 text-purple-400" />
                                        </div>
                                        <h3 className="font-bold">Next-Gen Architecture</h3>
                                        <p className="text-xs text-zinc-400">
                                            Mimi Engine is designed for high-performance cross-file reasoning. Download the desktop app for the full experience.
                                        </p>
                                        <Button className="w-full bg-white text-black hover:bg-zinc-200">
                                            Read the Whitepaper
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    )
}
