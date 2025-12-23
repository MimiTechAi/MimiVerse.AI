import React from 'react';
import { Button } from "@/components/ui/button";
import { Code2, Github, Twitter, Apple, Monitor, Terminal, Cpu } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
    transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
    const [_, setLocation] = useLocation();

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
            transparent
                ? "bg-transparent border-transparent"
                : "bg-[#0a0a0f]/80 backdrop-blur-md border-white/5"
        )}>
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setLocation("/")}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Code2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Mimiverse
                    </span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                    <a href="/features" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); setLocation("/features"); }}>Features</a>
                    <a href="/pricing" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); setLocation("/pricing"); }}>Pricing</a>
                    <a href="/docs" className="hover:text-white transition-colors" onClick={(e) => { e.preventDefault(); setLocation("/docs"); }}>Docs</a>
                    <a href="https://github.com/MimiTechAi/MimiVerse.AI" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                        <Github className="w-4 h-4" />
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-white hidden sm:flex"
                        onClick={() => setLocation("/auth")}
                    >
                        Sign In
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-white text-black hover:bg-zinc-200 font-medium">
                                Download Alpha
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1E1E24] border-[#333] text-white min-w-[200px]" align="end">
                            <DropdownMenuLabel>Select Platform</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#333]" />
                            <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse.dmg'}>
                                <Apple className="mr-2 h-4 w-4" /> macOS (Apple Silicon & Intel)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#333]" />
                            <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/Mimiverse-1.0.0.Setup.exe'}>
                                <Monitor className="mr-2 h-4 w-4" /> Windows
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#333]" />
                            <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => window.location.href = 'https://github.com/MimiTechAi/MimiVerse.AI/releases/latest/download/mimiverse_1.0.0_amd64.deb'}>
                                <Terminal className="mr-2 h-4 w-4" /> Linux (.deb)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    );
}
