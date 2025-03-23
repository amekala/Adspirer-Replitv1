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
              Adspirer is revolutionizing how brands approach retail media advertising. We believe that AI can transform complex campaign management into intuitive conversations, making retail media accessible to everyone.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-8">
              We're on a mission to revolutionize how brands approach retail media advertising. Our platform empowers marketers with intelligent insights and automated optimizations that were previously only available to those with technical expertise and large teams. With Adspirer, we're democratizing retail media excellence!
            </p>

            <div className="bg-primary/5 rounded-lg p-6 mb-8">
              <p className="text-sm text-muted-foreground">
                Adspirer is proudly owned by betsonagi, LLC — committed to building innovative solutions for retail media challenges.
              </p>
            </div>

            <h2 className="text-2xl font-semibold mt-12 mb-4">What We Value</h2>
            <ul className="space-y-2 text-muted-foreground mb-8">
              <li>• Innovation: We're constantly pushing the boundaries of what's possible with AI and retail media.</li>
              <li>• Simplicity: We believe powerful tools should be accessible and easy to use.</li>
              <li>• Results: We're obsessed with driving measurable performance for our clients.</li>
              <li>• Transparency: We believe in clear communication and honest metrics.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Our Story</h2>
            <p className="text-muted-foreground mb-8">
              Adspirer was born from a simple observation: retail media advertising was becoming increasingly complex, fragmented, and time-consuming. Our founder, having experienced these frustrations firsthand, envisioned a platform where marketers could simply have a conversation about their goals and let AI handle the technical details.
            </p>
            <p className="text-muted-foreground mb-8">
              Today, we're proud to help brands of all sizes optimize their retail media presence across major platforms, driving better results with less effort.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Why Choose Adspirer?</h2>
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="font-semibold mb-2">AI-Powered Intelligence</h3>
                <p className="text-muted-foreground">Our advanced AI understands retail media nuances and provides strategic recommendations that drive performance.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Conversational UX</h3>
                <p className="text-muted-foreground">No more complex dashboards or endless menus. Just tell us what you need, and we'll make it happen.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Cross-Platform Mastery</h3>
                <p className="text-muted-foreground">Manage all your retail media campaigns across Amazon, Walmart, Instacart, and more from one interface.</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Get In Touch</h2>
            <p className="text-muted-foreground mb-4">
              We'd love to hear from you! Whether you have questions about our platform, pricing, or just want to say hello, our team is here to help.
            </p>
            <Button asChild>
              <Link href="/">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}