import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export function OnboardingPage() {
  const { user, isLoading } = useAuth();
  
  // Protect the route - require authentication
  if (!isLoading && !user) {
    return <Redirect to="/auth" />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">Set Up Your Advertising Account</h1>
        <OnboardingWizard />
      </div>
    </div>
  );
}