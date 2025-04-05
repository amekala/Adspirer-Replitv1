import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Business core form schema
const businessCoreSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  businessDescription: z.string().min(20, "Please provide at least 20 characters"),
  websiteUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  employeeCount: z.string().optional(),
  yearFounded: z.string().optional(),
});

// Form data type based on schema
export type BusinessCoreFormData = z.infer<typeof businessCoreSchema>;

// Initial data for the form
const defaultValues: BusinessCoreFormData = {
  businessName: "",
  industry: "",
  businessDescription: "",
  websiteUrl: "",
  employeeCount: "",
  yearFounded: "",
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="websiteUrl"
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
            name="employeeCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Employees</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1-10, 11-50, 51-200" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="yearFounded"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year Founded</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 2020" {...field} />
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