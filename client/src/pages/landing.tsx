import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, MessageSquare, Zap, Key, BarChart3, Sparkles, Headset } from "lucide-react";
import { DemoRequestForm } from "@/components/demo-request-form";

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Adspirer
        </h1>
        <div className="flex gap-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : user ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4">
        <div className="py-24 text-center">
          <h2 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Chat With Your{" "}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Ad Data
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Turn complex advertising APIs into a conversation. Connect your ad accounts and start chatting with your campaigns through AI-powered insights.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline">
              See It In Action
            </Button>
          </div>

          <div className="mt-16 max-w-2xl mx-auto bg-card rounded-lg shadow-lg border p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-left text-muted-foreground">"How are my campaigns performing this week?"</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <Sparkles className="h-6 w-6 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Campaign Performance Analysis:</p>
                  <p className="text-muted-foreground">Your top campaign "Summer Sale" has seen a 28% increase in ROAS. Consider increasing budget allocation by 20% for optimal performance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-24">
          <div className="p-6 bg-card rounded-lg border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Natural Conversations</h3>
            <p className="text-muted-foreground">
              Chat with your campaigns in plain English. No more complex dashboards or spreadsheets.
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">One-Click Connect</h3>
            <p className="text-muted-foreground">
              Seamlessly connect to Amazon, Meta, and Google Ads with instant authentication.
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Developer Friendly</h3>
            <p className="text-muted-foreground">
              Focus on building features, not managing authentication. Get API keys instantly.
            </p>
          </div>

          <div className="p-6 bg-card rounded-lg border">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Real-Time Insights</h3>
            <p className="text-muted-foreground">
              Get instant answers about campaign performance and optimization opportunities.
            </p>
          </div>
        </div>

        <div className="py-24">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Your Accounts</h3>
              <p className="text-muted-foreground">One-click authentication with your ad platforms</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Get Your API Keys</h3>
              <p className="text-muted-foreground">Instant access to secure API credentials</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Start Chatting</h3>
              <p className="text-muted-foreground">Chat with your campaigns through Claude</p>
            </div>
          </div>
        </div>

        <div className="py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Retail Media Strategy?
            </h2>
            <p className="text-xl text-muted-foreground">
              Get in touch with our team to schedule a personalized demo and see how Adspirer can help you achieve your retail media goals.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2">
              <DemoRequestForm />
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Why Request a Demo?</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li>• See our AI-powered platform in action with your actual campaigns</li>
                  <li>• Learn how our solutions can increase your ROAS by up to 30%</li>
                  <li>• Discover optimization opportunities specific to your retail channels</li>
                  <li>• Get expert insights from our retail media specialists</li>
                </ul>
              </div>

              <div className="bg-primary/5 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Already a Customer?</h3>
                <p className="text-muted-foreground mb-4">
                  If you're an existing customer and need assistance, our customer success team is here to help.
                </p>
                <Button variant="outline" className="w-full">
                  <Headset className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}