import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, UserPlus, Trash2, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Mock data for team members - would come from API in production
const mockTeamMembers = [
  { id: "1", name: "Jane Smith", email: "jane@example.com", role: "admin", status: "active" },
  { id: "2", name: "John Doe", email: "john@example.com", role: "manager", status: "active" },
  { id: "3", name: "Sarah Williams", email: "sarah@example.com", role: "analyst", status: "invited" }
];

// Mock data for brand settings - would come from API in production
const mockBrandData = {
  companyName: "Acme Corporation",
  website: "https://acme.example.com",
  industry: "technology",
  metrics: {
    roas: true,
    conversionRate: true,
    costPerClick: true,
    impressions: false,
    acos: true
  }
};

// Roles available for team members
const roles = [
  { value: "admin", label: "Admin", description: "Full access to all settings and data" },
  { value: "manager", label: "Manager", description: "Can manage campaigns and view reports" },
  { value: "analyst", label: "Analyst", description: "View-only access to reports and data" }
];

// Industry options
const industries = [
  { value: "retail", label: "Retail & E-commerce" },
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare & Medical" },
  { value: "finance", label: "Finance & Banking" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "services", label: "Professional Services" },
  { value: "food", label: "Food & Beverage" },
  { value: "travel", label: "Travel & Hospitality" },
  { value: "media", label: "Media & Entertainment" },
  { value: "other", label: "Other" }
];

export function BrandSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");
  const [brandData, setBrandData] = useState(mockBrandData);
  const [teamMembers, setTeamMembers] = useState(mockTeamMembers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "analyst"
  });

  // Handle input changes for brand data
  const handleBrandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrandData({
      ...brandData,
      [e.target.name]: e.target.value
    });
  };

  // Handle switch changes for metrics
  const handleMetricChange = (metric: string, value: boolean) => {
    setBrandData({
      ...brandData,
      metrics: {
        ...brandData.metrics,
        [metric]: value
      }
    });
  };

  // Handle invite input changes
  const handleInviteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteData({
      ...inviteData,
      [e.target.name]: e.target.value
    });
  };

  // Handle role select change
  const handleRoleChange = (value: string) => {
    setInviteData({
      ...inviteData,
      role: value
    });
  };

  // Handle industry select change
  const handleIndustryChange = (value: string) => {
    setBrandData({
      ...brandData,
      industry: value
    });
  };

  // Update brand mutation
  const updateBrandMutation = useMutation({
    mutationFn: async (data: any) => {
      // In production, this would be a real API call
      // const response = await apiRequest("PUT", "/api/brand", data);
      // return response.json();
      
      // Mock success
      return new Promise(resolve => setTimeout(() => resolve(data), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Brand settings updated",
        description: "Your brand settings have been updated successfully"
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

  // Invite team member mutation
  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      // In production, this would be a real API call
      // const response = await apiRequest("POST", "/api/team/invite", data);
      // return response.json();
      
      // Mock success with a new team member object
      return new Promise(resolve => 
        setTimeout(() => {
          const newMember = {
            id: (teamMembers.length + 1).toString(),
            name: "",
            email: data.email,
            role: data.role,
            status: "invited"
          };
          resolve(newMember);
        }, 1000)
      );
    },
    onSuccess: (newMember: any) => {
      setTeamMembers([...teamMembers, newMember]);
      setInviteData({ email: "", role: "analyst" });
      setDialogOpen(false);
      toast({
        title: "Invitation sent",
        description: `Team invitation has been sent to ${newMember.email}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invitation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Remove team member mutation
  const removeTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      // In production, this would be a real API call
      // const response = await apiRequest("DELETE", `/api/team/members/${id}`);
      // return response.json();
      
      // Mock success
      return new Promise(resolve => setTimeout(() => resolve({ id }), 1000));
    },
    onSuccess: (data: any) => {
      setTeamMembers(teamMembers.filter(member => member.id !== data.id));
      toast({
        title: "Team member removed",
        description: "The team member has been removed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle form submits
  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandMutation.mutate(brandData);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email) {
      toast({
        title: "Missing information",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }
    inviteTeamMemberMutation.mutate(inviteData);
  };

  const handleRemoveTeamMember = (id: string) => {
    // Don't allow removing yourself
    if (id === "1") { // Assuming the current user is id 1 for this mock
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove your own account from the team",
        variant: "destructive"
      });
      return;
    }
    removeTeamMemberMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Brand Settings</h2>
        <p className="text-muted-foreground">
          Manage your company information and team access
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team">Team Access</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBrandSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={brandData.companyName}
                      onChange={handleBrandInputChange}
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={brandData.website}
                      onChange={handleBrandInputChange}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={brandData.industry}
                      onValueChange={handleIndustryChange}
                    >
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map(industry => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateBrandMutation.isPending}
                  >
                    {updateBrandMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Access Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Team Members</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your team. They'll receive an email with instructions.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={inviteData.email}
                          onChange={handleInviteInputChange}
                          placeholder="colleague@example.com"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={inviteData.role}
                          onValueChange={handleRoleChange}
                        >
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          {roles.find(r => r.value === inviteData.role)?.description}
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={inviteTeamMemberMutation.isPending}
                      >
                        {inviteTeamMemberMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name || "—"}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <span className="capitalize">{member.role}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            member.status === "active" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          }`}>
                            {member.status === "active" ? "Active" : "Invited"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span className="sr-only">Open menu</span>
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.status === "invited" && (
                                <DropdownMenuItem onClick={() => {}}>
                                  Resend Invitation
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRemoveTeamMember(member.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-sm text-muted-foreground">
                  Team members will have access according to their assigned role.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Key Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBrandSubmit} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select the key metrics most important to your brand. These will be prioritized in reports and insights.
                  </p>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Return on Ad Spend (ROAS)</Label>
                        <p className="text-sm text-muted-foreground">
                          Revenue generated per dollar spent on advertising
                        </p>
                      </div>
                      <Switch
                        checked={brandData.metrics.roas}
                        onCheckedChange={(checked) => handleMetricChange("roas", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Conversion Rate</Label>
                        <p className="text-sm text-muted-foreground">
                          Percentage of visitors who complete a desired action
                        </p>
                      </div>
                      <Switch
                        checked={brandData.metrics.conversionRate}
                        onCheckedChange={(checked) => handleMetricChange("conversionRate", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Cost Per Click (CPC)</Label>
                        <p className="text-sm text-muted-foreground">
                          Average cost paid for each click on your ads
                        </p>
                      </div>
                      <Switch
                        checked={brandData.metrics.costPerClick}
                        onCheckedChange={(checked) => handleMetricChange("costPerClick", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Impressions</Label>
                        <p className="text-sm text-muted-foreground">
                          Number of times your ads were viewed
                        </p>
                      </div>
                      <Switch
                        checked={brandData.metrics.impressions}
                        onCheckedChange={(checked) => handleMetricChange("impressions", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Advertising Cost of Sales (ACoS)</Label>
                        <p className="text-sm text-muted-foreground">
                          Ad spend as a percentage of attributed sales
                        </p>
                      </div>
                      <Switch
                        checked={brandData.metrics.acos}
                        onCheckedChange={(checked) => handleMetricChange("acos", checked)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateBrandMutation.isPending}
                  >
                    {updateBrandMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 