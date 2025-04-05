import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BusinessCoreStep } from "./step1-business-core";
import { ConnectPlatformsStep } from "./step2-connect-platforms";
import { BrandIdentityStep } from "./step3-brand-identity";
import { ProductsServicesStep } from "./step4-products-services";
import { CreativeExamplesStep } from "./step5-creative-examples";
import { PerformanceContextStep } from "./step6-performance-context";

// Onboarding flow steps
export enum OnboardingStep {
  BusinessCore = 1,
  ConnectPlatforms = 2,
  BrandIdentity = 3,
  ProductsServices = 4,
  CreativeExamples = 5,
  PerformanceContext = 6,
  Complete = 7,
}

interface OnboardingProgress {
  currentStep: OnboardingStep;
  completed: boolean;
  steps: {
    [key in OnboardingStep]?: {
      completed: boolean;
      lastUpdated?: string;
    };
  };
}

interface OnboardingFlowProps {
  onComplete: () => void;
  startAtStep?: OnboardingStep;
}

export function OnboardingFlow({ onComplete, startAtStep = OnboardingStep.BusinessCore }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(startAtStep);
  
  // Fetch onboarding progress from API
  const { data: progress, isLoading, error } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
    retry: false,
  });
  
  // Initialize step based on saved progress
  useEffect(() => {
    if (progress && !startAtStep) {
      setCurrentStep(progress.currentStep);
    }
  }, [progress, startAtStep]);
  
  // Step navigation handlers
  const goToNextStep = () => {
    setCurrentStep((prev) => (prev < OnboardingStep.Complete ? prev + 1 : prev));
  };
  
  const goToPreviousStep = () => {
    setCurrentStep((prev) => (prev > OnboardingStep.BusinessCore ? prev - 1 : prev));
  };
  
  const skipStep = () => {
    goToNextStep();
  };
  
  const handleComplete = () => {
    onComplete();
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500">Failed to load onboarding progress.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Handle completion outside of the switch statement
  useEffect(() => {
    if (currentStep === OnboardingStep.Complete) {
      handleComplete();
    }
  }, [currentStep]);

  // Render current step
  switch (currentStep) {
    case OnboardingStep.BusinessCore:
      return <BusinessCoreStep onNext={goToNextStep} onSkip={skipStep} />;
      
    case OnboardingStep.ConnectPlatforms:
      return (
        <ConnectPlatformsStep 
          onNext={goToNextStep} 
          onPrevious={goToPreviousStep} 
          onSkip={skipStep} 
        />
      );
      
    case OnboardingStep.BrandIdentity:
      return (
        <BrandIdentityStep 
          onNext={goToNextStep} 
          onPrevious={goToPreviousStep} 
          onSkip={skipStep} 
        />
      );
      
    case OnboardingStep.ProductsServices:
      return (
        <ProductsServicesStep 
          onNext={goToNextStep} 
          onPrevious={goToPreviousStep} 
          onSkip={skipStep} 
        />
      );
      
    case OnboardingStep.CreativeExamples:
      return (
        <CreativeExamplesStep 
          onNext={goToNextStep} 
          onPrevious={goToPreviousStep} 
          onSkip={skipStep} 
        />
      );
      
    case OnboardingStep.PerformanceContext:
      return (
        <PerformanceContextStep 
          onNext={goToNextStep} 
          onPrevious={goToPreviousStep} 
          onSkip={skipStep}
          onComplete={handleComplete}
        />
      );
      
    case OnboardingStep.Complete:
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Completing setup...</p>
          </div>
        </div>
      );
      
    default:
      return null;
  }
}