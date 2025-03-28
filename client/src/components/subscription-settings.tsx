import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CreditCard, 
  Check, 
  Clock, 
  Zap, 
  Rocket, 
  Building2, 
  Download, 
  CreditCardIcon, 
  CalendarIcon,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for the current subscription
const mockSubscription = {
  plan: "pro",
  status: "active",
  billingCycle: "monthly",
  nextBillingDate: "2023-12-15",
  autoRenewal: true,
  price: 29.99,
  features: [
    "Multiple platforms (Amazon, Google, Meta, etc.)",
    "Unlimited conversations",
    "Priority support",
    "Advanced analytics",
    "Team collaboration (up to 5 users)"
  ]
};

// Mock payment method
const mockPaymentMethod = {
  id: "pm_123456789",
  type: "card",
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2024,
  isDefault: true
};

// Mock billing history
const mockBillingHistory = [
  { id: "inv_001", date: "2023-11-15", amount: 29.99, status: "paid", description: "Pro Plan - Monthly" },
  { id: "inv_002", date: "2023-10-15", amount: 29.99, status: "paid", description: "Pro Plan - Monthly" },
  { id: "inv_003", date: "2023-09-15", amount: 29.99, status: "paid", description: "Pro Plan - Monthly" }
];

// Plan options
const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "For individuals getting started with advertising",
    price: { monthly: 9.99, annual: 99.99 },
    features: [
      "Single platform connection",
      "Basic insights",
      "Email support",
      "7-day data retention"
    ],
    icon: Clock
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing businesses and marketers",
    price: { monthly: 29.99, annual: 299.99 },
    features: [
      "Multiple platforms (Amazon, Google, Meta, etc.)",
      "Unlimited conversations",
      "Priority support",
      "Advanced analytics",
      "Team collaboration (up to 5 users)"
    ],
    icon: Zap,
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large brands and agencies",
    price: { monthly: 99.99, annual: 999.99 },
    features: [
      "Unlimited platform connections",
      "Custom AI training",
      "Dedicated account manager",
      "Advanced reporting",
      "Unlimited team members",
      "White-labeling options"
    ],
    icon: Building2
  }
];

export function SubscriptionSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("plan");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [newCardDetails, setNewCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvc: ""
  });
  
  // Track which plan is selected in the plan selection view
  const [selectedPlan, setSelectedPlan] = useState(mockSubscription.plan);

  // Handle input changes for new card
  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCardDetails({
      ...newCardDetails,
      [e.target.name]: e.target.value
    });
  };

  // Handle plan selection
  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  // Handle billing cycle toggle
  const handleBillingCycleChange = (value: string) => {
    setBillingCycle(value as "monthly" | "annual");
  };

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      // In production, this would be a real API call
      // const response = await apiRequest("PUT", "/api/subscription/plan", data);
      // return response.json();
      
      // Mock success with a delay
      return new Promise(resolve => setTimeout(() => resolve(data), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Subscription updated",
        description: "Your subscription plan has been updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update payment method mutation
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (data: any) => {
      // In production, this would be a real API call
      // const response = await apiRequest("POST", "/api/subscription/payment-method", data);
      // return response.json();
      
      // Mock success with a delay
      return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Payment method updated",
        description: "Your payment information has been updated successfully"
      });
      setNewCardDetails({
        cardNumber: "",
        cardName: "",
        expiry: "",
        cvc: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      // In production, this would be a real API call
      // const response = await apiRequest("POST", "/api/subscription/cancel");
      // return response.json();
      
      // Mock success with a delay
      return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled and will end at the current billing period"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle form submissions
  const handleUpdatePlan = () => {
    updateSubscriptionMutation.mutate({
      plan: selectedPlan,
      billingCycle
    });
  };

  const handleUpdatePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all fields are filled
    const { cardNumber, cardName, expiry, cvc } = newCardDetails;
    if (!cardNumber || !cardName || !expiry || !cvc) {
      toast({
        title: "Missing information",
        description: "Please fill in all card details",
        variant: "destructive"
      });
      return;
    }
    
    updatePaymentMethodMutation.mutate(newCardDetails);
  };

  const handleCancelSubscription = () => {
    // In a real app, this would likely show a confirmation dialog first
    cancelSubscriptionMutation.mutate();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription plan and billing information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="plan">Current Plan</TabsTrigger>
          <TabsTrigger value="upgrade">Change Plan</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Current Plan Tab */}
        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Subscription</CardTitle>
                  <CardDescription>Details about your current plan</CardDescription>
                </div>
                <Badge className="uppercase" variant={mockSubscription.status === "active" ? "default" : "secondary"}>
                  {mockSubscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {plans.find(p => p.id === mockSubscription.plan)?.name || "Unknown"} Plan
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {mockSubscription.billingCycle === "monthly" ? "Monthly" : "Annual"} billing
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    {formatCurrency(mockSubscription.price)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{mockSubscription.billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Next billing: {formatDate(mockSubscription.nextBillingDate)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Features</h4>
                <ul className="space-y-2">
                  {mockSubscription.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("upgrade")}
              >
                Change Plan
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelSubscription}
                disabled={cancelSubscriptionMutation.isPending}
              >
                {cancelSubscriptionMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Cancel Subscription
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Upgrade Plan Tab */}
        <TabsContent value="upgrade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select a Plan</CardTitle>
              <CardDescription>Choose the best plan for your needs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center mb-6">
                <RadioGroup 
                  value={billingCycle} 
                  onValueChange={handleBillingCycleChange}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="annual" id="annual" />
                    <Label htmlFor="annual">Annual (Save 20%)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const planPrice = billingCycle === "monthly" ? plan.price.monthly : plan.price.annual;
                  const IconComponent = plan.icon;
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`cursor-pointer border-2 transition-colors ${
                        selectedPlan === plan.id 
                          ? 'border-primary' 
                          : 'hover:border-primary/50'
                      } ${plan.popular ? 'relative' : ''}`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      {plan.popular && (
                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                          <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="bg-primary/10 p-2 rounded-md">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                          </div>
                          {selectedPlan === plan.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-2xl font-bold">
                          {formatCurrency(planPrice)}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{billingCycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </div>
                        <ul className="space-y-2 min-h-[160px]">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleUpdatePlan}
                disabled={updateSubscriptionMutation.isPending}
              >
                {updateSubscriptionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Subscription
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted p-2 rounded">
                      <CreditCardIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{mockPaymentMethod.brand.toUpperCase()} ending in {mockPaymentMethod.last4}</p>
                      <p className="text-sm text-muted-foreground">
                        Expires {mockPaymentMethod.expMonth.toString().padStart(2, '0')}/{mockPaymentMethod.expYear.toString().slice(-2)}
                      </p>
                    </div>
                  </div>
                  <Badge>Default</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Add New Payment Method</h3>
                <form onSubmit={handleUpdatePaymentMethod} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        name="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        value={newCardDetails.cardNumber}
                        onChange={handleCardInputChange}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        name="cardName"
                        placeholder="John Doe"
                        value={newCardDetails.cardName}
                        onChange={handleCardInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        name="expiry"
                        placeholder="MM/YY"
                        value={newCardDetails.expiry}
                        onChange={handleCardInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        name="cvc"
                        placeholder="123"
                        value={newCardDetails.cvc}
                        onChange={handleCardInputChange}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit"
                    disabled={updatePaymentMethodMutation.isPending}
                  >
                    {updatePaymentMethodMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Payment Method
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your previous invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockBillingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(invoice.date)}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                      <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 