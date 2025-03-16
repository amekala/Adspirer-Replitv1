import { Layout } from "@/components/layout";
import { AmazonConnect } from "@/components/amazon-connect";
import { ApiKeys } from "@/components/api-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiAmazon, SiMeta, SiWalmart, SiInstacart, SiGoogleads } from "react-icons/si";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <Layout>
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Amazon - Active */}
                <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <SiAmazon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Amazon Ads</p>
                    <AmazonConnect />
                  </div>
                </div>

                {/* Meta - Coming Soon */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <SiMeta className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Meta Ads</p>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Facebook & Instagram</p>
                  </div>
                </div>

                {/* Walmart - Coming Soon */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <SiWalmart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Walmart Connect</p>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Walmart DSP</p>
                  </div>
                </div>

                {/* Instacart - Coming Soon */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <SiInstacart className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Instacart Ads</p>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Retail Media</p>
                  </div>
                </div>

                {/* Google Ads - Coming Soon */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <SiGoogleads className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Google Ads</p>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Performance Max</p>
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