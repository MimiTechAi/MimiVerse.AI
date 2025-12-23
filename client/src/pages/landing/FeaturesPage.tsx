import React from 'react';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Features } from "@/components/landing/Features";

export default function FeaturesPage() {
    return (
        <div className="h-screen overflow-y-auto bg-[#0a0a0f] text-white">
            <Navbar />
            <div className="pt-32">
                <Features />
                <div className="max-w-4xl mx-auto px-6 py-20 text-zinc-400">
                    <h3 className="text-2xl font-bold text-white mb-4">Deep Integration</h3>
                    <p>More details about technical architecture coming soon...</p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
