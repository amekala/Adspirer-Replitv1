import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductsServicesForm, ProductsServicesFormData } from "@/components/forms/products-services-form";
import { Badge } from "@/components/ui/badge";

// Define the shape of the products data
interface ProductData {
  name: string;
  description: string;
  price?: string;
  category?: string;
}

interface ProductsServicesData {
  productTypes: string[];
  topSellingProducts: ProductData[];
  competitiveAdvantage: string[];
  targetMarkets: string[];
  pricingStrategy?: string;
}

export function ProductsServicesSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch products & services data
  const { data: productsData, isLoading } = useQuery<ProductsServicesData>({
    queryKey: ["/api/products-services"],
    retry: 1,
  });
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: ProductsServicesFormData) => {
      return apiRequest("/api/products-services", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products-services"] });
      toast({
        title: "Products & Services saved",
        description: "Your product and service information has been updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProductsServicesFormData) => {
    mutation.mutate(data);
  };
  
  // Custom form actions for settings context
  const renderFormActions = () => (
    <div className="flex justify-end space-x-2">
      {isEditing ? (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </>
      ) : (
        <Button 
          type="button"
          onClick={() => setIsEditing(true)}
        >
          <Save className="mr-2 h-4 w-4" /> Edit Products & Services
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Products & Services</CardTitle>
          <CardDescription>Manage your product catalog and service offerings</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products & Services</CardTitle>
        <CardDescription>
          Manage your product catalog and service offerings to optimize your advertising
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <ProductsServicesForm
            defaultValues={productsData}
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
            showHeader={false}
            renderFormActions={renderFormActions}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Types */}
              <div>
                <h3 className="text-base font-medium mb-2">Product Types</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {productsData?.productTypes?.length > 0 ? (
                    productsData.productTypes.map((type: string, i: number) => (
                      <Badge key={i} variant="secondary">{type}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No product types defined</p>
                  )}
                </div>
                
                {/* Target Markets */}
                <h3 className="text-base font-medium mb-2 mt-6">Target Markets</h3>
                <div className="flex flex-wrap gap-2">
                  {productsData?.targetMarkets?.length > 0 ? (
                    productsData.targetMarkets.map((market: string, i: number) => (
                      <Badge key={i} variant="secondary">{market}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No target markets defined</p>
                  )}
                </div>
              </div>
              
              {/* Competitive Advantages */}
              <div>
                <h3 className="text-base font-medium mb-2">Competitive Advantages</h3>
                <div className="flex flex-wrap gap-2">
                  {productsData?.competitiveAdvantage?.length > 0 ? (
                    productsData.competitiveAdvantage.map((advantage: string, i: number) => (
                      <Badge key={i} variant="secondary">{advantage}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No competitive advantages defined</p>
                  )}
                </div>
                
                {/* Pricing Strategy */}
                {productsData?.pricingStrategy && (
                  <div className="mt-6">
                    <h3 className="text-base font-medium mb-2">Pricing Strategy</h3>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {(() => {
                        // Format pricing strategy for display
                        const strategy = productsData.pricingStrategy;
                        const formatMap: Record<string, string> = {
                          premium: "Premium Pricing",
                          competitive: "Competitive Pricing",
                          economy: "Economy/Value Pricing",
                          skimming: "Price Skimming",
                          penetration: "Penetration Pricing",
                          freemium: "Freemium Model",
                          subscription: "Subscription Based",
                          tiered: "Tiered Pricing",
                          dynamic: "Dynamic Pricing"
                        };
                        return formatMap[strategy] || strategy;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Top Products */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-base font-medium mb-4">Top Products & Services</h3>
              
              {productsData?.topSellingProducts?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productsData.topSellingProducts.map((product: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4 bg-card">
                      <div className="flex flex-col h-full">
                        <div>
                          <h4 className="font-medium text-sm">{product.name}</h4>
                          {product.category && (
                            <span className="text-xs text-muted-foreground">{product.category}</span>
                          )}
                        </div>
                        <p className="text-sm mt-2 flex-grow">{product.description}</p>
                        {product.price && (
                          <div className="mt-3 text-sm font-medium">
                            Price: {product.price}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products or services defined</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
      {!isEditing && (
        <CardFooter>
          {renderFormActions()}
        </CardFooter>
      )}
    </Card>
  );
}