import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema
const businessCoreSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  website: z.string().url("Please enter a valid URL"),
  primaryGoal: z.enum([
    "onlineSales", 
    "leadGeneration", 
    "brandAwareness", 
    "websiteTraffic", 
    "appInstalls", 
    "other"
  ], {
    required_error: "Please select a primary advertising goal",
  }),
  otherGoal: z.string().optional(),
});

type BusinessCoreFormValues = z.infer<typeof businessCoreSchema>;

// Component props
interface BusinessCoreFormProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

export function BusinessCoreForm({ onNext, onPrevious, onSkip }: BusinessCoreFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Set up form
  const form = useForm<BusinessCoreFormValues>({
    resolver: zodResolver(businessCoreSchema),
    defaultValues: {
      businessName: "",
      website: "",
      primaryGoal: undefined,
      otherGoal: "",
    },
  });
  
  // Watch primary goal to show/hide "Other" text field
  const watchPrimaryGoal = form.watch("primaryGoal");
  
  // Get existing business core data if available
  // Define expected data structure
  interface BusinessCoreData {
    businessName?: string;
    website?: string;
    industry?: string;
    companySize?: string;
    marketplaces?: string[];
    mainGoals?: string[];
  }
  
  const { data: businessData, isLoading } = useQuery<BusinessCoreData>({
    queryKey: ["/api/onboarding/business-core"],
    retry: 1,
  });
  
  // Fill form with existing data if available
  useEffect(() => {
    if (businessData && !isLoading) {
      form.reset({
        businessName: businessData.businessName || "",
        website: businessData.website || "",
        primaryGoal: businessData.mainGoals?.[0] as any || undefined,
        otherGoal: businessData.mainGoals?.[0] === "other" ? businessData.mainGoals?.[1] : "",
      });
    }
  }, [businessData, isLoading, form]);
  
  // Submit form mutation
  const submitMutation = useMutation({
    mutationFn: async (data: BusinessCoreFormValues) => {
      // Prepare data for API
      const apiData = {
        businessName: data.businessName,
        website: data.website,
        industry: "unknown", // Will be determined by backend analysis
        companySize: "unknown", // Will be determined by backend analysis
        marketplaces: ["amazon"], // Default
        mainGoals: data.primaryGoal === "other" 
          ? ["other", data.otherGoal] 
          : [data.primaryGoal],
      };
      
      return await apiRequest("POST", "/api/onboarding/business-core", apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/business-core"] });
      toast({
        title: "Information saved",
        description: "Your business information has been saved successfully.",
      });
      onNext();
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving information",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Website analysis
  const analyzeWebsite = async (url: string) => {
    if (!url || !z.string().url().safeParse(url).success) return;
    
    setIsAnalyzing(true);
    try {
      // This would trigger the website analysis in a real implementation
      // await apiRequest("POST", "/api/analyze-website", { url });
      toast({
        title: "Website analysis",
        description: "Analyzing your website in the background...",
      });
      
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error("Website analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // When website URL field loses focus, trigger analysis
  const handleWebsiteBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const url = event.target.value;
    analyzeWebsite(url);
  };
  
  // Form submission
  const onSubmit = (data: BusinessCoreFormValues) => {
    submitMutation.mutate(data);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Business Name */}
        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your business name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Website URL */}
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://your-business.com" 
                  {...field} 
                  onBlur={(e) => {
                    field.onBlur();
                    handleWebsiteBlur(e);
                  }}
                />
              </FormControl>
              <FormDescription>
                We'll analyze this to understand your products, services, and brand.
                {isAnalyzing && (
                  <span className="ml-2 inline-flex items-center text-indigo-500">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Analyzing...
                  </span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Primary Advertising Goal */}
        <FormField
          control={form.control}
          name="primaryGoal"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Primary Advertising Goal</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-2"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="onlineSales" id="onlineSales" />
                    </FormControl>
                    <FormLabel htmlFor="onlineSales" className="font-normal cursor-pointer">
                      Online Sales / eCommerce
                    </FormLabel>
                  </FormItem>
                  
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="leadGeneration" id="leadGeneration" />
                    </FormControl>
                    <FormLabel htmlFor="leadGeneration" className="font-normal cursor-pointer">
                      Lead Generation
                    </FormLabel>
                  </FormItem>
                  
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="brandAwareness" id="brandAwareness" />
                    </FormControl>
                    <FormLabel htmlFor="brandAwareness" className="font-normal cursor-pointer">
                      Brand Awareness & Reach
                    </FormLabel>
                  </FormItem>
                  
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="websiteTraffic" id="websiteTraffic" />
                    </FormControl>
                    <FormLabel htmlFor="websiteTraffic" className="font-normal cursor-pointer">
                      Website Traffic
                    </FormLabel>
                  </FormItem>
                  
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="appInstalls" id="appInstalls" />
                    </FormControl>
                    <FormLabel htmlFor="appInstalls" className="font-normal cursor-pointer">
                      App Installs
                    </FormLabel>
                  </FormItem>
                  
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="other" id="other" />
                    </FormControl>
                    <FormLabel htmlFor="other" className="font-normal cursor-pointer">
                      Other
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Other Goal (conditionally rendered) */}
        {watchPrimaryGoal === "other" && (
          <FormField
            control={form.control}
            name="otherGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Please specify</FormLabel>
                <FormControl>
                  <Input placeholder="Please describe your advertising goal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Form Actions */}
        <div className="flex justify-between pt-6">
          {onPrevious && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={submitMutation.isPending}
            >
              Back
            </Button>
          )}
          <div className="ml-auto flex space-x-2">
            {onSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={submitMutation.isPending}
              >
                Skip for now
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}