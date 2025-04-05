import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { BrandIdentityForm as BrandForm, BrandIdentityFormData } from "@/components/forms/brand-identity-form";

interface BrandIdentityStepProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

export function BrandIdentityForm({ onNext, onPrevious, onSkip }: BrandIdentityStepProps) {
  const { toast } = useToast();
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: BrandIdentityFormData) => {
      return apiRequest("/api/onboarding/brand-identity", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({
        title: "Brand identity saved",
        description: "Your brand details have been saved successfully.",
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
  const handleSubmit = (data: BrandIdentityFormData) => {
    mutation.mutate(data);
  };

  // Render custom form actions for the onboarding context
  const renderFormActions = () => (
    <div className="flex justify-between pt-6">
      {onPrevious && (
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
      )}
      <div className="ml-auto flex space-x-2">
        {onSkip && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
          >
            Skip for now
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Next"} 
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <BrandForm
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      renderFormActions={renderFormActions}
    />
  );
}