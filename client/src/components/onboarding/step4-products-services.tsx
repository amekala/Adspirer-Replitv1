import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, PlusCircle, X, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductsServicesFormProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

// Type for product object
type Product = {
  name: string;
  description: string;
  price?: string;
  category?: string;
  id?: string; // Used to uniquely identify product entries
};

// Define form schema based on productsServices table
const productsServicesSchema = z.object({
  productTypes: z.array(z.string()).min(1, "At least one product type is required"),
  topSellingProducts: z.array(z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().min(1, "Product description is required"),
    price: z.string().optional(),
    category: z.string().optional(),
  })).min(1, "At least one product is required"),
  pricingStrategy: z.string().optional(),
  competitiveAdvantage: z.array(z.string()).min(1, "At least one competitive advantage is required"),
  targetMarkets: z.array(z.string()).min(1, "At least one target market is required"),
});

type ProductsServicesFormData = z.infer<typeof productsServicesSchema>;

export function ProductsServicesForm({ onNext, onPrevious, onSkip }: ProductsServicesFormProps) {
  const { toast } = useToast();
  
  const [productTypeInput, setProductTypeInput] = useState("");
  const [competitiveAdvantageInput, setCompetitiveAdvantageInput] = useState("");
  const [targetMarketInput, setTargetMarketInput] = useState("");
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product>({
    name: "",
    description: "",
    price: "",
    category: "",
    id: "",
  });
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  
  // Default form values
  const defaultValues: Partial<ProductsServicesFormData> = {
    productTypes: [],
    topSellingProducts: [],
    pricingStrategy: "",
    competitiveAdvantage: [],
    targetMarkets: [],
  };

  const form = useForm<ProductsServicesFormData>({
    resolver: zodResolver(productsServicesSchema),
    defaultValues,
  });

  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: ProductsServicesFormData) => {
      return apiRequest("/api/onboarding/products-services", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      toast({
        title: "Products and services saved",
        description: "Your product information has been saved successfully.",
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
  const onSubmit = (data: ProductsServicesFormData) => {
    mutation.mutate(data);
  };

  // Add a tag to a list
  const addTag = (type: 'productTypes' | 'competitiveAdvantage' | 'targetMarkets', value: string) => {
    if (!value.trim()) return;
    
    const fieldValue = form.getValues(type);
    
    // Only add if it doesn't already exist
    if (!fieldValue.includes(value.trim())) {
      form.setValue(type, [...fieldValue, value.trim()]);
    }
    
    // Clear input field
    switch (type) {
      case 'productTypes':
        setProductTypeInput("");
        break;
      case 'competitiveAdvantage':
        setCompetitiveAdvantageInput("");
        break;
      case 'targetMarkets':
        setTargetMarketInput("");
        break;
    }
  };

  // Remove a tag from a list
  const removeTag = (type: 'productTypes' | 'competitiveAdvantage' | 'targetMarkets', index: number) => {
    const fieldValue = form.getValues(type);
    fieldValue.splice(index, 1);
    form.setValue(type, [...fieldValue]);
  };
  
  // Add or update a product
  const handleProductSave = () => {
    if (!currentProduct.name || !currentProduct.description) {
      toast({
        title: "Missing information",
        description: "Product name and description are required.",
        variant: "destructive"
      });
      return;
    }
    
    const products = form.getValues("topSellingProducts") || [];
    
    if (isEditingProduct) {
      // Find and update the existing product
      const updatedProducts = products.map(product => 
        product.name === currentProduct.id ? {
          name: currentProduct.name,
          description: currentProduct.description,
          price: currentProduct.price,
          category: currentProduct.category,
        } : product
      );
      form.setValue("topSellingProducts", updatedProducts);
    } else {
      // Add new product
      form.setValue("topSellingProducts", [
        ...products, 
        {
          name: currentProduct.name,
          description: currentProduct.description,
          price: currentProduct.price,
          category: currentProduct.category,
        }
      ]);
    }
    
    // Reset form
    setProductFormVisible(false);
    setCurrentProduct({
      name: "",
      description: "",
      price: "",
      category: "",
      id: "",
    });
    setIsEditingProduct(false);
  };
  
  // Edit an existing product
  const handleProductEdit = (index: number) => {
    const products = form.getValues("topSellingProducts");
    const productToEdit = products[index];
    
    setCurrentProduct({
      ...productToEdit,
      id: productToEdit.name, // Store original name as ID for update reference
    });
    setIsEditingProduct(true);
    setProductFormVisible(true);
  };
  
  // Remove a product
  const handleProductRemove = (index: number) => {
    const products = form.getValues("topSellingProducts");
    products.splice(index, 1);
    form.setValue("topSellingProducts", [...products]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-green-800">Products & Services</h3>
        <p className="mt-1 text-sm text-green-700">
          Tell us about your products and services to help us create more effective ad campaigns.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Types */}
          <FormField
            control={form.control}
            name="productTypes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Types</FormLabel>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Physical Products, Digital Goods, Services..."
                    value={productTypeInput}
                    onChange={(e) => setProductTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('productTypes', productTypeInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('productTypes', productTypeInput)}
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
                        onClick={() => removeTag('productTypes', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  Categories of products or services you offer.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Top Selling Products */}
          <FormField
            control={form.control}
            name="topSellingProducts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top Products or Services</FormLabel>
                <FormDescription className="mb-2">
                  Add your best-selling products or most popular services.
                </FormDescription>
                
                {/* Products list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                  {field.value.map((product, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        {product.category && (
                          <CardDescription className="text-xs">{product.category}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                        {product.price && (
                          <p className="text-sm font-medium mt-1">Price: {product.price}</p>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end pt-0 space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleProductEdit(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleProductRemove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {/* Product form */}
                {productFormVisible ? (
                  <div className="border rounded-md p-4 bg-gray-50 mb-3">
                    <h4 className="font-medium text-sm mb-3">
                      {isEditingProduct ? "Edit Product" : "Add New Product"}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Name</label>
                        <Input 
                          value={currentProduct.name}
                          onChange={(e) => setCurrentProduct({...currentProduct, name: e.target.value})}
                          placeholder="Product name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea 
                          value={currentProduct.description}
                          onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value})}
                          placeholder="Brief description of the product"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Price (Optional)</label>
                          <Input 
                            value={currentProduct.price}
                            onChange={(e) => setCurrentProduct({...currentProduct, price: e.target.value})}
                            placeholder="e.g. $99.99, $10-50/month"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Category (Optional)</label>
                          <Input 
                            value={currentProduct.category}
                            onChange={(e) => setCurrentProduct({...currentProduct, category: e.target.value})}
                            placeholder="e.g. Electronics, Services"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setProductFormVisible(false);
                            setIsEditingProduct(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleProductSave}
                        >
                          {isEditingProduct ? "Update" : "Add"} Product
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setProductFormVisible(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Product or Service
                  </Button>
                )}
                
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
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing strategy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="premium">Premium Pricing</SelectItem>
                    <SelectItem value="competitive">Competitive Pricing</SelectItem>
                    <SelectItem value="economy">Economy/Budget Pricing</SelectItem>
                    <SelectItem value="value">Value-Based Pricing</SelectItem>
                    <SelectItem value="subscription">Subscription Model</SelectItem>
                    <SelectItem value="freemium">Freemium Model</SelectItem>
                    <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  How you position your products in terms of pricing.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Competitive Advantage */}
          <FormField
            control={form.control}
            name="competitiveAdvantage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competitive Advantages</FormLabel>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Quality, Price, Unique Features..."
                    value={competitiveAdvantageInput}
                    onChange={(e) => setCompetitiveAdvantageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('competitiveAdvantage', competitiveAdvantageInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('competitiveAdvantage', competitiveAdvantageInput)}
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
                        onClick={() => removeTag('competitiveAdvantage', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  What makes your products or services stand out from competitors.
                </FormDescription>
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
                <div className="flex space-x-2">
                  <Input 
                    placeholder="US Market, European Professionals..."
                    value={targetMarketInput}
                    onChange={(e) => setTargetMarketInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag('targetMarkets', targetMarketInput);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => addTag('targetMarkets', targetMarketInput)}
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
                        onClick={() => removeTag('targetMarkets', index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  Geographic or demographic markets you primarily target.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
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