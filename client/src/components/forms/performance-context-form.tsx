import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

// Performance context form schema
const performanceContextSchema = z.object({
  // Financial Goals
  targetCPA: z.string().optional(),
  targetROAS: z.string().optional(),
  monthlyAdSpend: z.string().optional(),
  
  // Performance Metrics
  keyPerformanceMetric: z.enum(["conversions", "revenue", "trafficQuality", "brandAwareness", "engagementRate"]).optional(),
  secondaryMetrics: z.array(z.enum(["clickThroughRate", "conversionRate", "costPerClick", "impressions", "reach"])).optional(),
  
  // Required field for API - will be populated from keyPerformanceMetric
  keyMetrics: z.array(z.string()).optional(),
  
  // Campaign Objectives
  primaryObjective: z.enum(["sales", "leads", "awareness", "traffic", "appInstalls"]).optional(),
  
  // Risk Tolerance
  budgetFlexibility: z.enum(["rigid", "moderate", "flexible"]).optional(),
  experimentationWillingness: z.number().min(1).max(10).optional(),
  
  // Optimization Preferences
  automationLevel: z.enum(["manual", "semiAutomatic", "fullyAutomatic"]).optional(),
  bidAdjustmentPreferences: z.object({
    devices: z.boolean().optional(),
    locations: z.boolean().optional(),
    demographics: z.boolean().optional(),
    dayparting: z.boolean().optional(),
  }).optional(),
  
  // Additional Context
  seasonalConsiderations: z.string().optional(),
  competitiveLandscape: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// Form data type based on schema
export type PerformanceContextFormData = z.infer<typeof performanceContextSchema>;

// Initial data for the form
const defaultValues: PerformanceContextFormData = {
  targetCPA: "",
  targetROAS: "",
  monthlyAdSpend: "",
  keyPerformanceMetric: undefined,
  secondaryMetrics: [],
  keyMetrics: [], // Required for API submission
  primaryObjective: undefined,
  budgetFlexibility: undefined,
  experimentationWillingness: 5,
  automationLevel: undefined,
  bidAdjustmentPreferences: {
    devices: false,
    locations: false,
    demographics: false,
    dayparting: false,
  },
  seasonalConsiderations: "",
  competitiveLandscape: "",
  additionalNotes: "",
};

interface PerformanceContextFormProps {
  initialData?: Partial<PerformanceContextFormData>;
  onSubmit: (data: PerformanceContextFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function PerformanceContextForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: PerformanceContextFormProps) {
  // Form definition
  const form = useForm<PerformanceContextFormData>({
    resolver: zodResolver(performanceContextSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Financial Goals Section */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Goals</CardTitle>
            <CardDescription>
              Set your target costs and budget allocation for advertising
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="targetCPA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target CPA</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="50.00" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Cost Per Acquisition target
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetROAS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target ROAS</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input className="pr-8" placeholder="300" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Return On Ad Spend target
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyAdSpend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Ad Spend</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input className="pl-7" placeholder="5000.00" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Expected monthly budget
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics Section */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Select the metrics that matter most to your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="keyPerformanceMetric"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Primary KPI</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
                    >
                      {[
                        { value: "conversions", label: "Conversions", description: "Customer actions like purchases or sign-ups" },
                        { value: "revenue", label: "Revenue", description: "Direct sales and monetary return" },
                        { value: "trafficQuality", label: "Traffic Quality", description: "Relevant visitors and low bounce rate" },
                        { value: "brandAwareness", label: "Brand Awareness", description: "Reach and brand recognition metrics" },
                        { value: "engagementRate", label: "Engagement Rate", description: "Interaction with your content and ads" },
                      ].map((option) => (
                        <div key={option.value} className="flex items-start space-x-2">
                          <RadioGroupItem value={option.value} id={`kpi-${option.value}`} className="mt-1" />
                          <div>
                            <Label htmlFor={`kpi-${option.value}`}>{option.label}</Label>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
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
              name="secondaryMetrics"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Secondary Metrics</FormLabel>
                  <FormDescription>
                    Select any additional metrics you track regularly
                  </FormDescription>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {[
                      { value: "clickThroughRate", label: "Click-Through Rate (CTR)" },
                      { value: "conversionRate", label: "Conversion Rate" },
                      { value: "costPerClick", label: "Cost Per Click (CPC)" },
                      { value: "impressions", label: "Impressions" },
                      { value: "reach", label: "Reach" },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`metric-${option.value}`}
                          value={option.value}
                          checked={(field.value || []).includes(option.value as any)}
                          onChange={(e) => {
                            const currentValues = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...currentValues, option.value]);
                            } else {
                              field.onChange(
                                currentValues.filter((value) => value !== option.value)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor={`metric-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Campaign Objectives */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Objectives</CardTitle>
            <CardDescription>
              Define what you want to achieve with your advertising
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="primaryObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Campaign Objective</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your main objective" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sales">Sales and Conversions</SelectItem>
                      <SelectItem value="leads">Lead Generation</SelectItem>
                      <SelectItem value="awareness">Brand Awareness</SelectItem>
                      <SelectItem value="traffic">Website Traffic</SelectItem>
                      <SelectItem value="appInstalls">App Installs</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This helps us optimize your campaigns for the right outcomes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Risk Tolerance */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Tolerance</CardTitle>
            <CardDescription>
              Tell us how conservative or aggressive you want to be with your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="budgetFlexibility"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Budget Flexibility</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {[
                        { value: "rigid", label: "Rigid (fixed budget, no overages)" },
                        { value: "moderate", label: "Moderate (some flexibility, 10-20% overage acceptable)" },
                        { value: "flexible", label: "Flexible (spend more when performance is good)" },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`budget-${option.value}`} />
                          <Label htmlFor={`budget-${option.value}`}>{option.label}</Label>
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
              name="experimentationWillingness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experimentation Willingness (1-10)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        defaultValue={[field.value || 5]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Conservative</span>
                        <span>Balanced</span>
                        <span>Aggressive</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    How willing are you to test new strategies, platforms, or creative approaches?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Optimization Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Preferences</CardTitle>
            <CardDescription>
              Tell us how you prefer to manage and optimize your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="automationLevel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Automation Level</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {[
                        { value: "manual", label: "Manual (I prefer to control all aspects)" },
                        { value: "semiAutomatic", label: "Semi-Automatic (Automated bidding with manual oversight)" },
                        { value: "fullyAutomatic", label: "Fully Automatic (Trust algorithms for optimization)" },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`automation-${option.value}`} />
                          <Label htmlFor={`automation-${option.value}`}>{option.label}</Label>
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
              name="bidAdjustmentPreferences"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Bid Adjustment Preferences</FormLabel>
                  <FormDescription>
                    Select which factors you want to adjust bids for
                  </FormDescription>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="devices" className="flex-1">Devices (mobile, desktop, tablet)</Label>
                      <Switch
                        id="devices"
                        checked={field.value?.devices || false}
                        onCheckedChange={(checked) => {
                          form.setValue("bidAdjustmentPreferences.devices", checked);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="locations" className="flex-1">Locations (cities, regions)</Label>
                      <Switch
                        id="locations"
                        checked={field.value?.locations || false}
                        onCheckedChange={(checked) => {
                          form.setValue("bidAdjustmentPreferences.locations", checked);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="demographics" className="flex-1">Demographics (age, gender)</Label>
                      <Switch
                        id="demographics"
                        checked={field.value?.demographics || false}
                        onCheckedChange={(checked) => {
                          form.setValue("bidAdjustmentPreferences.demographics", checked);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dayparting" className="flex-1">Dayparting (time of day, day of week)</Label>
                      <Switch
                        id="dayparting"
                        checked={field.value?.dayparting || false}
                        onCheckedChange={(checked) => {
                          form.setValue("bidAdjustmentPreferences.dayparting", checked);
                        }}
                      />
                    </div>
                  </div>
                  
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Additional Context */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Context</CardTitle>
            <CardDescription>
              Additional information to help customize your advertising strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="seasonalConsiderations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seasonal Considerations</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any seasonal trends, peak periods, or important dates for your business..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="competitiveLandscape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competitive Landscape</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your main competitors and their advertising approach..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any other details that might help with optimizing your advertising performance..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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