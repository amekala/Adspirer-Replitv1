import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SiAmazon, SiGoogleads, SiMeta, SiPinterest, SiTiktok, SiSnapchat } from "react-icons/si";

// Connect platforms form schema
const connectPlatformsSchema = z.object({
  amazon: z.boolean().default(false),
  google: z.boolean().default(false),
  facebook: z.boolean().default(false),
  instagram: z.boolean().default(false),
  tiktok: z.boolean().default(false),
  pinterest: z.boolean().default(false),
  snapchat: z.boolean().default(false),
  platformPreferences: z.object({
    mainPlatforms: z.array(z.string()).default([]),
    secondaryPlatforms: z.array(z.string()).default([]),
  }).default({
    mainPlatforms: [],
    secondaryPlatforms: [],
  }),
});

// Form data type based on schema
export type ConnectPlatformsFormData = z.infer<typeof connectPlatformsSchema>;

// Initial data for the form
const defaultValues: ConnectPlatformsFormData = {
  amazon: false,
  google: false,
  facebook: false,
  instagram: false,
  tiktok: false,
  pinterest: false,
  snapchat: false,
  platformPreferences: {
    mainPlatforms: [],
    secondaryPlatforms: [],
  },
};

interface ConnectPlatformsFormProps {
  initialData?: Partial<ConnectPlatformsFormData>;
  onSubmit: (data: ConnectPlatformsFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function ConnectPlatformsForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: ConnectPlatformsFormProps) {
  // Form definition
  const form = useForm<ConnectPlatformsFormData>({
    resolver: zodResolver(connectPlatformsSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  // Handle Amazon Connect
  const handleAmazonConnect = () => {
    // This would typically redirect to Amazon auth flow
    window.open("/api/amazon/oauth-url", "_blank");
  };

  // Handle Google Connect
  const handleGoogleConnect = () => {
    // This would typically redirect to Google auth flow
    window.open("/api/google/oauth-url", "_blank");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Amazon */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SiAmazon className="h-8 w-8 text-[#FF9900]" />
                <div>
                  <CardTitle>Amazon Ads</CardTitle>
                  <CardDescription>
                    Connect your Amazon Advertising account
                  </CardDescription>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="amazon"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleAmazonConnect();
                          }
                          field.onChange(checked);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Connect your Amazon Ads account to sync campaign data and manage your advertising performance.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              onClick={handleAmazonConnect}
            >
              Connect Amazon Ads
            </Button>
          </CardContent>
        </Card>

        {/* Google */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SiGoogleads className="h-8 w-8 text-[#4285F4]" />
                <div>
                  <CardTitle>Google Ads</CardTitle>
                  <CardDescription>
                    Connect your Google Ads account
                  </CardDescription>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="google"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleGoogleConnect();
                          }
                          field.onChange(checked);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Connect your Google Ads account to sync campaign data and manage your advertising performance.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              onClick={handleGoogleConnect}
            >
              Connect Google Ads
            </Button>
          </CardContent>
        </Card>

        {/* Coming Soon Platforms */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>More Platforms Coming Soon</CardTitle>
            <CardDescription>
              We're working on adding support for these platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2 opacity-70">
                <SiMeta className="h-6 w-6" />
                <span>Facebook & Instagram</span>
              </div>
              <div className="flex items-center space-x-2 opacity-70">
                <SiTiktok className="h-6 w-6" />
                <span>TikTok</span>
              </div>
              <div className="flex items-center space-x-2 opacity-70">
                <SiPinterest className="h-6 w-6" />
                <span>Pinterest</span>
              </div>
              <div className="flex items-center space-x-2 opacity-70">
                <SiSnapchat className="h-6 w-6" />
                <span>Snapchat</span>
              </div>
            </div>
          </CardContent>
        </Card>

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