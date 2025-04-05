import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, PlusCircle, X, Image, Trash2, Link } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

interface CreativeExamplesFormProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

// Type for ad example object
type AdExample = {
  title: string;
  description?: string;
  mediaUrl?: string; // URL to image/media
  adType: string; // e.g., "display", "sponsored", "video"
  platform: string; // e.g., "amazon", "google", "facebook"
  performanceNotes?: string;
  id?: string; // Used for editing
};

// Type for brand guidelines
type BrandGuidelines = {
  doList: string[];
  dontList: string[];
  additionalNotes?: string;
};

// Define form schema based on creativeExamples table
const creativeExamplesSchema = z.object({
  adExamples: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    mediaUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    adType: z.string().min(1, "Ad type is required"),
    platform: z.string().min(1, "Platform is required"),
    performanceNotes: z.string().optional(),
  })),
  preferredAdFormats: z.array(z.string()).min(1, "At least one preferred ad format is required"),
  brandGuidelines: z.object({
    doList: z.array(z.string()),
    dontList: z.array(z.string()),
    additionalNotes: z.string().optional(),
  }),
});

type CreativeExamplesFormData = z.infer<typeof creativeExamplesSchema>;

export function CreativeExamplesForm({ onNext, onPrevious, onSkip }: CreativeExamplesFormProps) {
  const { toast } = useToast();
  
  const [adFormatInput, setAdFormatInput] = useState("");
  const [doInput, setDoInput] = useState("");
  const [dontInput, setDontInput] = useState("");
  const [adFormVisible, setAdFormVisible] = useState(false);
  const [currentAd, setCurrentAd] = useState<AdExample>({
    title: "",
    description: "",
    mediaUrl: "",
    adType: "sponsored-product",
    platform: "amazon",
    performanceNotes: "",
    id: "",
  });
  const [isEditingAd, setIsEditingAd] = useState(false);
  
  // Default form values
  const defaultValues: CreativeExamplesFormData = {
    adExamples: [],
    preferredAdFormats: [],
    brandGuidelines: {
      doList: [],
      dontList: [],
      additionalNotes: "",
    },
  };

  const form = useForm<CreativeExamplesFormData>({
    resolver: zodResolver(creativeExamplesSchema),
    defaultValues,
  });

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
        description: "Your creative examples have been saved successfully.",
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
  const onSubmit = (data: CreativeExamplesFormData) => {
    mutation.mutate(data);
  };

  // Add a tag to a list
  const addTag = (type: 'preferredAdFormats' | 'doList' | 'dontList', value: string) => {
    if (!value.trim()) return;
    
    if (type === 'preferredAdFormats') {
      const formats = form.getValues("preferredAdFormats");
      if (!formats.includes(value.trim())) {
        form.setValue("preferredAdFormats", [...formats, value.trim()]);
      }
      setAdFormatInput("");
    } else if (type === 'doList') {
      const doList = form.getValues("brandGuidelines.doList");
      if (!doList.includes(value.trim())) {
        form.setValue("brandGuidelines.doList", [...doList, value.trim()]);
      }
      setDoInput("");
    } else if (type === 'dontList') {
      const dontList = form.getValues("brandGuidelines.dontList");
      if (!dontList.includes(value.trim())) {
        form.setValue("brandGuidelines.dontList", [...dontList, value.trim()]);
      }
      setDontInput("");
    }
  };

  // Remove a tag from a list
  const removeTag = (type: 'preferredAdFormats' | 'doList' | 'dontList', index: number) => {
    if (type === 'preferredAdFormats') {
      const formats = form.getValues("preferredAdFormats");
      formats.splice(index, 1);
      form.setValue("preferredAdFormats", [...formats]);
    } else if (type === 'doList') {
      const doList = form.getValues("brandGuidelines.doList");
      doList.splice(index, 1);
      form.setValue("brandGuidelines.doList", [...doList]);
    } else if (type === 'dontList') {
      const dontList = form.getValues("brandGuidelines.dontList");
      dontList.splice(index, 1);
      form.setValue("brandGuidelines.dontList", [...dontList]);
    }
  };
  
  // Add or update an ad example
  const handleAdSave = () => {
    if (!currentAd.title || !currentAd.adType || !currentAd.platform) {
      toast({
        title: "Missing information",
        description: "Title, ad type, and platform are required.",
        variant: "destructive"
      });
      return;
    }
    
    const ads = form.getValues("adExamples") || [];
    
    if (isEditingAd && currentAd.id) {
      // Find and update the existing ad
      const updatedAds = ads.map(ad => 
        ad.title === currentAd.id ? {
          title: currentAd.title,
          description: currentAd.description,
          mediaUrl: currentAd.mediaUrl,
          adType: currentAd.adType,
          platform: currentAd.platform,
          performanceNotes: currentAd.performanceNotes,
        } : ad
      );
      form.setValue("adExamples", updatedAds);
    } else {
      // Add new ad
      form.setValue("adExamples", [
        ...ads, 
        {
          title: currentAd.title,
          description: currentAd.description,
          mediaUrl: currentAd.mediaUrl,
          adType: currentAd.adType,
          platform: currentAd.platform,
          performanceNotes: currentAd.performanceNotes,
        }
      ]);
    }
    
    // Reset form
    setAdFormVisible(false);
    setCurrentAd({
      title: "",
      description: "",
      mediaUrl: "",
      adType: "sponsored-product",
      platform: "amazon",
      performanceNotes: "",
      id: "",
    });
    setIsEditingAd(false);
  };
  
  // Edit an existing ad
  const handleAdEdit = (index: number) => {
    const ads = form.getValues("adExamples");
    const adToEdit = ads[index];
    
    setCurrentAd({
      ...adToEdit,
      id: adToEdit.title, // Store original title as ID for update reference
    });
    setIsEditingAd(true);
    setAdFormVisible(true);
  };
  
  // Remove an ad
  const handleAdRemove = (index: number) => {
    const ads = form.getValues("adExamples");
    ads.splice(index, 1);
    form.setValue("adExamples", [...ads]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-purple-800">Creative Examples</h3>
        <p className="mt-1 text-sm text-purple-700">
          Share examples of your ads and creative guidelines to help us understand your advertising style.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="examples" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="examples">Ad Examples</TabsTrigger>
              <TabsTrigger value="guidelines">Brand Guidelines</TabsTrigger>
            </TabsList>
            
            {/* Ad Examples Tab */}
            <TabsContent value="examples" className="space-y-6">
              {/* Preferred Ad Formats */}
              <FormField
                control={form.control}
                name="preferredAdFormats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Ad Formats</FormLabel>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Sponsored Products, Video Ads..."
                        value={adFormatInput}
                        onChange={(e) => setAdFormatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag('preferredAdFormats', adFormatInput);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => addTag('preferredAdFormats', adFormatInput)}
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
                            onClick={() => removeTag('preferredAdFormats', index)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormDescription>
                      Types of ad formats you prefer to use in your campaigns.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Ad Examples */}
              <FormField
                control={form.control}
                name="adExamples"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad Examples</FormLabel>
                    <FormDescription className="mb-2">
                      Add examples of ads that have worked well for you.
                    </FormDescription>
                    
                    {/* Ad examples list */}
                    <div className="grid grid-cols-1 gap-4 mb-3">
                      {field.value.map((ad, index) => (
                        <Card key={index} className="overflow-hidden">
                          <div className="sm:flex">
                            {ad.mediaUrl && (
                              <div className="h-40 sm:h-auto sm:w-40 bg-gray-100 flex items-center justify-center border-b sm:border-b-0 sm:border-r">
                                <div className="relative w-full h-full">
                                  <img 
                                    src={ad.mediaUrl} 
                                    alt={ad.title}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Ad+Image';
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            <div className="flex-1">
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base">{ad.title}</CardTitle>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {ad.adType}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs text-blue-600">
                                        {ad.platform}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleAdEdit(index)}
                                    >
                                      <span className="sr-only">Edit</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                      </svg>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleAdRemove(index)}
                                    >
                                      <span className="sr-only">Delete</span>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-2">
                                {ad.description && (
                                  <p className="text-sm text-gray-600 mb-2">{ad.description}</p>
                                )}
                                {ad.performanceNotes && (
                                  <div className="mt-2">
                                    <h4 className="text-xs font-medium text-gray-500">Performance Notes:</h4>
                                    <p className="text-sm text-gray-600">{ad.performanceNotes}</p>
                                  </div>
                                )}
                              </CardContent>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Ad form */}
                    {adFormVisible ? (
                      <div className="border rounded-md p-4 bg-gray-50 mb-3">
                        <h4 className="font-medium text-sm mb-3">
                          {isEditingAd ? "Edit Ad Example" : "Add New Ad Example"}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Title</label>
                            <Input 
                              value={currentAd.title}
                              onChange={(e) => setCurrentAd({...currentAd, title: e.target.value})}
                              placeholder="Ad title or name"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Ad Type</label>
                              <select
                                value={currentAd.adType}
                                onChange={(e) => setCurrentAd({...currentAd, adType: e.target.value})}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="sponsored-product">Sponsored Product</option>
                                <option value="sponsored-brand">Sponsored Brand</option>
                                <option value="sponsored-display">Sponsored Display</option>
                                <option value="search-ad">Search Ad</option>
                                <option value="display-ad">Display Ad</option>
                                <option value="video-ad">Video Ad</option>
                                <option value="social-ad">Social Media Ad</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Platform</label>
                              <select
                                value={currentAd.platform}
                                onChange={(e) => setCurrentAd({...currentAd, platform: e.target.value})}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="amazon">Amazon</option>
                                <option value="google">Google</option>
                                <option value="facebook">Facebook/Meta</option>
                                <option value="instagram">Instagram</option>
                                <option value="youtube">YouTube</option>
                                <option value="tiktok">TikTok</option>
                                <option value="walmart">Walmart</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Description</label>
                            <Textarea 
                              value={currentAd.description}
                              onChange={(e) => setCurrentAd({...currentAd, description: e.target.value})}
                              placeholder="Brief description of the ad"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Media URL (optional)</label>
                            <div className="flex">
                              <Input 
                                value={currentAd.mediaUrl}
                                onChange={(e) => setCurrentAd({...currentAd, mediaUrl: e.target.value})}
                                placeholder="https://example.com/image.jpg"
                                className="rounded-r-none"
                              />
                              <Button type="button" variant="outline" className="rounded-l-none border-l-0">
                                <Link className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Provide a URL to your ad image or creative</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Performance Notes (optional)</label>
                            <Textarea 
                              value={currentAd.performanceNotes}
                              onChange={(e) => setCurrentAd({...currentAd, performanceNotes: e.target.value})}
                              placeholder="Notes about the ad performance, e.g., 'High CTR but low conversion'"
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setAdFormVisible(false);
                                setIsEditingAd(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAdSave}
                            >
                              {isEditingAd ? "Update" : "Add"} Ad Example
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setAdFormVisible(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Ad Example
                      </Button>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            {/* Brand Guidelines Tab */}
            <TabsContent value="guidelines" className="space-y-6">
              {/* Dos */}
              <FormField
                control={form.control}
                name="brandGuidelines.doList"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Do's</FormLabel>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Use our logo in all ads..."
                        value={doInput}
                        onChange={(e) => setDoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag('doList', doInput);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => addTag('doList', doInput)}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((tag, index) => (
                        <Badge key={index} className="px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200">
                          {tag}
                          <button 
                            type="button" 
                            className="ml-2" 
                            onClick={() => removeTag('doList', index)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormDescription>
                      Guidelines on what should be included in ads.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Don'ts */}
              <FormField
                control={form.control}
                name="brandGuidelines.dontList"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Don'ts</FormLabel>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Don't use competitor names..."
                        value={dontInput}
                        onChange={(e) => setDontInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag('dontList', dontInput);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => addTag('dontList', dontInput)}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((tag, index) => (
                        <Badge key={index} className="px-3 py-1 bg-red-100 text-red-800 hover:bg-red-200">
                          {tag}
                          <button 
                            type="button" 
                            className="ml-2" 
                            onClick={() => removeTag('dontList', index)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormDescription>
                      Guidelines on what should be avoided in ads.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Additional Guidelines */}
              <FormField
                control={form.control}
                name="brandGuidelines.additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Guidelines</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any other brand guidelines or creative direction..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Any other important guidelines for your ad creatives.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
          
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