import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BusinessCoreForm, BusinessCoreFormData } from "@/components/forms/business-core-form";
import { Loader2 } from "lucide-react";

interface BusinessCoreStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function BusinessCoreStep({ onNext, onSkip }: BusinessCoreStepProps) {
  const { toast } = useToast();
  
  // Fetch existing business core data
  const { data: businessCoreData, isLoading: isDataLoading } = useQuery<any, Error, BusinessCoreFormData>({
    queryKey: ["/api/user/business-core"],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0 // Consider data stale immediately to ensure it refetches
  });
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: BusinessCoreFormData) => {
      // Only send fields that match the backend schema
      const submissionData = {
        businessName: data.businessName, 
        industry: data.industry,
        companySize: data.companySize,
        marketplaces: data.marketplaces,
        mainGoals: data.mainGoals,
        monthlyAdSpend: data.monthlyAdSpend,
        website: data.website,
      };
      
      return apiRequest("/api/onboarding/business-core", {
        method: "POST",
        data: submissionData
      });
    },
    onSuccess: () => {
      // Invalidate both the progress and business core data queries
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/business-core"] });
      toast({
        title: "Business information saved",
        description: "Your business details have been saved successfully.",
      });
      onNext();
    },
    onError: (error) => {
      console.error("Business core form error:", error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const handleSubmit = (data: BusinessCoreFormData) => {
    mutation.mutate(data);
  };

  // Custom rendering of form actions for this context
  const renderFormActions = () => (
    <div className="flex justify-between pt-6">
      <div>
        {/* No back button on first step */}
      </div>
      
      <div>
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} className="mr-2">
            Skip for now
          </Button>
        )}
        
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Show loading indicator while fetching data
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your business information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Tell us about your business</h2>
        <p className="text-muted-foreground">
          Let's start with some basic information about your business to help personalize your experience
        </p>
      </div>

      <BusinessCoreForm
        initialData={businessCoreData as Partial<BusinessCoreFormData>}
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        renderFormActions={renderFormActions}
      />
    </div>
  );
}