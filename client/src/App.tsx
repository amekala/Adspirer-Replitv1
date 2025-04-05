import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "@/components/ui/theme-provider";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import { OnboardingPage } from "@/pages/onboarding";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";
import AboutPage from "@/pages/about";
import PrivacyPage from "@/pages/privacy";
import { useAuth } from "@/hooks/use-auth";

function AuthRedirect() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Check for view=landing in URL to allow viewing landing page when logged in
  const params = new URLSearchParams(window.location.search);
  const viewLanding = params.get('view') === 'landing';
  
  if (isLoading) {
    return null;
  }
  
  if (user && !viewLanding) {
    return <Redirect to="/chat" />;
  }
  
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthRedirect} />
      <Route path="/landing" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;