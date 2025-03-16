import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
//import { useToast } from "@/hooks/use-toast"; // Removed as not used in edited code
import { Sparkles, Shield } from 'lucide-react';


const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  //const { toast } = useToast(); // Removed as not used in edited code

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
      <div className="flex items-center justify-center p-8">
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

      <div className="hidden md:flex flex-col justify-center p-8 bg-muted">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Transform Your Retail Media Strategy
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Connect your advertising accounts securely and start optimizing your campaigns with AI-powered insights.
          </p>
          <div className="grid gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Get intelligent recommendations to improve your ROAS across all retail media platforms
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
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
    </div>
  );
}