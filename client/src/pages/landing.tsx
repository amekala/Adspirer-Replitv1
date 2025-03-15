import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          AdsConnect
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

      <main className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Simplify Your{" "}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Amazon Ads API
            </span>{" "}
            Integration
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            AdsConnect handles all the authentication complexity behind the scenes,
            allowing you to securely connect your advertising accounts with a
            single click.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth">Start Connecting</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 bg-card rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Simple Integration</h3>
            <p className="text-muted-foreground">
              Connect your Amazon Advertising account with a single click, no
              technical expertise required.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Secure Storage</h3>
            <p className="text-muted-foreground">
              Your authentication tokens are stored securely and refreshed
              automatically when needed.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg">
            <h3 className="text-xl font-semibold mb-3">Developer Friendly</h3>
            <p className="text-muted-foreground">
              Generate and manage API keys to access connected accounts
              programmatically.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
