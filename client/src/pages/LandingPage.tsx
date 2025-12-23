import React from 'react';
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
    return (
        <div className="h-screen overflow-y-auto bg-[#0a0a0f] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
            <Navbar />
            <Hero />
            <Features />
            <Pricing />
            <Footer />
        </div>
    );
}
