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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-2 shadow-lg">
              <div className="flex flex-col h-auto w-full bg-transparent space-y-1">
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("profile")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "profile" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("brand")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "brand" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Brand
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("subscription")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "subscription" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("connections")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "connections" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Connections
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("api-keys")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "api-keys" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  API Keys
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setActiveTab("compliance")}
                  className={`justify-start w-full hover:bg-white/10 ${activeTab === "compliance" ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white" : ""}`}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance
                </Button>
              </div>
            </div>
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
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                  <ProfileSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="brand" className="m-0 space-y-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                  <BrandSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="subscription" className="m-0 space-y-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                  <SubscriptionSettings />
                </div>
              </TabsContent>
              
              <TabsContent value="connections" className="m-0 space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Platform Connections</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Amazon */}
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-gradient-to-r from-[#FF9900]/20 to-[#FF9900]/10 flex items-center justify-center">
                        <SiAmazon className="h-5 w-5 sm:h-6 sm:w-6 text-[#FF9900]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">Amazon Ads</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <AmazonConnect />
                    </div>
                  </div>
                  
                  {/* Google */}
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-lg">
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-gradient-to-r from-[#4285F4]/20 to-[#4285F4]/10 flex items-center justify-center">
                        <SiGoogleads className="h-5 w-5 sm:h-6 sm:w-6 text-[#4285F4]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm sm:text-base truncate">Google Ads</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <GoogleConnect />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="api-keys" className="m-0 space-y-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                  <h2 className="text-2xl font-semibold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">API Keys</h2>
                  <ApiKeys />
                </div>
              </TabsContent>
              
              <TabsContent value="compliance" className="m-0 space-y-6">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-lg">
                  <ComplianceSettings />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}