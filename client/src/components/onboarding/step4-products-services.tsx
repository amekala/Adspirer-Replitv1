import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { ProductsServicesForm as ProductsForm, ProductsServicesFormData } from "@/components/forms/products-services-form";

interface ProductsServicesStepProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

export function ProductsServicesForm({ onNext, onPrevious, onSkip }: ProductsServicesStepProps) {
  const { toast } = useToast();
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: ProductsServicesFormData) => {
      return apiRequest("/api/onboarding/products-services", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({
        title: "Products and services saved",
        description: "Your product information has been saved successfully.",
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
  const handleSubmit = (data: ProductsServicesFormData) => {
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
    <ProductsForm
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      renderFormActions={renderFormActions}
    />
  );
}