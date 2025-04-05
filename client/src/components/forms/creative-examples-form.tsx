import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Upload, Link, Plus, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Creative examples form schema
const creativeExamplesSchema = z.object({
  successfulAds: z.array(
    z.object({
      type: z.enum(["image", "video", "link"]),
      url: z.string().url("Please enter a valid URL").optional(),
      description: z.string().optional(),
      file: z.any().optional(), // This would be a File object for uploads
    })
  ).optional(),
  competitorAds: z.array(
    z.object({
      type: z.enum(["image", "video", "link"]),
      url: z.string().url("Please enter a valid URL").optional(),
      description: z.string().optional(),
      file: z.any().optional(),
    })
  ).optional(),
  inspirationAds: z.array(
    z.object({
      type: z.enum(["image", "video", "link"]),
      url: z.string().url("Please enter a valid URL").optional(),
      description: z.string().optional(),
      file: z.any().optional(),
    })
  ).optional(),
  adStylePreference: z.enum(["formal", "casual", "humorous", "emotional", "technical", "minimalist"]).optional(),
  copyLengthPreference: z.enum(["short", "medium", "long"]).optional(),
  additionalNotes: z.string().optional(),
});

// Form data type based on schema
export type CreativeExamplesFormData = z.infer<typeof creativeExamplesSchema>;

// Initial data for the form
const defaultValues: CreativeExamplesFormData = {
  successfulAds: [],
  competitorAds: [],
  inspirationAds: [],
  adStylePreference: undefined,
  copyLengthPreference: undefined,
  additionalNotes: "",
};

interface CreativeExamplesFormProps {
  initialData?: Partial<CreativeExamplesFormData>;
  onSubmit: (data: CreativeExamplesFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function CreativeExamplesForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: CreativeExamplesFormProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"upload" | "link">("upload");
  
  // Form definition
  const form = useForm<CreativeExamplesFormData>({
    resolver: zodResolver(creativeExamplesSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  // Handlers for adding creative examples
  const addSuccessfulAd = (type: "image" | "video" | "link", url?: string) => {
    const currentAds = form.getValues("successfulAds") || [];
    form.setValue("successfulAds", [
      ...currentAds,
      { type, url: url || "", description: "" },
    ]);
  };

  const addCompetitorAd = (type: "image" | "video" | "link", url?: string) => {
    const currentAds = form.getValues("competitorAds") || [];
    form.setValue("competitorAds", [
      ...currentAds,
      { type, url: url || "", description: "" },
    ]);
  };

  const addInspirationAd = (type: "image" | "video" | "link", url?: string) => {
    const currentAds = form.getValues("inspirationAds") || [];
    form.setValue("inspirationAds", [
      ...currentAds,
      { type, url: url || "", description: "" },
    ]);
  };

  // Handlers for removing creative examples
  const removeSuccessfulAd = (index: number) => {
    const currentAds = form.getValues("successfulAds") || [];
    form.setValue(
      "successfulAds",
      currentAds.filter((_, i) => i !== index)
    );
  };

  const removeCompetitorAd = (index: number) => {
    const currentAds = form.getValues("competitorAds") || [];
    form.setValue(
      "competitorAds",
      currentAds.filter((_, i) => i !== index)
    );
  };

  const removeInspirationAd = (index: number) => {
    const currentAds = form.getValues("inspirationAds") || [];
    form.setValue(
      "inspirationAds",
      currentAds.filter((_, i) => i !== index)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Your Successful Ads */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Your Successful Ads</h3>
          <p className="text-sm text-muted-foreground">
            Share examples of your previous successful ad creatives
          </p>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "link")}>
            <TabsList className="mb-4">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link className="h-4 w-4 mr-2" /> Link
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSuccessfulAd("image")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSuccessfulAd("video")}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Video
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="link" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste a URL to an ad (e.g., YouTube, social media)"
                  className="flex-1"
                  id="adLink"
                />
                <Button
                  type="button"
                  onClick={() => {
                    const linkEl = document.getElementById("adLink") as HTMLInputElement;
                    if (linkEl && linkEl.value) {
                      addSuccessfulAd("link", linkEl.value);
                      linkEl.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* List of added successful ads */}
          <div className="space-y-2 mt-4">
            {form.watch("successfulAds")?.map((ad, index) => (
              <Card key={`successful-ad-${index}`} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeSuccessfulAd(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {ad.type === "image" && <span>🖼️ Image</span>}
                      {ad.type === "video" && <span>🎥 Video</span>}
                      {ad.type === "link" && (
                        <span className="flex items-center gap-1">
                          <Link className="h-4 w-4" /> {ad.url}
                        </span>
                      )}
                    </div>
                    <Textarea
                      placeholder="Add description or notes about this ad"
                      value={ad.description}
                      onChange={(e) => {
                        const updatedAds = [...(form.getValues("successfulAds") || [])];
                        updatedAds[index].description = e.target.value;
                        form.setValue("successfulAds", updatedAds);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Competitor Ads */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Competitor Ads</h3>
          <p className="text-sm text-muted-foreground">
            Share examples of competitor ads for reference
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => addCompetitorAd("link")}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Link
            </Button>
          </div>

          {/* List of added competitor ads */}
          <div className="space-y-2 mt-4">
            {form.watch("competitorAds")?.map((ad, index) => (
              <Card key={`competitor-ad-${index}`} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeCompetitorAd(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="URL to competitor ad"
                      value={ad.url}
                      onChange={(e) => {
                        const updatedAds = [...(form.getValues("competitorAds") || [])];
                        updatedAds[index].url = e.target.value;
                        form.setValue("competitorAds", updatedAds);
                      }}
                    />
                    <Textarea
                      placeholder="What do you like or dislike about this ad?"
                      value={ad.description}
                      onChange={(e) => {
                        const updatedAds = [...(form.getValues("competitorAds") || [])];
                        updatedAds[index].description = e.target.value;
                        form.setValue("competitorAds", updatedAds);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Inspiration */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Inspiration</h3>
          <p className="text-sm text-muted-foreground">
            Share ads from any industry that inspire you
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => addInspirationAd("link")}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Link
            </Button>
          </div>

          {/* List of added inspiration ads */}
          <div className="space-y-2 mt-4">
            {form.watch("inspirationAds")?.map((ad, index) => (
              <Card key={`inspiration-ad-${index}`} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeInspirationAd(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="URL to inspirational ad"
                      value={ad.url}
                      onChange={(e) => {
                        const updatedAds = [...(form.getValues("inspirationAds") || [])];
                        updatedAds[index].url = e.target.value;
                        form.setValue("inspirationAds", updatedAds);
                      }}
                    />
                    <Textarea
                      placeholder="What elements do you like about this ad?"
                      value={ad.description}
                      onChange={(e) => {
                        const updatedAds = [...(form.getValues("inspirationAds") || [])];
                        updatedAds[index].description = e.target.value;
                        form.setValue("inspirationAds", updatedAds);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Style Preferences */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Creative Style Preferences</h3>
          
          <FormField
            control={form.control}
            name="adStylePreference"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Preferred Ad Style</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3"
                  >
                    {[
                      { value: "formal", label: "Formal & Professional" },
                      { value: "casual", label: "Casual & Friendly" },
                      { value: "humorous", label: "Humorous" },
                      { value: "emotional", label: "Emotional" },
                      { value: "technical", label: "Technical & Detailed" },
                      { value: "minimalist", label: "Minimalist" },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`style-${option.value}`} />
                        <Label htmlFor={`style-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="copyLengthPreference"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Preferred Copy Length</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-1"
                  >
                    {[
                      { value: "short", label: "Short & Concise" },
                      { value: "medium", label: "Medium Length" },
                      { value: "long", label: "Detailed & Comprehensive" },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`length-${option.value}`} />
                        <Label htmlFor={`length-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Notes */}
        <FormField
          control={form.control}
          name="additionalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information about your creative preferences..."
                  {...field}
                />
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