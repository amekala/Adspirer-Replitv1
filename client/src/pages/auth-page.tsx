import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.extend({
        confirmPassword: activeTab === "register" ? insertUserSchema.shape.password : undefined,
      })
    ),
  });

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const onSubmit = async (data: any) => {
    if (activeTab === "login") {
      await loginMutation.mutateAsync(data);
    } else {
      await registerMutation.mutateAsync(data);
    }
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md p-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...form.register("username")}
                    error={form.formState.errors.username?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    error={form.formState.errors.password?.message}
                  />
                </div>
                {activeTab === "register" && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...form.register("confirmPassword")}
                      error={form.formState.errors.confirmPassword?.message}
                    />
                  </div>
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
              </div>
            </form>
          </Tabs>
        </Card>
      </div>

      <div className="hidden md:flex items-center justify-center p-8 bg-muted">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">
            Welcome to AdsConnect
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect your Amazon Advertising account securely and start managing
            your campaigns with our simple API integration.
          </p>
        </div>
      </div>
    </div>
  );
}
