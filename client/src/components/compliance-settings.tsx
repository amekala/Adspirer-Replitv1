import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  Shield, 
  Download, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ComplianceSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dataHandling");
  const [complianceSettings, setComplianceSettings] = useState({
    dataRetentionPolicy: "1year",
    automaticDeletion: true,
    anonymizeUserData: false,
    cookieConsent: "required",
    dataProcessingAgreement: true,
    privacyPolicyAccepted: true,
    dataSharing: {
      analytics: true,
      marketing: false,
      thirdParty: false
    },
    ccpaCompliance: true,
    gdprCompliance: true,
    dataExports: {
      enabled: true,
      format: "json"
    }
  });

  // Handle radio group changes
  const handleRadioChange = (field: string, value: string) => {
    setComplianceSettings({
      ...complianceSettings,
      [field]: value
    });
  };

  // Handle switch changes
  const handleSwitchChange = (field: string, value: boolean) => {
    // Handle nested fields
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setComplianceSettings({
        ...complianceSettings,
        [parent]: {
          ...(complianceSettings[parent as keyof typeof complianceSettings] as Record<string, unknown>),
          [child]: value
        }
      });
    } else {
      setComplianceSettings({
        ...complianceSettings,
        [field]: value
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setComplianceSettings({
        ...complianceSettings,
        [parent]: {
          ...(complianceSettings[parent as keyof typeof complianceSettings] as Record<string, unknown>),
          [child]: value
        }
      });
    } else {
      setComplianceSettings({
        ...complianceSettings,
        [field]: value
      });
    }
  };

  // Save compliance settings
  const updateComplianceMutation = useMutation({
    mutationFn: async (data: any) => {
      // In production, this would be a real API call
      // const response = await apiRequest("PUT", "/api/compliance", data);
      // return response.json();
      
      // Mock success with a delay
      return new Promise(resolve => setTimeout(() => resolve(data), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Compliance settings updated",
        description: "Your privacy and compliance settings have been saved"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Request data export
  const requestExportMutation = useMutation({
    mutationFn: async () => {
      // In production, this would be a real API call
      // const response = await apiRequest("POST", "/api/data/export");
      // return response.json();
      
      // Mock success with a delay
      return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1500));
    },
    onSuccess: () => {
      toast({
        title: "Export requested",
        description: "Your data export will be prepared and emailed to you shortly"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Request data deletion
  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      // Make a real API call to delete onboarding data
      const response = await fetch("/api/user/reset-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete data");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data deleted successfully",
        description: "Your onboarding data has been reset while preserving your platform connections"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateComplianceMutation.mutate(complianceSettings);
  };

  const handleExportRequest = () => {
    requestExportMutation.mutate();
  };

  const handleDeletionRequest = () => {
    // In a real app, this would likely show a confirmation dialog first
    requestDeletionMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Compliance & Privacy</h2>
        <p className="text-muted-foreground">
          Manage your data handling, privacy settings, and compliance options
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dataHandling">Data Handling</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="dataRights">Data Rights</TabsTrigger>
        </TabsList>

        {/* Data Handling Tab */}
        <TabsContent value="dataHandling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="dataRetentionPolicy">Data Retention Period</Label>
                    <Select
                      value={complianceSettings.dataRetentionPolicy}
                      onValueChange={(value) => handleSelectChange("dataRetentionPolicy", value)}
                    >
                      <SelectTrigger id="dataRetentionPolicy">
                        <SelectValue placeholder="Select retention period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30days">30 Days</SelectItem>
                        <SelectItem value="90days">90 Days</SelectItem>
                        <SelectItem value="1year">1 Year</SelectItem>
                        <SelectItem value="2years">2 Years</SelectItem>
                        <SelectItem value="indefinite">Indefinite</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      How long we keep your campaign data and analytics
                    </p>
                  </div>
                  
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Data Deletion</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically delete data after the retention period expires
                      </p>
                    </div>
                    <Switch
                      checked={complianceSettings.automaticDeletion}
                      onCheckedChange={(checked) => handleSwitchChange("automaticDeletion", checked)}
                    />
                  </div>
                  
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Anonymize User Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Strip personally identifiable information from analytics
                      </p>
                    </div>
                    <Switch
                      checked={complianceSettings.anonymizeUserData}
                      onCheckedChange={(checked) => handleSwitchChange("anonymizeUserData", checked)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateComplianceMutation.isPending}
                  >
                    {updateComplianceMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consent Management</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Cookie Consent Type</Label>
                    <RadioGroup 
                      value={complianceSettings.cookieConsent}
                      onValueChange={(value) => handleRadioChange("cookieConsent", value)}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="required" id="required" />
                        <Label htmlFor="required">Required Only</Label>
                        <span className="text-xs text-muted-foreground ml-2">(Essential cookies only)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="opt-in" id="opt-in" />
                        <Label htmlFor="opt-in">Opt-in</Label>
                        <span className="text-xs text-muted-foreground ml-2">(User must explicitly consent)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="opt-out" id="opt-out" />
                        <Label htmlFor="opt-out">Opt-out</Label>
                        <span className="text-xs text-muted-foreground ml-2">(Consent assumed by default)</span>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label>Data Sharing Consent</Label>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium">Analytics Services</span>
                          <p className="text-xs text-muted-foreground">
                            Share data with analytics to improve performance
                          </p>
                        </div>
                        <Switch
                          checked={complianceSettings.dataSharing.analytics}
                          onCheckedChange={(checked) => handleSwitchChange("dataSharing.analytics", checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium">Marketing Services</span>
                          <p className="text-xs text-muted-foreground">
                            Share data for marketing and retargeting
                          </p>
                        </div>
                        <Switch
                          checked={complianceSettings.dataSharing.marketing}
                          onCheckedChange={(checked) => handleSwitchChange("dataSharing.marketing", checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-sm font-medium">Third-Party Integrations</span>
                          <p className="text-xs text-muted-foreground">
                            Share data with connected third-party services
                          </p>
                        </div>
                        <Switch
                          checked={complianceSettings.dataSharing.thirdParty}
                          onCheckedChange={(checked) => handleSwitchChange("dataSharing.thirdParty", checked)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>GDPR Compliance</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable features required for EU GDPR compliance
                      </p>
                    </div>
                    <Switch
                      checked={complianceSettings.gdprCompliance}
                      onCheckedChange={(checked) => handleSwitchChange("gdprCompliance", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>CCPA Compliance</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable features required for California Consumer Privacy Act
                      </p>
                    </div>
                    <Switch
                      checked={complianceSettings.ccpaCompliance}
                      onCheckedChange={(checked) => handleSwitchChange("ccpaCompliance", checked)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateComplianceMutation.isPending}
                  >
                    {updateComplianceMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Rights Tab */}
        <TabsContent value="dataRights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Export & Deletion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Privacy Rights</AlertTitle>
                  <AlertDescription>
                    You have the right to export or delete your data at any time. Data export requests will be processed within 30 days.
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 p-4 border rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Export Your Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Request a copy of all your data in a machine-readable format
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Export Format</Label>
                        <Select
                          value={complianceSettings.dataExports.format}
                          onValueChange={(value) => handleSelectChange("dataExports.format", value)}
                          disabled={!complianceSettings.dataExports.enabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="xml">XML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleExportRequest}
                        disabled={requestExportMutation.isPending}
                      >
                        {requestExportMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Request Data Export
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                    <h3 className="text-lg font-medium mb-2 text-destructive">Reset Onboarding Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Delete your onboarding information while preserving platform connections
                    </p>
                    
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                          This will delete your business profile, brand identity, product information, 
                          creative examples, and performance context settings. Your account, platform connections,
                          and campaign data will be preserved.
                        </AlertDescription>
                      </Alert>
                      
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={handleDeletionRequest}
                        disabled={requestDeletionMutation.isPending}
                      >
                        {requestDeletionMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Reset Onboarding Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 