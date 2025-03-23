import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { 
  Loader2, 
  Sparkles, 
  Shield, 
  LightbulbIcon, 
  MessageSquare, 
  Bell, 
  LineChart 
} from 'lucide-react';


const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Value propositions for the carousel
const valuePropositions = [
  {
    title: "AI Chat Assistant for Campaign Insights",
    description: "Get deep insights into your campaign performance with our AI-powered chat assistant",
    icon: "Sparkles"
  },
  {
    title: "Personalized Strategy Recommendations",
    description: "Receive tailored recommendations to optimize your advertising strategy",
    icon: "LightbulbIcon"
  },
  {
    title: "Conversational Campaign Creation",
    description: "Create and manage campaigns through natural language conversations",
    icon: "MessageSquare"
  },
  {
    title: "Real-Time Performance Alerts",
    description: "Stay informed with instant notifications about your campaign performance",
    icon: "Bell"
  },
  {
    title: "Cross-Platform Data Storytelling",
    description: "Visualize insights across multiple advertising platforms in an easy-to-understand narrative",
    icon: "LineChart"
  }
];

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  
  // Auto-advance carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % valuePropositions.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Update desktop carousel position when slide changes
  useEffect(() => {
    if (carouselRef.current) {
      const slideWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: currentSlide * slideWidth,
        behavior: 'smooth'
      });
    }
    
    // Also update mobile carousel
    if (mobileCarouselRef.current) {
      const slideWidth = mobileCarouselRef.current.scrollWidth / valuePropositions.length;
      mobileCarouselRef.current.scrollTo({
        left: currentSlide * slideWidth,
        behavior: 'smooth'
      });
    }
  }, [currentSlide]);
  
  // Handle mobile carousel scroll
  useEffect(() => {
    const handleScroll = () => {
      if (mobileCarouselRef.current) {
        const scrollLeft = mobileCarouselRef.current.scrollLeft;
        const itemWidth = mobileCarouselRef.current.scrollWidth / valuePropositions.length;
        const newIndex = Math.round(scrollLeft / itemWidth);
        
        if (newIndex !== currentSlide) {
          setCurrentSlide(newIndex);
        }
      }
    };
    
    const mobileCarousel = mobileCarouselRef.current;
    if (mobileCarousel) {
      mobileCarousel.addEventListener('scroll', handleScroll);
      return () => mobileCarousel.removeEventListener('scroll', handleScroll);
    }
  }, [currentSlide, valuePropositions.length]);
  
  // Handle manual slide change
  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  const form = useForm({
    resolver: zodResolver(activeTab === "login" ? loginSchema : registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const onSubmit = async (data: any) => {
    try {
      const { email, password } = data;

      if (activeTab === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        if (data.password !== data.confirmPassword) {
          form.setError("confirmPassword", { message: "Passwords do not match" });
          return;
        }
        await registerMutation.mutateAsync({ email, password });
      }
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Adspirer
              </h1>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to manage your retail media campaigns
            </p>
          </div>
          
          {/* Mobile Only Carousel */}
          <div className="md:hidden mb-6 relative">
            <div 
              ref={mobileCarouselRef}
              className="overflow-x-scroll whitespace-nowrap scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {valuePropositions.map((prop, index) => {
                // Dynamically select the icon component
                let IconComponent;
                switch(prop.icon) {
                  case 'Sparkles': IconComponent = Sparkles; break;
                  case 'LightbulbIcon': IconComponent = LightbulbIcon; break;
                  case 'MessageSquare': IconComponent = MessageSquare; break;
                  case 'Bell': IconComponent = Bell; break;
                  case 'LineChart': IconComponent = LineChart; break;
                  default: IconComponent = Sparkles;
                }
                
                return (
                  <div 
                    key={index} 
                    className="inline-block w-[85vw] mr-4 whitespace-normal"
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    <div className="bg-background shadow rounded-xl p-4 flex items-start gap-3">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{prop.title}</h3>
                        <p className="text-xs text-muted-foreground">{prop.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicator Dots for Mobile */}
            <div className="flex justify-center mt-3 space-x-1.5">
              {valuePropositions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentSlide === index ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <Card className="p-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {activeTab === "register" && (
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending || registerMutation.isPending}
                  >
                    {(loginMutation.isPending || registerMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {activeTab === "login" ? "Sign In" : "Create Account"}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </Card>
        </div>
      </div>

      <div className="hidden md:flex flex-col justify-center p-8 bg-gradient-to-b from-muted/80 to-muted">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Transform Your Retail Media Strategy
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Connect your advertising accounts securely and start optimizing your campaigns with AI-powered insights.
          </p>
          
          {/* Carousel Container */}
          <div className="mb-8 relative">
            <div 
              ref={carouselRef}
              className="overflow-x-hidden whitespace-nowrap scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {valuePropositions.map((prop, index) => {
                // Dynamically select the icon component
                let IconComponent;
                switch(prop.icon) {
                  case 'Sparkles': IconComponent = Sparkles; break;
                  case 'LightbulbIcon': IconComponent = LightbulbIcon; break;
                  case 'MessageSquare': IconComponent = MessageSquare; break;
                  case 'Bell': IconComponent = Bell; break;
                  case 'LineChart': IconComponent = LineChart; break;
                  default: IconComponent = Sparkles;
                }
                
                return (
                  <div 
                    key={index} 
                    className="inline-block w-full whitespace-normal px-4"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="bg-background/90 backdrop-blur-sm shadow-lg rounded-xl p-6 h-64 flex flex-col">
                      <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{prop.title}</h3>
                      <p className="text-muted-foreground">{prop.description}</p>
                      
                      <div className="mt-auto text-center">
                        <Button 
                          variant="link" 
                          className="text-primary"
                          onClick={() => {
                            if (!user) {
                              form.setValue("email", "demo@adspirer.com");
                              form.setValue("password", "password123");
                              setActiveTab("login");
                            }
                          }}
                        >
                          Try it now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicator Dots */}
            <div className="flex justify-center mt-4 space-x-2">
              {valuePropositions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    currentSlide === index ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* Security Feature */}
          <div className="flex items-start gap-4 bg-background/70 backdrop-blur-sm p-4 rounded-xl shadow-sm">
            <div className="bg-primary/10 rounded-lg p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Secure & Compliant</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security with multi-platform API authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}