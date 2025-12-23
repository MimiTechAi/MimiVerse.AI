import React from 'react';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function Pricing() {
    return (
        <section id="pricing" className="py-24 bg-[#0a0a0f] border-t border-white/5 relative">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">
                    Simple, transparent pricing
                </h2>
                <p className="text-zinc-400 text-lg mb-16 max-w-2xl mx-auto">
                    Mimiverse is free during the Public Alpha. Pro features will be available for teams later this year.
                </p>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Individual Plan */}
                    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-8 flex flex-col items-start text-left relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <div className="text-6xl font-black text-white/5 select-none -translate-y-4 translate-x-4">FREE</div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Individual</h3>
                        <div className="text-4xl font-bold text-white mb-6">$0 <span className="text-lg font-normal text-zinc-500">/ forever</span></div>
                        <p className="text-zinc-400 mb-8">Perfect for hobbyists and solo developers building the future.</p>

                        <ul className="space-y-4 mb-8 flex-1">
                            {['Unlimited Local Projects', 'Llama 3 8B Included', 'Basic RAG Context', 'Community Support'].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-zinc-300">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Button className="w-full bg-white text-black hover:bg-zinc-200">
                            Download Alpha
                        </Button>
                    </div>

                    {/* Team Plan */}
                    <div className="rounded-2xl border border-white/10 bg-[#12121a] p-8 flex flex-col items-start text-left relative overflow-hidden opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-white/10 rounded uppercase tracking-wider text-zinc-400">
                            Coming Soon
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Team</h3>
                        <div className="text-4xl font-bold text-white mb-6">$20 <span className="text-lg font-normal text-zinc-500">/ member</span></div>
                        <p className="text-zinc-400 mb-8">For startups and scale-ups needing shared context and compute.</p>

                        <ul className="space-y-4 mb-8 flex-1">
                            {['Shared Knowledge Base', 'Cloud H100 GPU Access', 'Advanced RAG (1M+ Tokens)', 'Priority Support'].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-zinc-300">
                                    <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <Button variant="outline" className="w-full border-zinc-700 hover:bg-white/5 hover:text-white" disabled>
                            Join Waitlist
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
