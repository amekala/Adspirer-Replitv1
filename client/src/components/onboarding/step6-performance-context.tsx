import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PerformanceContextForm, PerformanceContextFormData } from "@/components/forms/performance-context-form";

interface PerformanceContextStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  onComplete: () => void;
}

export function PerformanceContextStep({ onNext, onPrevious, onSkip, onComplete }: PerformanceContextStepProps) {
  const { toast } = useToast();
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: PerformanceContextFormData) => {
      return apiRequest("/api/onboarding/performance-context", {
        method: "POST",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({
        title: "Performance context saved",
        description: "Your performance goals have been saved successfully.",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const handleSubmit = (data: PerformanceContextFormData) => {
    // Ensure keyMetrics array is populated based on selections
    const keyMetrics = [...(data.keyMetrics || [])];
    
    // Add primary KPI to keyMetrics if it exists and not already in the array
    if (data.keyPerformanceMetric && !keyMetrics.includes(data.keyPerformanceMetric)) {
      keyMetrics.push(data.keyPerformanceMetric);
    }
    
    // Add secondary metrics to keyMetrics if they exist
    if (data.secondaryMetrics && data.secondaryMetrics.length > 0) {
      data.secondaryMetrics.forEach(metric => {
        if (!keyMetrics.includes(metric)) {
          keyMetrics.push(metric);
        }
      });
    }
    
    // Ensure we have at least one metric in the array
    if (keyMetrics.length === 0) {
      keyMetrics.push('conversions');
    }
    
    // Create submission data with updated keyMetrics
    const submissionData = {
      ...data,
      keyMetrics
    };
    
    mutation.mutate(submissionData);
  };

  // Custom rendering of form actions for this context
  const renderFormActions = () => (
    <div className="flex justify-between pt-6">
      <Button type="button" variant="outline" onClick={onPrevious}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div>
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} className="mr-2">
            Skip for now
          </Button>
        )}
        
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Complete Setup"}
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Performance Context</h2>
        <p className="text-muted-foreground">
          Set your advertising performance goals and metrics to help us optimize your campaigns
        </p>
      </div>

      <PerformanceContextForm
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        renderFormActions={renderFormActions}
      />
    </div>
  );
}