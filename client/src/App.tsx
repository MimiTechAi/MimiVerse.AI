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

function Router() {
  const { user, isLoading } = useAuth();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null); // Don't auto-load!

  // REMOVED: Auto-load from localStorage
  // This was a SECURITY ISSUE - new users would see mimiverse project folder!


  useEffect(() => {
    // Load user's active workspace from backend (not localStorage!)
    if (!user) return;

    fetch('/api/workspace/current')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.workspace) {
          setWorkspacePath(data.workspace);
        }
      })
      .catch(err => console.error('Failed to load workspace:', err));
  }, [user]);

  useEffect(() => {
    // Sync workspace to backend when changed
    if (workspacePath) {
      fetch('/api/workspace/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: workspacePath })
      }).catch(err => console.error("Failed to restore workspace:", err));
    }
  }, []);

  const handleOpenProject = async (path: string) => {
    try {
      const res = await fetch('/api/workspace/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      if (!res.ok) throw new Error("Failed to open workspace");

      setWorkspacePath(path);

      // Update recent projects
      const recent = JSON.parse(localStorage.getItem("mimiverse_recent") || "[]");
      if (!recent.includes(path)) {
        const newRecent = [path, ...recent].slice(0, 5);
        localStorage.setItem("mimiverse_recent", JSON.stringify(newRecent));
      }

      localStorage.setItem("mimiverse_workspace", path);
    } catch (error) {
      console.error("Failed to set workspace:", error);
      throw error;
    }
  };

  // Handle auth state at Router level
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Not logged in? Show Landing Page and subpages
  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/features" component={FeaturesPage} />
        <Route path="/pricing" component={PricingPage} />
        {/* Fallback to Landing for /docs or root */}
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // User is authenticated, check workspace
  if (!workspacePath) {
    return <Onboarding onOpenProject={handleOpenProject} />;
  }

  // User is authenticated with workspace
  return (
    <Switch>
      <Route path="/" component={IDEPage} />
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
