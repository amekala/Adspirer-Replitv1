import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProductsServicesForm, ProductsServicesFormData } from "@/components/forms/products-services-form";

interface ProductsServicesStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

export function ProductsServicesStep({ onNext, onPrevious, onSkip }: ProductsServicesStepProps) {
  const { toast } = useToast();
  
  // Fetch products/services data if available
  const { data: productsData } = useQuery<Partial<ProductsServicesFormData>>({
    queryKey: ["/api/user/products-services"],
    retry: false,
  });
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: ProductsServicesFormData) => {
      return apiRequest("/api/onboarding/products-services", {
        method: "POST",
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/products-services"] });
      toast({
        title: "Products information saved",
        description: "Your products and services details have been saved successfully.",
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
        <h2 className="text-2xl font-bold mb-2">Your Products or Services</h2>
        <p className="text-muted-foreground">
          Tell us about what you're selling to help us create more effective ad recommendations
        </p>
      </div>

      <ProductsServicesForm
        initialData={productsData as Partial<ProductsServicesFormData>}
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        renderFormActions={renderFormActions}
      />
    </div>
  );
}