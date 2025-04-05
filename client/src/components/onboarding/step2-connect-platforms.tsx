import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AmazonConnect } from "@/components/amazon-connect";
import { GoogleConnect } from "@/components/google-connect";
import { SiAmazon, SiGoogleads, SiMeta, SiWalmart } from "react-icons/si";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConnectPlatformsFormProps {
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
}

export function ConnectPlatformsForm({ onNext, onPrevious, onSkip }: ConnectPlatformsFormProps) {
  const { toast } = useToast();
  const [platformsChecked, setPlatformsChecked] = useState(false);
  
  // Check if at least one platform is connected
  const { data: amazonStatus } = useQuery({
    queryKey: ["/api/amazon/status"],
    retry: false,
  });

  const { data: googleStatus } = useQuery({
    queryKey: ["/api/google/status"],
    retry: false,
  });

  // Update platforms checked status when queries resolve
  useEffect(() => {
    const isAnyConnected = 
      (amazonStatus && amazonStatus.connected) || 
      (googleStatus && googleStatus.connected);
    
    setPlatformsChecked(isAnyConnected);
  }, [amazonStatus, googleStatus]);

  // Handler for Next button click
  const handleContinue = () => {
    // Only show warning if no platforms are connected and user hasn't explicitly checked platforms
    const isAnyConnected = 
      (amazonStatus && amazonStatus.connected) || 
      (googleStatus && googleStatus.connected);
    
    if (!isAnyConnected && !platformsChecked) {
      // Inform user but allow them to proceed
      toast({
        title: "No platforms connected",
        description: "You haven't connected any advertising platforms. Some features may be limited.",
        variant: "warning",
      });
      
      // Mark as checked so we don't warn again
      setPlatformsChecked(true);
    }
    
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800">Platform Connections</h3>
        <p className="mt-1 text-sm text-blue-700">
          Connect the ad platforms you use. This allows Adspirer to manage campaigns and provide insights.
        </p>
      </div>
      
      {/* Amazon Advertising */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#FF9900]/10 flex items-center justify-center">
            <SiAmazon className="h-5 w-5 text-[#FF9900]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">Amazon Advertising</p>
            <p className="text-xs text-gray-500">Connect your Amazon Advertising account</p>
          </div>
        </div>
        <div className="p-4">
          <AmazonConnect />
        </div>
      </div>
      
      {/* Google Ads */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
            <SiGoogleads className="h-5 w-5 text-[#4285F4]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">Google Ads</p>
            <p className="text-xs text-gray-500">Connect your Google Ads account</p>
          </div>
        </div>
        <div className="p-4">
          <GoogleConnect />
        </div>
      </div>
      
      {/* Coming Soon Platforms */}
      <div className="bg-gray-50 border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <p className="text-sm font-medium text-gray-700">More Platforms Coming Soon</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Meta (Facebook/Instagram) */}
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-white opacity-70">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
              <SiMeta className="h-5 w-5 text-[#1877F2]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">Meta Ads</p>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Connect
            </Button>
          </div>
          
          {/* Walmart Connect */}
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-white opacity-70">
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#0071DC]/10 flex items-center justify-center">
              <SiWalmart className="h-5 w-5 text-[#0071DC]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">Walmart Connect</p>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Connect
            </Button>
          </div>
        </div>
      </div>
      
      {/* Form Actions */}
      <div className="flex justify-between pt-6">
        {onPrevious && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
        )}
        <div className="ml-auto flex space-x-2">
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
            >
              Skip for now
            </Button>
          )}
          <Button onClick={handleContinue}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}