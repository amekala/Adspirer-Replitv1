import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Plus, DollarSign, Tag, ShoppingCart, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Validation schema
export const productServicesSchema = z.object({
  productTypes: z.array(z.string()).min(1, "Add at least one product type"),
  topSellingProducts: z.array(z.object({
    name: z.string().min(2, "Product name must be at least 2 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.string().optional(),
    category: z.string().optional(),
  })).min(1, "Add at least one product"),
  competitiveAdvantage: z.array(z.string()).min(1, "Add at least one competitive advantage"),
  targetMarkets: z.array(z.string()).min(1, "Add at least one target market"),
  pricingStrategy: z.string().optional(),
});

// Type for form data
export type ProductsServicesFormData = z.infer<typeof productServicesSchema>;

// Props for the form component
export interface ProductsServicesFormProps {
  defaultValues?: Partial<ProductsServicesFormData>;
  onSubmit: (data: ProductsServicesFormData) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  showHeader?: boolean;
  renderFormActions?: (form: any) => React.ReactNode;
}

// Categories for products
const productCategories = [
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Home & Garden",
  "Beauty & Health",
  "Sports & Outdoors",
  "Toys & Games",
  "Books & Media",
  "Automotive",
  "Office Supplies",
  "Services",
  "Other"
];

// Pricing strategies
const pricingStrategies = [
  { value: "premium", label: "Premium Pricing" },
  { value: "competitive", label: "Competitive Pricing" },
  { value: "economy", label: "Economy/Value Pricing" },
  { value: "skimming", label: "Price Skimming" },
  { value: "penetration", label: "Penetration Pricing" },
  { value: "freemium", label: "Freemium Model" },
  { value: "subscription", label: "Subscription Based" },
  { value: "tiered", label: "Tiered Pricing" },
  { value: "dynamic", label: "Dynamic Pricing" }
];

// Empty state defaults
const emptyProduct = { name: "", description: "", price: "", category: "" };

export function ProductsServicesForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  showHeader = true,
  renderFormActions,
}: ProductsServicesFormProps) {
  const [productType, setProductType] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [targetMarket, setTargetMarket] = useState("");

  // Set up form with default values
  const form = useForm<ProductsServicesFormData>({
    resolver: zodResolver(productServicesSchema),
    defaultValues: {
      productTypes: defaultValues?.productTypes || [],
      topSellingProducts: defaultValues?.topSellingProducts || [{ ...emptyProduct }],
      competitiveAdvantage: defaultValues?.competitiveAdvantage || [],
      targetMarkets: defaultValues?.targetMarkets || [],
      pricingStrategy: defaultValues?.pricingStrategy || "",
    },
    mode: "onChange",
  });

  // Product Types Handling
  const addProductType = () => {
    if (!productType.trim()) return;
    const currentTypes = form.getValues("productTypes");
    if (!currentTypes.includes(productType.trim())) {
      form.setValue("productTypes", [...currentTypes, productType.trim()]);
      setProductType("");
    }
  };

  const removeProductType = (index: number) => {
    const currentTypes = form.getValues("productTypes");
    form.setValue(
      "productTypes",
      currentTypes.filter((_, i) => i !== index)
    );
  };

  // Top Products Handling
  const addProduct = () => {
    const currentProducts = form.getValues("topSellingProducts");
    form.setValue("topSellingProducts", [...currentProducts, { ...emptyProduct }]);
  };

  const removeProduct = (index: number) => {
    const currentProducts = form.getValues("topSellingProducts");
    if (currentProducts.length > 1) {
      form.setValue(
        "topSellingProducts",
        currentProducts.filter((_, i) => i !== index)
      );
    }
  };

  // Competitive Advantages Handling
  const addAdvantage = () => {
    if (!advantage.trim()) return;
    const currentAdvantages = form.getValues("competitiveAdvantage");
    if (!currentAdvantages.includes(advantage.trim())) {
      form.setValue("competitiveAdvantage", [...currentAdvantages, advantage.trim()]);
      setAdvantage("");
    }
  };

  const removeAdvantage = (index: number) => {
    const currentAdvantages = form.getValues("competitiveAdvantage");
    form.setValue(
      "competitiveAdvantage",
      currentAdvantages.filter((_, i) => i !== index)
    );
  };

  // Target Markets Handling
  const addTargetMarket = () => {
    if (!targetMarket.trim()) return;
    const currentMarkets = form.getValues("targetMarkets");
    if (!currentMarkets.includes(targetMarket.trim())) {
      form.setValue("targetMarkets", [...currentMarkets, targetMarket.trim()]);
      setTargetMarket("");
    }
  };

  const removeTargetMarket = (index: number) => {
    const currentMarkets = form.getValues("targetMarkets");
    form.setValue(
      "targetMarkets",
      currentMarkets.filter((_, i) => i !== index)
    );
  };

  // Render tag items for each array
  const renderTags = (items: string[], onRemove: (index: number) => void, icon?: React.ReactNode) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-secondary text-secondary-foreground gap-1"
        >
          {icon}
          {item}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1 hover:bg-secondary-foreground/20 rounded-full"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </span>
      ))}
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {showHeader && (
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-semibold">Products & Services</h2>
            <p className="text-muted-foreground">
              Tell us about your products, services, and what makes your business unique
            </p>
          </div>
        )}

        <div className="space-y-8">
          {/* Product Types Section */}
          <FormField
            control={form.control}
            name="productTypes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product/Service Types</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="Enter a product or service type"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addProductType();
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProductType}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <FormDescription>
                  What types of products or services do you offer?
                </FormDescription>
                {field.value.length > 0 && (
                  renderTags(field.value, removeProductType, <ShoppingCart className="h-3 w-3" />)
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Top Products/Services Section */}
          <FormField
            control={form.control}
            name="topSellingProducts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top Products/Services</FormLabel>
                <FormDescription className="mb-4">
                  Add your best-selling products or most popular services
                </FormDescription>
                
                <div className="space-y-4">
                  {form.watch("topSellingProducts").map((_, index) => (
                    <Card key={index} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">
                            Product/Service {index + 1}
                          </CardTitle>
                          {form.watch("topSellingProducts").length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => removeProduct(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`topSellingProducts.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Product/Service Name" />
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
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {productCategories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
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
                          name={`topSellingProducts.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  rows={2}
                                  placeholder="Brief description of the product/service and its main features" 
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
                              <FormLabel>Price Range (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="e.g. $10-20, $99/month, Starting at $499" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addProduct}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Another Product/Service
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Competitive Advantages Section */}
          <FormField
            control={form.control}
            name="competitiveAdvantage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competitive Advantages</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="What sets you apart from competitors?"
                      value={advantage}
                      onChange={(e) => setAdvantage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addAdvantage();
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdvantage}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <FormDescription>
                  What makes your products/services stand out in the market?
                </FormDescription>
                {field.value.length > 0 && (
                  renderTags(field.value, removeAdvantage, <TrendingUp className="h-3 w-3" />)
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Markets Section */}
          <FormField
            control={form.control}
            name="targetMarkets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Markets</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="Enter a target market or customer segment"
                      value={targetMarket}
                      onChange={(e) => setTargetMarket(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTargetMarket();
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTargetMarket}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <FormDescription>
                  Who are your ideal customers or target market segments?
                </FormDescription>
                {field.value.length > 0 && (
                  renderTags(field.value, removeTargetMarket, <Target className="h-3 w-3" />)
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pricing Strategy Section */}
          <FormField
            control={form.control}
            name="pricingStrategy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pricing Strategy</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your pricing strategy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pricingStrategies.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How do you approach pricing your products/services?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          {renderFormActions ? (
            renderFormActions(form)
          ) : (
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}