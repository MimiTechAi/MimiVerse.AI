import React from 'react';
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-black py-16 border-t border-white/10 text-sm">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="col-span-2">
                    <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 mb-4">
                        Mimiverse
                    </div>
                    <p className="text-zinc-500 max-w-xs mb-8">
                        The intelligent IDE for the AI era. Built to amplify human creativity, not replace it.
                    </p>
                    <div className="flex gap-4 text-zinc-500">
                        <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                        <a href="#" className="hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
                        <a href="#" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-white">Product</h4>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Download</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Changelog</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Docs</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Pricing</a>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="font-bold text-white">Company</h4>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">About</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Careers</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Blog</a>
                    <a href="#" className="text-zinc-500 hover:text-white transition-colors">Contact</a>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 text-zinc-600 flex justify-between">
                <p>© 2025 Mimi Tech AI Inc.</p>
                <div className="flex gap-6">
                    <a href="#" className="hover:text-zinc-400">Privacy Policy</a>
                    <a href="#" className="hover:text-zinc-400">Terms of Service</a>
                </div>
            </div>
        </footer>
    );
}
