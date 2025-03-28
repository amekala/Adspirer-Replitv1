import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, User, Paintbrush, Link, CreditCard, Key, Shield } from "lucide-react";
import { AmazonConnect } from "@/components/amazon-connect";
import { GoogleConnect } from "@/components/google-connect";
import { ApiKeys } from "@/components/api-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiAmazon, SiMeta, SiWalmart, SiInstacart, SiGoogleads } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { ProfileSettings } from "@/components/profile-settings";
import { BrandSettings } from "@/components/brand-settings";
import { SubscriptionSettings } from "@/components/subscription-settings";
import { ComplianceSettings } from "@/components/compliance-settings";

interface ChatSettingsProps {
  onBack: () => void;
}

export function ChatSettings({ onBack }: ChatSettingsProps) {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b">
          <TabsList className="w-full justify-start border-b-0 rounded-none h-auto p-0">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="brand" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <Paintbrush className="h-4 w-4" />
              <span>Brand</span>
            </TabsTrigger>
            <TabsTrigger 
              value="connections" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <Link className="h-4 w-4" />
              <span>Connections</span>
            </TabsTrigger>
            <TabsTrigger 
              value="subscription" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <CreditCard className="h-4 w-4" />
              <span>Subscription</span>
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <Key className="h-4 w-4" />
              <span>API Access</span>
            </TabsTrigger>
            <TabsTrigger 
              value="compliance" 
              className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:border-b-2 border-primary"
            >
              <Shield className="h-4 w-4" />
              <span>Compliance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="profile" className="mt-0 h-full">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="brand" className="mt-0 h-full">
            <BrandSettings />
          </TabsContent>

          <TabsContent value="connections" className="mt-0 h-full">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Platform Connections</h2>
              <p className="text-muted-foreground">
                Connect your advertising accounts to access campaign data.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amazon - Active */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
                        <SiAmazon className="h-5 w-5 text-[#FF9900]" />
                      </div>
                      <CardTitle className="text-base">Amazon Ads</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AmazonConnect />
                  </CardContent>
                </Card>

                {/* Google Ads - Active */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
                        <SiGoogleads className="h-5 w-5 text-[#4285F4]" />
                      </div>
                      <CardTitle className="text-base">Google Ads</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GoogleConnect />
                  </CardContent>
                </Card>

                {/* Meta - Coming Soon */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#0866FF]/10 flex items-center justify-center">
                        <SiMeta className="h-5 w-5 text-[#0866FF]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Meta Ads</CardTitle>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Facebook & Instagram support will be available soon.
                    </p>
                  </CardContent>
                </Card>

                {/* Walmart - Coming Soon */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
                        <SiWalmart className="h-5 w-5 text-[#0071DC]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Walmart Connect</CardTitle>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Walmart DSP support will be available soon.
                    </p>
                  </CardContent>
                </Card>

                {/* Instacart - Coming Soon */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#43B02A]/10 flex items-center justify-center">
                        <SiInstacart className="h-5 w-5 text-[#43B02A]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Instacart Ads</CardTitle>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Instacart Retail Media support will be available soon.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="mt-0 h-full">
            <SubscriptionSettings />
          </TabsContent>

          <TabsContent value="api" className="mt-0 h-full">
            <div className="space-y-4">
              <ApiKeys />
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="mt-0 h-full">
            <ComplianceSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
} 