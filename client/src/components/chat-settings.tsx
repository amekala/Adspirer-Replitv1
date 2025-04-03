import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define the props for the ChatSettings component
interface ChatSettingsProps {
  onBack: () => void;
}

export function ChatSettings({ onBack }: ChatSettingsProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.email?.split('@')[0] || "",
    email: user?.email || "",
    bio: "Campaign manager with 5+ years experience"
  });
  
  // Handle profile data changes
  const handleProfileChange = (field: string, value: string) => {
    setProfileData({
      ...profileData,
      [field]: value
    });
  };
  
  // Handle saving profile data
  const handleSaveProfile = () => {
    setIsLoading(true);
    
    // Simulate API call to save profile
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-slate-700 dark:text-slate-300"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Settings</h1>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Profile</h2>
          <p className="text-slate-600 dark:text-muted-foreground">
            Manage your personal information and profile settings
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-lg">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={profileData.name} 
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  className="border-slate-300 dark:border-slate-700"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profileData.email} 
                  readOnly 
                  className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Your email cannot be changed</p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Input 
                  id="bio" 
                  value={profileData.bio} 
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  className="border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>
            
            <Separator className="bg-slate-200 dark:bg-slate-700" />

            <div className="pt-4">
              <h3 className="text-base font-medium mb-2 text-slate-800 dark:text-slate-200">About</h3>
              <p className="text-sm text-slate-600 dark:text-muted-foreground">
                Adspirer v1.0.0<br />
                A chat-first platform for campaign management
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 