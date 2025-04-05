import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ConnectPlatformsForm, ConnectPlatformsFormData } from "@/components/forms/connect-platforms-form";

interface ConnectPlatformsStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
}

export function ConnectPlatformsStep({ onNext, onPrevious, onSkip }: ConnectPlatformsStepProps) {
  const { toast } = useToast();
  
  // Fetch connected platforms data
  const { data: platformsData } = useQuery({
    queryKey: ["/api/user/connected-platforms"],
    retry: false,
  });
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: ConnectPlatformsFormData) => {
      return apiRequest("/api/onboarding/connect-platforms", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/connected-platforms"] });
      toast({
        title: "Platform settings saved",
        description: "Your platform preferences have been saved successfully.",
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
  const handleSubmit = (data: ConnectPlatformsFormData) => {
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
        <h2 className="text-2xl font-bold mb-2">Connect Your Advertising Platforms</h2>
        <p className="text-muted-foreground">
          Connect your existing advertising accounts to get insights and manage campaigns in one place
        </p>
      </div>

      <ConnectPlatformsForm
        initialData={platformsData}
        onSubmit={handleSubmit}
        isSubmitting={mutation.isPending}
        renderFormActions={renderFormActions}
      />
    </div>
  );
}