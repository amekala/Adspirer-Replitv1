import { useEffect } from "react";
import { useLocation } from "wouter";
import { OnboardingFlow, OnboardingStep } from "@/components/onboarding/onboarding-flow";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";

export default function OnboardingPage() {
  const [_, setLocation] = useLocation();

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setLocation("/settings");
  };

  // Get step from URL query params if present
  const searchParams = new URLSearchParams(window.location.search);
  const stepParam = searchParams.get("step");
  let startAtStep: OnboardingStep | undefined;
  
  if (stepParam) {
    const stepNumber = parseInt(stepParam);
    if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= 6) {
      startAtStep = stepNumber as OnboardingStep;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Adspirer Setup
              </h1>
              <p className="text-muted-foreground mt-1">
                Let's get your advertising platform configured
              </p>
            </div>
            
            <button 
              onClick={() => setLocation("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center"
            >
              Skip to Dashboard <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-6">
            <Progress value={(startAtStep || 1) / 6 * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Business</span>
              <span>Platforms</span>
              <span>Brand</span>
              <span>Products</span>
              <span>Creatives</span>
              <span>Performance</span>
            </div>
          </div>
        </header>

        <main className="py-6">
          <OnboardingFlow 
            onComplete={handleOnboardingComplete} 
            startAtStep={startAtStep}
          />
        </main>
      </div>
    </div>
  );
}