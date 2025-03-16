import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Zap, Key, BarChart3, Sparkles, Headset, Menu, ArrowLeft, ArrowRight, Quote, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { DemoRequestForm } from "@/components/demo-request-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Testimonial = {
  text: string;
  author: string;
  role: string;
  company: string;
};

const testimonials: Testimonial[] = [
  {
    text: "Adspirer has completely transformed how we manage our Amazon campaigns. The AI-powered insights and automated optimizations save us hours every week.",
    author: "Sarah Johnson",
    role: "E-commerce Director",
    company: "BrightHome Goods"
  },
  {
    text: "The integration between platforms is seamless. Being able to visualize our ad performance across marketplaces in one dashboard is game-changing.",
    author: "Marcus Chen",
    role: "Digital Marketing Lead",
    company: "FitLife Brands"
  },
  {
    text: "We've increased our ROAS by 32% since implementing Adspirer. The AI-powered recommendations have identified opportunities we would have missed.",
    author: "Priya Patel",
    role: "CMO",
    company: "NatureEssentials"
  },
  {
    text: "Setting up the platform took less than 10 minutes, and the documentation was clear even for someone non-technical like me. Now our whole team can access campaign insights without specialized training.",
    author: "James Rodriguez",
    role: "Owner",
    company: "Rodriguez Family Imports"
  },
  {
    text: "The intuitive interface makes it easy to manage campaigns. I can analyze trends, adjust budgets, and get actionable insights without navigating complex dashboards.",
    author: "Michael Thompson",
    role: "Digital Strategist",
    company: "Outdoor Adventure Brands"
  }
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-card rounded-lg border p-6 h-full flex flex-col">
      <Quote className="h-8 w-8 text-primary/20 mb-4" />
      <p className="text-muted-foreground flex-1 mb-6">{testimonial.text}</p>
      <div>
        <p className="font-semibold">{testimonial.author}</p>
        <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const demoFormRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const scrollToDemo = () => {
    demoFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const closeSheet = () => setIsOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Adspirer
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <button 
                onClick={scrollToDemo} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact Us
              </button>
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

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                    Home
                  </Link>
                  <Link href="/about" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                    About Us
                  </Link>
                  <Link href="/privacy" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                  <button 
                    onClick={() => {
                      scrollToDemo();
                      closeSheet();
                    }} 
                    className="text-left text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact Us
                  </button>
                  {user ? (
                    <Link href="/dashboard" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/auth" onClick={closeSheet} className="text-muted-foreground hover:text-foreground transition-colors">
                      Get Started
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4">
        <div className="py-12 md:py-24 text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Optimize Your{" "}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Ad Performance
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-3xl mx-auto">
            Turn complex advertising data into actionable insights. Connect your ad accounts and optimize your campaigns with AI-powered recommendations.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="w-full md:w-auto">
              <Link href="/auth">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToDemo} className="w-full md:w-auto">
              Request Demo
            </Button>
          </div>

          <div className="mt-12 md:mt-16 max-w-2xl mx-auto bg-card rounded-lg shadow-lg border p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-lg p-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-left text-muted-foreground">Campaign Performance Analysis</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <Sparkles className="h-6 w-6 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium">AI-Powered Insights:</p>
                  <p className="text-muted-foreground">Your top campaign "Summer Sale" has seen a 28% increase in ROAS. Consider increasing budget allocation by 20% for optimal performance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 py-12 md:py-24">
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

        <div className="py-12 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how businesses are transforming their retail media strategy with Adspirer
            </p>
          </div>

          <div className="relative">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {testimonials.slice(0, 3).map((testimonial, index) => (
                <TestimonialCard key={index} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </div>


        <div className="py-12 md:py-24">
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
              <h3 className="font-semibold mb-2">Start Optimizing</h3>
              <p className="text-muted-foreground">Get AI-powered insights for your campaigns</p>
            </div>
          </div>
        </div>

        <div ref={demoFormRef} className="py-12 md:py-24 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Retail Media Strategy?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Get in touch with our team to schedule a personalized demo and see how Adspirer can help you achieve your retail media goals.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">
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