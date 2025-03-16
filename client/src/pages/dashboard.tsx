import { Layout } from "@/components/layout";
import { AmazonConnect } from "@/components/amazon-connect";
import { ApiKeys } from "@/components/api-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiAmazon, SiMeta, SiWalmart, SiInstacart, SiGoogleads } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { GoogleConnect } from "@/components/google-connect";

export default function Dashboard() {
  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard</h1>

        <div className="space-y-6 sm:space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Amazon - Active */}
                <div className="flex flex-col min-h-[200px] bg-card border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
                      <SiAmazon className="h-5 w-5 sm:h-6 sm:w-6 text-[#FF9900]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base truncate">Amazon Ads</p>
                    </div>
                  </div>
                  <div className="flex-1 p-3 pt-0">
                    <AmazonConnect />
                  </div>
                </div>

                {/* Google Ads - Active */}
                <div className="flex flex-col min-h-[200px] bg-card border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
                      <SiGoogleads className="h-5 w-5 sm:h-6 sm:w-6 text-[#4285F4]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base truncate">Google Ads</p>
                    </div>
                  </div>
                  <div className="flex-1 p-3 pt-0">
                    <GoogleConnect />
                  </div>
                </div>

                {/* Meta - Coming Soon */}
                <div className="flex flex-col min-h-[200px] bg-muted/30 border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#0866FF]/10 flex items-center justify-center">
                      <SiMeta className="h-5 w-5 sm:h-6 sm:w-6 text-[#0866FF]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base">Meta Ads</p>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Facebook & Instagram</p>
                    </div>
                  </div>
                </div>

                {/* Walmart - Coming Soon */}
                <div className="flex flex-col min-h-[200px] bg-muted/30 border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
                      <SiWalmart className="h-5 w-5 sm:h-6 sm:w-6 text-[#0071DC]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base">Walmart Connect</p>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Walmart DSP</p>
                    </div>
                  </div>
                </div>

                {/* Instacart - Coming Soon */}
                <div className="flex flex-col min-h-[200px] bg-muted/30 border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg bg-[#43B02A]/10 flex items-center justify-center">
                      <SiInstacart className="h-5 w-5 sm:h-6 sm:w-6 text-[#43B02A]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm sm:text-base">Instacart Ads</p>
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Retail Media</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <ApiKeys />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}