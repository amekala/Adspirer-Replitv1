import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AmazonConnect() {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/amazon/status"],
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/amazon/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amazon/status"] });
      toast({
        title: "Success",
        description: "Amazon Advertising account disconnected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_AMAZON_CLIENT_ID;
    console.log("Client ID:", clientId); // Debug log

    if (!clientId) {
      console.error("VITE_AMAZON_CLIENT_ID not found in environment"); // Debug log
      toast({
        title: "Configuration Error",
        description: "Amazon Client ID is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    const width = 600;
    const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Create a function to handle the OAuth callback
    const handleCallback = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      try {
        const { code } = event.data;
        if (!code) return;

        await apiRequest("POST", "/api/amazon/connect", { code });
        queryClient.invalidateQueries({ queryKey: ["/api/amazon/status"] });
        toast({
          title: "Success",
          description: "Amazon Advertising account connected successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to connect Amazon account",
          variant: "destructive",
        });
      }
    };

    // Add message listener for the popup callback
    window.addEventListener("message", handleCallback);

    const amazonOAuthUrl = `https://www.amazon.com/ap/oa?client_id=${clientId}&scope=advertising::campaign_management&response_type=code&redirect_uri=${window.location.origin}/auth/callback`;
    console.log("OAuth URL:", amazonOAuthUrl); // Debug log

    const popup = window.open(
      amazonOAuthUrl,
      "Connect Amazon Ads",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (popup) {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleCallback);
        }
      }, 500);
    } else {
      console.error("Failed to open popup window"); // Debug log
      toast({
        title: "Error",
        description: "Failed to open the connection window. Please allow popups for this site.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  // More detailed error message for debugging
  const clientId = import.meta.env.VITE_AMAZON_CLIENT_ID;
  if (!clientId) {
    console.error("Environment variables:", import.meta.env); // Debug log
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Amazon Client ID is not configured (VITE_AMAZON_CLIENT_ID not found).
          This environment variable must be set and start with VITE_ to be accessible in the frontend.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {status?.connected ? (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">Connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Amazon Advertising account is connected
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="font-medium">Not Connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect your Amazon Advertising account to get started
            </p>
          </div>
          <Button onClick={handleConnect}>Connect Amazon Ads</Button>
        </div>
      )}
    </div>
  );
}