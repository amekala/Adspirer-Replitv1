import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionSettings } from "@/components/subscription-settings";
import { ProfileSettings } from "@/components/profile-settings";
import { BrandSettings } from "@/components/brand-settings";
import { ComplianceSettings } from "@/components/compliance-settings";
import { ApiKeys } from "@/components/api-keys";
import { AmazonConnect } from "@/components/amazon-connect";
import { GoogleConnect } from "@/components/google-connect";
import { 
  User, 
  Building, 
  CreditCard, 
  KeyRound, 
  Globe, 
  Shield 
} from "lucide-react";
import { SiAmazon, SiGoogleads } from "react-icons/si";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-6">
            <Card className="p-2">
              <div className="flex flex-col h-auto w-full bg-transparent space-y-1">
                <Button 
                  variant={activeTab === "profile" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("profile")}
                  className="justify-start w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button 
                  variant={activeTab === "brand" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("brand")}
                  className="justify-start w-full"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Brand
                </Button>
                <Button 
                  variant={activeTab === "subscription" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("subscription")}
                  className="justify-start w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </Button>
                <Button 
                  variant={activeTab === "connections" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("connections")}
                  className="justify-start w-full"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Connections
                </Button>
                <Button 
                  variant={activeTab === "api-keys" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("api-keys")}
                  className="justify-start w-full"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  API Keys
                </Button>
                <Button 
                  variant={activeTab === "compliance" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("compliance")}
                  className="justify-start w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance
                </Button>
              </div>
            </Card>
          </div>
          
          {/* Main Content */}
          <div>
            <Tabs value={activeTab} className="space-y-6">
              <TabsList className="hidden">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="brand">Brand</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="m-0 space-y-6">
                <Card className="p-6">
                  <ProfileSettings />
                </Card>
              </TabsContent>
              
              <TabsContent value="brand" className="m-0 space-y-6">
                <Card className="p-6">
                  <BrandSettings />
                </Card>
              </TabsContent>
              
              <TabsContent value="subscription" className="m-0 space-y-6">
                <Card className="p-6">
                  <SubscriptionSettings />
                </Card>
              </TabsContent>
              
              <TabsContent value="connections" className="m-0 space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight mb-6">Platform Connections</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Amazon */}
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
                        <SiAmazon className="h-5 w-5 sm:h-6 sm:w-6 text-[#FF9900]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">Amazon Ads</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <AmazonConnect />
                    </div>
                  </Card>
                  
                  {/* Google */}
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
                        <SiGoogleads className="h-5 w-5 sm:h-6 sm:w-6 text-[#4285F4]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">Google Ads</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <GoogleConnect />
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="api-keys" className="m-0 space-y-6">
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold tracking-tight mb-6">API Keys</h2>
                  <ApiKeys />
                </Card>
              </TabsContent>
              
              <TabsContent value="compliance" className="m-0 space-y-6">
                <Card className="p-6">
                  <ComplianceSettings />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}