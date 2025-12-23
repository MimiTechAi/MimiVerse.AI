import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import FeaturesPage from "@/pages/landing/FeaturesPage";
import PricingPage from "@/pages/landing/PricingPage";
import IDEPage from "@/pages/IDE";
import Onboarding from "@/components/Onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import AuthPage from "@/pages/AuthPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  console.log('[ProtectedRoute] Check:', { user, isLoading });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, should not reach here!');
    return <AuthPage />;
  }

  console.log('[ProtectedRoute] User present, rendering children');
  return <>{children}</>;
}

import Dashboard from "@/pages/Dashboard";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/pricing" component={PricingPage} />

      {/* Protected Dashboard */}
      <Route path="/">
        {user ? <Dashboard /> : <LandingPage />}
      </Route>

      <Route path="/dashboard">
        {user ? <Dashboard /> : <AuthPage />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
