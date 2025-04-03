import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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

const inputStyles = "bg-slate-900/50 border-slate-700/50 focus:border-indigo-500/50 text-white placeholder:text-slate-500";
const selectTriggerStyles = "bg-slate-900/50 border-slate-700/50 text-white";
const selectContentStyles = "bg-slate-900 border border-slate-700/50 text-white";
const checkboxStyles = "border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600";

export function DemoRequestForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      retailers: [],
      solutions: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await apiRequest("POST", "/api/demo-request", values);
      toast({
        title: "Demo Request Submitted",
        description: "We'll be in touch with you shortly.",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit demo request. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <motion.h2 
          className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Request a Demo
        </motion.h2>
        
        <motion.p 
          className="text-slate-300 mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Fill out the form below and we'll be in touch soon to schedule your personalized demo.
        </motion.p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">First Name*</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Last Name*</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
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
                    <FormLabel className="text-slate-300">Work Email*</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
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
                    <FormLabel className="text-slate-300">Company Name*</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Job Role*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={selectContentStyles}>
                        {jobRoles.map((role) => (
                          <SelectItem key={role} value={role} className="text-slate-200 focus:bg-indigo-500/20 focus:text-white">
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
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
                    <FormLabel className="text-slate-300">Country*</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputStyles} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyAdSpend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Monthly Ad Spend*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={selectTriggerStyles}>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={selectContentStyles}>
                        {adSpendRanges.map((range) => (
                          <SelectItem key={range} value={range} className="text-slate-200 focus:bg-indigo-500/20 focus:text-white">
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="retailers"
              render={() => (
                <FormItem>
                  <FormLabel className="text-slate-300">Which retailers do you sell on?*</FormLabel>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
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
                                  className={checkboxStyles}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-slate-300">{retailer}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="solutions"
              render={() => (
                <FormItem>
                  <FormLabel className="text-slate-300">Solutions you're interested in*</FormLabel>
                  <div className="grid sm:grid-cols-2 gap-4 mt-2">
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
                                  className={checkboxStyles}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-slate-300">{solution}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <AnimatedButton type="submit" gradient="primary" className="w-full">
              Request Demo
              <ArrowRight className="h-4 w-4 ml-1" />
            </AnimatedButton>

            <p className="text-sm text-slate-400 text-center">
              By submitting this form, you agree to our Privacy Policy and Terms of Service.
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}