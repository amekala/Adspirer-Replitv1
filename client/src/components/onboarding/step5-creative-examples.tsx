import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreativeExamplesForm, CreativeExamplesFormData } from "@/components/forms/creative-examples-form";

interface CreativeExamplesStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

export function CreativeExamplesStep({ onNext, onPrevious, onSkip }: CreativeExamplesStepProps) {
  const { toast } = useToast();
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: CreativeExamplesFormData) => {
      // Transform frontend data to match backend schema
      const adExamples = [];

      // Process successful ads
      if (data.successfulAds?.length) {
        adExamples.push(
          ...data.successfulAds.map(ad => ({
            title: "Successful Ad",
            description: ad.description || "",
            imageUrl: ad.url || "",
            performanceNotes: "Internal successful ad"
          }))
        );
      }

      // Process competitor ads
      if (data.competitorAds?.length) {
        adExamples.push(
          ...data.competitorAds.map(ad => ({
            title: "Competitor Ad",
            description: ad.description || "",
            imageUrl: ad.url || "",
            performanceNotes: ""
          }))
        );
      }

      // Process inspiration ads
      if (data.inspirationAds?.length) {
        adExamples.push(
          ...data.inspirationAds.map(ad => ({
            title: "Inspiration",
            description: ad.description || "",
            imageUrl: ad.url || "",
            performanceNotes: ""
          }))
        );
      }

      // Determine preferred ad formats based on style preference
      const preferredAdFormats = [];
      if (data.adStylePreference) {
        preferredAdFormats.push(data.adStylePreference);
      }
      if (data.copyLengthPreference) {
        preferredAdFormats.push(data.copyLengthPreference);
      }

      // Create brand guidelines from additional notes
      const brandGuidelines = {
        notes: data.additionalNotes || ""
      };

      // Construct data structure expected by backend
      const submissionData = {
        adExamples,
        preferredAdFormats,
        brandGuidelines
      };

      console.log("Submitting creative examples data:", submissionData);
      return apiRequest("/api/onboarding/creative-examples", {
        method: "POST",
        data: submissionData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({
        title: "Creative examples saved",
        description: "Your ad examples have been saved successfully.",
      });
      onNext();
    },
    onError: (error) => {
      console.error("Creative examples submission error:", error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const handleSubmit = (data: CreativeExamplesFormData) => {
    mutation.mutate(data);
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
          {mutation.isPending ? "Saving..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Creative Examples</h2>
        <p className="text-muted-foreground">
          Share examples of ads you like or have used before to help us understand your creative preferences
        </p>
      </div>

      <CreativeExamplesForm
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        renderFormActions={renderFormActions}
      />
    </div>
  );
}