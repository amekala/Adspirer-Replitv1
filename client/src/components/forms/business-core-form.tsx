import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Business core form schema - aligned with backend schema
const businessCoreSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  // Simplified validation to match backend changes
  companySize: z.string().optional(),
  marketplaces: z.array(z.string()).optional(),
  mainGoals: z.array(z.string()).optional(),
  monthlyAdSpend: z.string().optional(),
  website: z.string().optional().or(z.literal("")).or(z.null()),
  // Additional fields for UI purposes only (won't be sent to backend)
  businessDescription: z.string().optional(),
});

// Form data type based on schema
export type BusinessCoreFormData = z.infer<typeof businessCoreSchema>;

// Initial data for the form
const defaultValues: BusinessCoreFormData = {
  businessName: "",
  industry: "",
  companySize: "",
  marketplaces: [],
  mainGoals: [],
  monthlyAdSpend: "",
  website: "",
  businessDescription: "",
};

interface BusinessCoreFormProps {
  initialData?: Partial<BusinessCoreFormData>;
  onSubmit: (data: BusinessCoreFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function BusinessCoreForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: BusinessCoreFormProps) {
  // Form definition
  const form = useForm<BusinessCoreFormData>({
    resolver: zodResolver(businessCoreSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Retail, Technology, Healthcare" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what your business does and your unique selling proposition"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501+">501+ employees</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marketplaces"
          render={() => (
            <FormItem>
              <FormLabel>Marketplaces</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Amazon', 'Walmart', 'Target', 'Instacart', 'Kroger', 'Other'].map((marketplace) => (
                  <FormField
                    key={marketplace}
                    control={form.control}
                    name="marketplaces"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={marketplace}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(marketplace)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, marketplace])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== marketplace
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {marketplace}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mainGoals"
          render={() => (
            <FormItem>
              <FormLabel>Main Business Goals</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Increase Sales', 'Brand Awareness', 'Market Share', 'Customer Retention', 'New Product Launch', 'Other'].map((goal) => (
                  <FormField
                    key={goal}
                    control={form.control}
                    name="mainGoals"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={goal}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(goal)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, goal])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== goal
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {goal}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.yourbusiness.com" {...field} />
                </FormControl>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ad spend range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="< $1,000">Less than $1,000</SelectItem>
                    <SelectItem value="$1,000 - $5,000">$1,000 - $5,000</SelectItem>
                    <SelectItem value="$5,000 - $20,000">$5,000 - $20,000</SelectItem>
                    <SelectItem value="$20,000 - $50,000">$20,000 - $50,000</SelectItem>
                    <SelectItem value="$50,000+">$50,000+</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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