import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Building, 
  Link as LinkIcon, 
  Award, 
  Package, 
  Image, 
  BarChart3,
  CheckCircle,
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Will be imported once actually implemented
// import { BusinessCoreForm } from "./step1-business-core";
// import { ConnectPlatformsForm } from "./step2-connect-platforms";

// Define interface for onboarding progress data
interface OnboardingProgressData {
  id?: number;
  userId?: string;
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
  lastUpdated?: string;
  createdAt?: string;
}

// Define interface for step components
interface StepComponentProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

// Temporary components until we fully implement them
export const BusinessCoreForm = ({ onNext, onPrevious, onSkip }: StepComponentProps) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium">Business Core Form</h3>
      <p className="mb-4">This component will be fully implemented soon.</p>
      <div className="flex justify-end gap-2">
        {onSkip && <Button variant="ghost" onClick={onSkip}>Skip</Button>}
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
};

export const ConnectPlatformsForm = ({ onNext, onPrevious, onSkip }: StepComponentProps) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium">Connect Platforms Form</h3>
      <p className="mb-4">This component will integrate existing platform connectors.</p>
      <div className="flex justify-between">
        {onPrevious && <Button variant="outline" onClick={onPrevious}>Previous</Button>}
        <div className="flex gap-2">
          {onSkip && <Button variant="ghost" onClick={onSkip}>Skip</Button>}
          <Button onClick={onNext}>Continue</Button>
        </div>
      </div>
    </div>
  );
};

// Define the type for onboarding steps
interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<StepComponentProps> | null;
}

// Step wizard configuration
export const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: "Your Business Core",
    description: "Tell us about your business",
    icon: <Building className="h-5 w-5" />,
    component: BusinessCoreForm
  },
  {
    id: 2,
    title: "Connect Your Ad Platforms",
    description: "Link your existing ad accounts",
    icon: <LinkIcon className="h-5 w-5" />,
    component: ConnectPlatformsForm
  },
  {
    id: 3,
    title: "Your Brand Identity",
    description: "Tell us about your brand",
    icon: <Award className="h-5 w-5" />,
    component: null // Will be implemented later
  },
  {
    id: 4,
    title: "Your Products or Services",
    description: "What do you offer?",
    icon: <Package className="h-5 w-5" />,
    component: null // Will be implemented later
  },
  {
    id: 5,
    title: "Creative Examples",
    description: "Share your ad creative examples",
    icon: <Image className="h-5 w-5" />,
    component: null // Will be implemented later
  },
  {
    id: 6,
    title: "Performance Context",
    description: "Your current metrics and goals",
    icon: <BarChart3 className="h-5 w-5" />,
    component: null // Will be implemented later
  }
];

export function OnboardingWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  
  // Load onboarding progress
  const { data: progressData, isLoading: progressLoading } = useQuery<OnboardingProgressData>({
    queryKey: ["/api/onboarding/progress"],
    retry: 1
  });
  
  // Set the current step based on progress data
  useEffect(() => {
    if (progressData && !progressLoading) {
      setCurrentStep(progressData?.currentStep || 1);
      setCompleted(progressData?.completedSteps || []);
    }
  }, [progressData, progressLoading]);
  
  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { currentStep: number, isComplete?: boolean }) => {
      return await apiRequest("POST", "/api/onboarding/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleNext = () => {
    if (currentStep < onboardingSteps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Mark previous step as completed
      if (!completed.includes(currentStep)) {
        const newCompleted = [...completed, currentStep];
        setCompleted(newCompleted);
        
        // Update progress in the backend
        updateProgressMutation.mutate({ 
          currentStep: nextStep,
          isComplete: nextStep === onboardingSteps.length
        });
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Update progress in the backend
      updateProgressMutation.mutate({ 
        currentStep: prevStep,
        isComplete: false
      });
    }
  };
  
  const handleSkip = () => {
    // Only go to next step, don't mark current as completed
    if (currentStep < onboardingSteps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Update progress in the backend
      updateProgressMutation.mutate({ 
        currentStep: nextStep,
        isComplete: false
      });
    }
  };
  
  // If all steps are completed, redirect to dashboard
  useEffect(() => {
    if (progressData?.isComplete) {
      navigate("/dashboard");
    }
  }, [progressData, navigate]);
  
  // Render the current step component
  const CurrentStepComponent = onboardingSteps[currentStep - 1]?.component;
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {onboardingSteps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  completed.includes(step.id) 
                    ? "bg-green-500 border-green-500 text-white" 
                    : step.id === currentStep 
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                }`}
              >
                {completed.includes(step.id) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.icon || step.id
                )}
              </div>
              <span className={`text-xs mt-2 ${step.id === currentStep ? "font-medium" : "text-gray-500"}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full"></div>
          <div 
            className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all" 
            style={{ width: `${((currentStep - 1) / (onboardingSteps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Step Content */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{onboardingSteps[currentStep - 1]?.title}</CardTitle>
          <CardDescription>{onboardingSteps[currentStep - 1]?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {CurrentStepComponent ? (
            <CurrentStepComponent 
              onNext={handleNext} 
              onPrevious={handlePrevious}
              onSkip={handleSkip}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">This step is under development</p>
            </div>
          )}
        </CardContent>
        {!CurrentStepComponent && (
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || updateProgressMutation.isPending}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={updateProgressMutation.isPending}
              >
                Skip for now
              </Button>
              <Button
                onClick={handleNext}
                disabled={updateProgressMutation.isPending}
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}