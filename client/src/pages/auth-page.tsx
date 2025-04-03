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
  LightbulbIcon, 
  MessageSquare, 
  Bell, 
  LineChart 
} from 'lucide-react';

// Define types for the form with confirmPassword
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = LoginFormValues & { confirmPassword: string };

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

  const form = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(activeTab === "login" ? loginSchema : registerSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(activeTab === "register" ? { confirmPassword: "" } : {})
    },
  });

  useEffect(() => {
    // Reset the form with appropriate defaults when the tab changes
    form.reset({
      email: "",
      password: "",
      ...(activeTab === "register" ? { confirmPassword: "" } : {})
    });
  }, [activeTab, form]);

  useEffect(() => {
    if (user) {
      setLocation("/chat");
    }
  }, [user, setLocation]);

  const onSubmit = async (data: LoginFormValues | RegisterFormValues) => {
    try {
      const { email, password } = data;

      if (activeTab === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        const registerData = data as RegisterFormValues;
        if (registerData.password !== registerData.confirmPassword) {
          form.setError("confirmPassword" as any, { message: "Passwords do not match" });
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
    <div className="min-h-screen grid md:grid-cols-2 relative">
      {/* Visual separator between columns */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 hidden md:block transform -translate-x-1/2 z-10"></div>
      
      <div className="flex flex-col items-center justify-center p-8 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8 shadow-xl">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-background/40 backdrop-blur-sm">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white">Login</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white">Register</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            className="bg-background/40 backdrop-blur-sm border-white/20 focus:border-white/40 focus:ring-2 focus:ring-indigo-500/40"
                          />
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
                        <FormLabel className="text-foreground">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            {...field} 
                            className="bg-background/40 backdrop-blur-sm border-white/20 focus:border-white/40 focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {activeTab === "register" && (
                    <FormField
                      control={form.control as any}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              className="bg-background/40 backdrop-blur-sm border-white/20 focus:border-white/40 focus:ring-2 focus:ring-indigo-500/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
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
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col justify-center p-8 overflow-hidden relative">
        <div className="max-w-md mx-auto relative z-10">
          <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
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
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 h-64 flex flex-col shadow-lg">
                      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg p-3 w-fit mb-4">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-white">{prop.title}</h3>
                      <p className="text-gray-200">{prop.description}</p>
                      
                      <div className="mt-auto text-center">
                        <Button 
                          variant="outline" 
                          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
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
                    currentSlide === index ? 'bg-white' : 'bg-white/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}