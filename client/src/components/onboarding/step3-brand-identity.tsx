import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, PlusCircle, X, Upload } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface BrandIdentityFormProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

// Define form schema based on brandIdentity table
const brandIdentitySchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandDescription: z.string().min(10, "Please provide a more detailed brand description"),
  brandVoice: z.array(z.string()).min(1, "At least one brand voice characteristic is required"),
  targetAudience: z.array(z.string()).min(1, "At least one target audience is required"),
  brandValues: z.array(z.string()).min(1, "At least one brand value is required"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().url("Please enter a valid URL").nullish(),
});

type BrandIdentityFormData = z.infer<typeof brandIdentitySchema>;

export function BrandIdentityForm({ onNext, onPrevious, onSkip }: BrandIdentityFormProps) {
  const { toast } = useToast();
  
  const [brandVoiceInput, setBrandVoiceInput] = useState("");
  const [targetAudienceInput, setTargetAudienceInput] = useState("");
  const [brandValueInput, setBrandValueInput] = useState("");
  
  // Default form values
  const defaultValues: Partial<BrandIdentityFormData> = {
    brandName: "",
    brandDescription: "",
    brandVoice: [],
    targetAudience: [],
    brandValues: [],
    primaryColor: "#4F46E5", // Default primary color
    secondaryColor: "#10B981", // Default secondary color
    logoUrl: "",
  };

  const form = useForm<BrandIdentityFormData>({
    resolver: zodResolver(brandIdentitySchema),
    defaultValues,
  });

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
  const onSubmit = (data: BrandIdentityFormData) => {
    mutation.mutate(data);
  };

  // Add a tag to a list
  const addTag = (type: 'brandVoice' | 'targetAudience' | 'brandValues', value: string) => {
    if (!value.trim()) return;
    
    const fieldValue = form.getValues(type);
    
    // Only add if it doesn't already exist
    if (!fieldValue.includes(value.trim())) {
      form.setValue(type, [...fieldValue, value.trim()]);
    }
    
    // Clear input field
    switch (type) {
      case 'brandVoice':
        setBrandVoiceInput("");
        break;
      case 'targetAudience':
        setTargetAudienceInput("");
        break;
      case 'brandValues':
        setBrandValueInput("");
        break;
    }
  };

  // Remove a tag from a list
  const removeTag = (type: 'brandVoice' | 'targetAudience' | 'brandValues', index: number) => {
    const fieldValue = form.getValues(type);
    fieldValue.splice(index, 1);
    form.setValue(type, [...fieldValue]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-indigo-800">Brand Identity</h3>
        <p className="mt-1 text-sm text-indigo-700">
          Define your brand identity to help us generate content that aligns with your brand voice and values.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Brand Name */}
          <FormField
            control={form.control}
            name="brandName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your brand name" {...field} />
                </FormControl>
                <FormDescription>
                  The name customers recognize your brand by.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Brand Description */}
          <FormField
            control={form.control}
            name="brandDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe your brand's mission, story, and what makes it unique..." 
                    className="min-h-[120px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  A comprehensive description of your brand's purpose and identity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Brand Voice */}
          <FormField
            control={form.control}
            name="brandVoice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Voice</FormLabel>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Friendly, Professional, Energetic..."
                    value={brandVoiceInput}
                    onChange={(e) => setBrandVoiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('brandVoice', brandVoiceInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('brandVoice', brandVoiceInput)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {tag}
                      <button 
                        type="button" 
                        className="ml-2" 
                        onClick={() => removeTag('brandVoice', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  How your brand communicates with its audience.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Target Audience */}
          <FormField
            control={form.control}
            name="targetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Audience</FormLabel>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Millennials, Small Business Owners..."
                    value={targetAudienceInput}
                    onChange={(e) => setTargetAudienceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('targetAudience', targetAudienceInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('targetAudience', targetAudienceInput)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {tag}
                      <button 
                        type="button" 
                        className="ml-2" 
                        onClick={() => removeTag('targetAudience', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  The primary customer segments your brand targets.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Brand Values */}
          <FormField
            control={form.control}
            name="brandValues"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Values</FormLabel>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Innovation, Sustainability, Quality..."
                    value={brandValueInput}
                    onChange={(e) => setBrandValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('brandValues', brandValueInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('brandValues', brandValueInput)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {tag}
                      <button 
                        type="button" 
                        className="ml-2" 
                        onClick={() => removeTag('brandValues', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  Core principles that define your brand's identity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-md border"
                      style={{ backgroundColor: field.value || '#4F46E5' }}
                    />
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                  </div>
                  <FormDescription>
                    Main brand color used in your marketing.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Secondary Color */}
            <FormField
              control={form.control}
              name="secondaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-md border"
                      style={{ backgroundColor: field.value || '#10B981' }}
                    />
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                  </div>
                  <FormDescription>
                    Accent color used alongside your primary color.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Logo URL - for future implementation */}
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL (Optional)</FormLabel>
                <FormControl>
                  <div className="flex">
                    <Input 
                      placeholder="https://yourbrand.com/logo.png" 
                      value={field.value || ''} 
                      onChange={(e) => field.onChange(e.target.value)}
                      className="rounded-r-none"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="rounded-l-none border-l-0"
                      disabled={true} // Enable later when we implement file upload
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Provide a URL to your logo image (direct link only).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Form Actions */}
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
        </form>
      </Form>
    </div>
  );
}