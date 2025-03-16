import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  country: z.string().min(1, "Country is required"),
  monthlyAdSpend: z.string().min(1, "Monthly ad spend is required"),
  retailers: z.array(z.string()).min(1, "Select at least one retailer"),
  solutions: z.array(z.string()).min(1, "Select at least one solution"),
});

const retailerOptions = [
  "Amazon", "Walmart", "Target", "Instacart", "Kroger", "CVS", "Walgreens", "Costco", "Other"
];

const solutionOptions = [
  "Campaign Management",
  "Analytics & Reporting",
  "Cross-platform Optimization",
  "Budget Allocation",
  "Keyword Intelligence",
  "Creative Optimization",
  "Competitor Analysis"
];

const jobRoles = [
  "Marketing Manager",
  "Digital Marketing Specialist",
  "E-commerce Manager",
  "Brand Manager",
  "Media Buyer",
  "Business Owner",
  "Other"
];

const adSpendRanges = [
  "Less than $10,000",
  "$10,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $500,000",
  "More than $500,000"
];

export function DemoRequestForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      retailers: [],
      solutions: [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Demo Request Submitted",
      description: "We'll be in touch with you shortly.",
    });
    form.reset();
  }

  return (
    <div className="bg-card border rounded-lg p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Request a Demo</h2>
        <p className="text-muted-foreground mb-8">
          Fill out the form below and we'll be in touch soon to schedule your personalized demo.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Email*</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name*</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Role*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country*</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Monthly Ad Spend*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adSpendRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="retailers"
              render={() => (
                <FormItem>
                  <FormLabel>Which retailers do you sell on?*</FormLabel>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {retailerOptions.map((retailer) => (
                      <FormField
                        key={retailer}
                        control={form.control}
                        name="retailers"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={retailer}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(retailer)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, retailer])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== retailer)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{retailer}</FormLabel>
                            </FormItem>
                          );
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
              name="solutions"
              render={() => (
                <FormItem>
                  <FormLabel>Solutions you're interested in*</FormLabel>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {solutionOptions.map((solution) => (
                      <FormField
                        key={solution}
                        control={form.control}
                        name="solutions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={solution}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(solution)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, solution])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== solution)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{solution}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Request Demo
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              By submitting this form, you agree to our Privacy Policy and Terms of Service.
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
