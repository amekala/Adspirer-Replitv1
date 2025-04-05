import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
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
      return apiRequest("/api/onboarding/creative-examples", {
        method: "POST",
        data,
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