import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">About Adspirer</h1>
          
          <div className="prose prose-gray dark:prose-invert">
            <p className="text-xl text-muted-foreground mb-8">
              Adspirer is revolutionizing how brands and agencies manage their retail media advertising 
              through AI-powered conversation interfaces and seamless platform integrations.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-8">
              We're on a mission to simplify retail media advertising by making complex data accessible 
              and actionable through natural conversations. Our platform empowers advertisers to make 
              better decisions faster, without getting lost in complicated dashboards and spreadsheets.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">What Sets Us Apart</h2>
            <ul className="space-y-4 text-muted-foreground mb-8">
              <li>• AI-Powered Conversations: Interact with your campaign data naturally</li>
              <li>• Multi-Platform Integration: Connect once, manage everywhere</li>
              <li>• Real-Time Optimization: Get actionable insights instantly</li>
              <li>• Enterprise-Grade Security: Your data's safety is our priority</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Our Technology</h2>
            <p className="text-muted-foreground mb-8">
              Built on cutting-edge AI and natural language processing technology, Adspirer seamlessly 
              integrates with major retail media platforms including Amazon, Walmart, and Target. Our 
              platform processes millions of data points in real-time to provide actionable insights 
              and optimization recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
