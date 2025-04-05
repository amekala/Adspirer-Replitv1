import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define schema for a single product
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Please provide a more detailed description"),
  price: z.string().optional(),
  category: z.string().optional(),
});

// Products/services form schema
const productsServicesSchema = z.object({
  productTypes: z.array(z.string()).min(1, "Select at least one product type"),
  topSellingProducts: z.array(productSchema).optional(),
  competitiveAdvantage: z.array(z.string()).min(1, "Select at least one competitive advantage"),
  targetMarkets: z.array(z.string()).min(1, "Select at least one target market"),
  pricingStrategy: z.string().optional(),
});

// Form data type based on schema
export type ProductsServicesFormData = z.infer<typeof productsServicesSchema>;

// Initial data for the form
const defaultValues: ProductsServicesFormData = {
  productTypes: [],
  topSellingProducts: [],
  competitiveAdvantage: [],
  targetMarkets: [],
  pricingStrategy: "",
};

// Product type options
const productTypeOptions = [
  "Physical Products",
  "Digital Products",
  "Services",
  "Subscriptions",
  "Software",
  "Consulting",
  "Courses",
  "Memberships",
  "Content",
  "Events",
  "Custom Solutions",
];

// Target market options
const targetMarketOptions = [
  "Local Market",
  "National Market",
  "International Market",
  "B2B",
  "B2C",
  "Enterprise",
  "Small Businesses",
  "Education",
  "Healthcare",
  "Retail",
  "Government",
  "Non-profits",
];

// Competitive advantage options
const competitiveAdvantageOptions = [
  "Price",
  "Quality",
  "Innovation",
  "Customer Service",
  "Specialization",
  "Convenience",
  "Speed",
  "Brand Recognition",
  "Selection/Variety",
  "Experience",
  "Technology",
  "Sustainability",
];

// Pricing strategy options
const pricingStrategyOptions = [
  "Premium",
  "Value-based",
  "Competitive",
  "Penetration",
  "Skimming",
  "Freemium",
  "Subscription",
  "Tiered",
  "Dynamic",
  "Cost-plus",
];

interface ProductsServicesFormProps {
  initialData?: Partial<ProductsServicesFormData>;
  onSubmit: (data: ProductsServicesFormData) => void;
  isSubmitting?: boolean;
  renderFormActions?: () => React.ReactNode;
}

export function ProductsServicesForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  renderFormActions
}: ProductsServicesFormProps) {
  // Form definition
  const form = useForm<ProductsServicesFormData>({
    resolver: zodResolver(productsServicesSchema),
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

  // Handle adding a new product
  const addProduct = () => {
    const currentProducts = form.getValues("topSellingProducts") || [];
    form.setValue("topSellingProducts", [
      ...currentProducts,
      { name: "", description: "", price: "", category: "" },
    ]);
  };

  // Handle removing a product
  const removeProduct = (index: number) => {
    const currentProducts = form.getValues("topSellingProducts") || [];
    form.setValue(
      "topSellingProducts",
      currentProducts.filter((_, i) => i !== index)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Product Types */}
        <FormField
          control={form.control}
          name="productTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product/Service Types</FormLabel>
              <FormDescription>
                Select the types of products or services you offer
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {productTypeOptions.map((option) => {
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
                              removeOption("productTypes", option);
                            } else {
                              addOption("productTypes", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("productTypes", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom product type"
                      className="max-w-xs"
                      id="customProductType"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customProductType") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("productTypes", inputEl.value.trim());
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

        {/* Target Markets */}
        <FormField
          control={form.control}
          name="targetMarkets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Markets</FormLabel>
              <FormDescription>
                Select the markets or customer segments you target
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {targetMarketOptions.map((option) => {
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
                              removeOption("targetMarkets", option);
                            } else {
                              addOption("targetMarkets", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("targetMarkets", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom target market"
                      className="max-w-xs"
                      id="customTargetMarket"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customTargetMarket") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("targetMarkets", inputEl.value.trim());
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

        {/* Competitive Advantages */}
        <FormField
          control={form.control}
          name="competitiveAdvantage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competitive Advantages</FormLabel>
              <FormDescription>
                What makes your products or services stand out from competitors?
              </FormDescription>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {competitiveAdvantageOptions.map((option) => {
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
                              removeOption("competitiveAdvantage", option);
                            } else {
                              addOption("competitiveAdvantage", option);
                            }
                          }}
                        >
                          {option}
                          {isSelected && (
                            <X className="ml-1 h-3 w-3" onClick={(e) => {
                              e.stopPropagation();
                              removeOption("competitiveAdvantage", option);
                            }} />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add custom advantage"
                      className="max-w-xs"
                      id="customAdvantage"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const inputEl = document.getElementById("customAdvantage") as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          addOption("competitiveAdvantage", inputEl.value.trim());
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

        {/* Pricing Strategy */}
        <FormField
          control={form.control}
          name="pricingStrategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Strategy</FormLabel>
              <FormDescription>
                How do you position your pricing in the market?
              </FormDescription>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your pricing strategy" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pricingStrategyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Top Selling Products */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Top Products or Services</h3>
              <p className="text-sm text-muted-foreground">
                Add details about your key offerings
              </p>
            </div>
            <Button
              type="button"
              onClick={addProduct}
              size="sm"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          </div>
          
          <div className="space-y-4">
            {form.watch("topSellingProducts")?.map((_, index) => (
              <Card key={`product-${index}`}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Product {index + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`topSellingProducts.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`topSellingProducts.${index}.category`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Electronics, Apparel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`topSellingProducts.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe features, benefits, and unique selling points"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`topSellingProducts.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Range</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., $10-$20, $99/month" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
            
            {(!form.watch("topSellingProducts") || form.watch("topSellingProducts").length === 0) && (
              <div className="text-center p-6 border border-dashed rounded-md">
                <p className="text-muted-foreground">
                  Click "Add Product" to include details about your top offerings
                </p>
              </div>
            )}
          </div>
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