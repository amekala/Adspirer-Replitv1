import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandIdentityForm, BrandIdentityFormData } from "@/components/forms/brand-identity-form";

// Define the shape of the brand identity data
interface BrandIdentityData {
  brandName: string;
  brandDescription: string;
  brandVoice: string[];
  targetAudience: string[];
  brandValues: string[];
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export function BrandIdentitySettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch brand identity data
  const { data: brandData, isLoading } = useQuery<BrandIdentityData>({
    queryKey: ["/api/brand/identity"],
    retry: false,
  });
  
  // Submit mutation
  const mutation = useMutation({
    mutationFn: (data: BrandIdentityFormData) => {
      return apiRequest("/api/brand/identity", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand/identity"] });
      toast({
        title: "Brand identity saved",
        description: "Your brand identity has been updated successfully",
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

  const handleSubmit = (data: BrandIdentityFormData) => {
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
          <Save className="mr-2 h-4 w-4" /> Edit Brand Identity
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brand Identity</CardTitle>
          <CardDescription>Define your brand's look, feel, and voice</CardDescription>
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
        <CardTitle>Brand Identity</CardTitle>
        <CardDescription>
          Define your brand's look, feel, and voice to help ensure content consistency
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <BrandIdentityForm
            defaultValues={brandData}
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
            showHeader={false}
            renderFormActions={renderFormActions}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{brandData?.brandName || "Brand Name Not Set"}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {brandData?.brandDescription || "No brand description available."}
                </p>
                
                <div className="space-y-4">
                  {brandData?.brandVoice?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Brand Voice</h4>
                      <div className="flex flex-wrap gap-2">
                        {brandData.brandVoice.map((tag, i) => (
                          <span key={i} className="inline-flex items-center text-xs rounded-full px-2.5 py-1 bg-secondary text-secondary-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {brandData?.targetAudience?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Target Audience</h4>
                      <div className="flex flex-wrap gap-2">
                        {brandData.targetAudience.map((tag, i) => (
                          <span key={i} className="inline-flex items-center text-xs rounded-full px-2.5 py-1 bg-secondary text-secondary-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {brandData?.brandValues?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Brand Values</h4>
                      <div className="flex flex-wrap gap-2">
                        {brandData.brandValues.map((tag, i) => (
                          <span key={i} className="inline-flex items-center text-xs rounded-full px-2.5 py-1 bg-secondary text-secondary-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Brand Colors</h4>
                  <div className="flex items-center gap-4">
                    {brandData?.primaryColor && (
                      <div className="flex flex-col items-center">
                        <div 
                          className="h-10 w-10 rounded-md border shadow-sm" 
                          style={{ backgroundColor: brandData.primaryColor }}
                        />
                        <span className="text-xs mt-1">Primary</span>
                      </div>
                    )}
                    
                    {brandData?.secondaryColor && (
                      <div className="flex flex-col items-center">
                        <div 
                          className="h-10 w-10 rounded-md border shadow-sm" 
                          style={{ backgroundColor: brandData.secondaryColor }}
                        />
                        <span className="text-xs mt-1">Secondary</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {brandData?.logoUrl && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Brand Logo</h4>
                    <div className="p-4 bg-secondary/20 rounded-md flex items-center justify-center">
                      <img 
                        src={brandData.logoUrl} 
                        alt="Brand Logo" 
                        className="max-h-24 max-w-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSIjOTk5OTk5Ij5Mb2dvPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
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