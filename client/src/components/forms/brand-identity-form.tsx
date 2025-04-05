import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Plus, X } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Brand identity form schema
const brandIdentitySchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandDescription: z.string().min(20, "Please provide at least 20 characters"),
  brandVoice: z.array(z.string()).min(1, "Select at least one brand voice option"),
  targetAudience: z.array(z.string()).min(1, "Select at least one target audience"),
  brandValues: z.array(z.string()).min(1, "Select at least one brand value"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")).or(z.null()),
});

// Form data type based on schema
export type BrandIdentityFormData = z.infer<typeof brandIdentitySchema>;

// Initial data for the form
const defaultValues: BrandIdentityFormData = {
  brandName: "",
  brandDescription: "",
  brandVoice: [],
  targetAudience: [],
  brandValues: [],
  primaryColor: "",
  secondaryColor: "",
  logoUrl: "",
};

// Voice tone options
const voiceOptions = [
  "Authoritative",
  "Conversational",
  "Enthusiastic",
  "Formal",
  "Friendly",
  "Humorous",
  "Inspirational",
  "Professional",
  "Relaxed",
  "Technical",
];

// Target audience options
const audienceOptions = [
  "Young Adults (18-24)",
  "Adults (25-34)",
  "Middle-aged (35-49)",
  "Seniors (50+)",
  "Professionals",
  "Parents",
  "Students",
  "Business Owners",
  "Tech Enthusiasts",
  "Luxury Consumers",
  "Budget Shoppers",
  "Health Conscious",
];

// Brand values options
const valueOptions = [
  "Innovation",
  "Reliability",
  "Quality",
  "Affordability",
  "Sustainability",
  "Inclusivity",
  "Luxury",
  "Simplicity",
  "Authenticity",
  "Tradition",
  "Customer Focus",
  "Social Responsibility",
];

interface BrandIdentityFormProps {
  initialData?: Partial<BrandIdentityFormData>;
  onSubmit: (data: BrandIdentityFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function BrandIdentityForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: BrandIdentityFormProps) {
  // Form definition
  const form = useForm<BrandIdentityFormData>({
    resolver: zodResolver(brandIdentitySchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  // Helper functions for multi-select values
  const addOption = (field: string, option: string) => {
    const currentOptions = form.getValues(field as any) || [];
    if (!currentOptions.includes(option)) {
      form.setValue(field as any, [...currentOptions, option]);
    }
  };

  const removeOption = (field: string, option: string) => {
    const currentOptions = form.getValues(field as any) || [];
    form.setValue(
      field as any,
      currentOptions.filter((item: string) => item !== option)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Brand Information */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="brandName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your brand name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brandDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your brand's mission, vision, and what makes it unique"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Logo Upload */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand Logo</FormLabel>
                <Card className="border-dashed">
                  <CardContent className="pt-4 flex flex-col items-center justify-center text-center">
                    <div className="mb-4 p-6 bg-muted rounded-full">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-sm font-medium">Drag and drop your logo here</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      SVG, PNG or JPG (max. 2MB)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="relative"
                      >
                        <span>Upload Logo</span>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                          // In a real implementation, this would handle file upload
                        />
                      </Button>
                      <FormControl>
                        <Input
                          placeholder="Or enter a URL to your logo"
                          {...field}
                          className="max-w-[250px]"
                        />
                      </FormControl>
                    </div>
                    {field.value && (
                      <div className="mt-4">
                        <img 
                          src={field.value} 
                          alt="Brand Logo Preview" 
                          className="max-h-[80px] max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Brand Colors */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Brand Colors</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        className="w-10 h-10 p-1 border rounded-md"
                        {...field}
                      />
                      <Input 
                        placeholder="#FFFFFF" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Main color for your brand
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        className="w-10 h-10 p-1 border rounded-md"
                        {...field}
                      />
                      <Input 
                        placeholder="#FFFFFF" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Accent color for your brand
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Brand Voice */}
        <FormField
          control={form.control}
          name="brandVoice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand Voice & Tone</FormLabel>
              <FormDescription>
                Select how your brand should sound in advertising
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {voiceOptions.map((option) => {
                      const isSelected = field.value?.includes(option);
                      return (
                        <Badge
                          key={option}
                          variant={isSelected ? "default" : "outline"}
                          className={`text-sm py-1 px-3 cursor-pointer ${
                            isSelected ? "bg-primary" : ""
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              removeOption("brandVoice", option);
                            } else {
                              addOption("brandVoice", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("brandVoice", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom voice"
                      className="max-w-xs"
                      id="customVoice"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customVoice") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("brandVoice", inputEl.value.trim());
                          inputEl.value = "";
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </FormControl>
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
              <FormDescription>
                Select who your brand primarily targets
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map((option) => {
                      const isSelected = field.value?.includes(option);
                      return (
                        <Badge
                          key={option}
                          variant={isSelected ? "default" : "outline"}
                          className={`text-sm py-1 px-3 cursor-pointer ${
                            isSelected ? "bg-primary" : ""
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              removeOption("targetAudience", option);
                            } else {
                              addOption("targetAudience", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("targetAudience", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom audience"
                      className="max-w-xs"
                      id="customAudience"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customAudience") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("targetAudience", inputEl.value.trim());
                          inputEl.value = "";
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </FormControl>
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
              <FormDescription>
                Select the values that define your brand
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {valueOptions.map((option) => {
                      const isSelected = field.value?.includes(option);
                      return (
                        <Badge
                          key={option}
                          variant={isSelected ? "default" : "outline"}
                          className={`text-sm py-1 px-3 cursor-pointer ${
                            isSelected ? "bg-primary" : ""
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              removeOption("brandValues", option);
                            } else {
                              addOption("brandValues", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("brandValues", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom value"
                      className="max-w-xs"
                      id="customValue"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customValue") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("brandValues", inputEl.value.trim());
                          inputEl.value = "";
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        {renderFormActions ? (
          renderFormActions()
        ) : (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}