import { Layout } from "@/components/layout";
import { AmazonConnect } from "@/components/amazon-connect";
import { ApiKeys } from "@/components/api-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SiMeta, SiWalmart, SiInstacart, SiGoogle } from "react-icons/si";

export default function Dashboard() {
  return (
    <Layout>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid gap-8">
          {/* Platform Integrations */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Amazon Integration - Active */}
            <Card>
              <CardHeader>
                <CardTitle>Amazon Advertising Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <AmazonConnect />
              </CardContent>
            </Card>

            {/* Meta Integration - Coming Soon */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiMeta className="h-5 w-5" />
                  Meta Ads
                  <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Connect your Meta Ads account to manage Facebook and Instagram campaigns.</p>
                <Button disabled variant="outline" className="w-full">Connect Meta Ads</Button>
              </CardContent>
            </Card>

            {/* Walmart Integration - Coming Soon */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiWalmart className="h-5 w-5" />
                  Walmart Connect
                  <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Integrate with Walmart Connect to optimize your retail media campaigns.</p>
                <Button disabled variant="outline" className="w-full">Connect Walmart</Button>
              </CardContent>
            </Card>

            {/* Instacart Integration - Coming Soon */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiInstacart className="h-5 w-5" />
                  Instacart Ads
                  <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Manage your Instacart advertising campaigns through our platform.</p>
                <Button disabled variant="outline" className="w-full">Connect Instacart</Button>
              </CardContent>
            </Card>

            {/* Google Ads Integration - Coming Soon */}
            <Card className="opacity-75">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiGoogle className="h-5 w-5" />
                  Google Ads
                  <span className="ml-auto text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">Coming Soon</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Connect your Google Ads account for comprehensive campaign management.</p>
                <Button disabled variant="outline" className="w-full">Connect Google Ads</Button>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* API Keys Section */}
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