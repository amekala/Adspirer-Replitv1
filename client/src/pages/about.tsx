import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SiAmazon, SiWalmart, SiTarget, SiGoogle } from "react-icons/si";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Revolutionizing Retail Media
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Adspirer is transforming how brands and agencies manage their retail media advertising 
              through AI-powered conversation interfaces and seamless platform integrations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We're on a mission to simplify retail media advertising by making complex data accessible 
                and actionable through natural conversations. Our platform empowers advertisers to make 
                better decisions faster, without getting lost in complicated dashboards and spreadsheets.
              </p>
              <Button asChild size="lg">
                <Link href="/auth">Get Started</Link>
              </Button>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-blue-600/10 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center text-center">
                  <SiAmazon className="h-12 w-12 text-primary mb-4" />
                  <p className="font-semibold">Amazon Ads</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <SiWalmart className="h-12 w-12 text-primary mb-4" />
                  <p className="font-semibold">Walmart Connect</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <SiTarget className="h-12 w-12 text-primary mb-4" />
                  <p className="font-semibold">Target Roundel</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <SiGoogle className="h-12 w-12 text-primary mb-4" />
                  <p className="font-semibold">Google Ads</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12">What Sets Us Apart</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-lg p-8 border">
                <h3 className="text-xl font-semibold mb-4">AI-Powered Intelligence</h3>
                <p className="text-muted-foreground">
                  Our advanced AI analyzes your campaign data in real-time, providing actionable insights 
                  and optimization recommendations through natural conversation.
                </p>
              </div>
              <div className="bg-card rounded-lg p-8 border">
                <h3 className="text-xl font-semibold mb-4">Unified Platform</h3>
                <p className="text-muted-foreground">
                  Manage all your retail media campaigns from a single interface. Connect once and access 
                  everything from performance metrics to budget allocation.
                </p>
              </div>
              <div className="bg-card rounded-lg p-8 border">
                <h3 className="text-xl font-semibold mb-4">Seamless Integration</h3>
                <p className="text-muted-foreground">
                  Quick and secure authentication with major retail media platforms. Start optimizing your 
                  campaigns within minutes, not days.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold mb-8">Our Technology</h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-lg text-muted-foreground mb-8">
                Built on cutting-edge AI and natural language processing technology, Adspirer seamlessly 
                integrates with major retail media platforms. Our system processes millions of data points 
                in real-time to provide actionable insights and optimization recommendations.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-primary/5 rounded-lg p-6">
                  <div className="text-4xl font-bold text-primary mb-2">30%</div>
                  <p className="text-sm text-muted-foreground">Average ROAS Improvement</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-6">
                  <div className="text-4xl font-bold text-primary mb-2">10x</div>
                  <p className="text-sm text-muted-foreground">Faster Optimization</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-6">
                  <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                  <p className="text-sm text-muted-foreground">Campaign Monitoring</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-6">
                  <div className="text-4xl font-bold text-primary mb-2">100%</div>
                  <p className="text-sm text-muted-foreground">API Integration</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Transform your retail media strategy with Adspirer's AI-powered platform.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/">Request Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}