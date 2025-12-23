import React from 'react';
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";

export default function PricingPage() {
    return (
        <div className="h-screen overflow-y-auto bg-[#0a0a0f] text-white">
            <Navbar />
            <div className="pt-32">
                <Pricing />
                <div className="max-w-4xl mx-auto px-6 py-20 text-center text-zinc-500 text-sm">
                    * Prices are subject to change. Alpha version is completely free.
                </div>
            </div>
            <Footer />
        </div>
    );
}
