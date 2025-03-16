import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

export function GoogleConnect() {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/google/status"],
    retry: false,
  });

  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ["/api/google/accounts"],
    enabled: status?.connected === true,
    retry: 1,
  });

  const showToast = (title: string, description: string, variant?: "default" | "destructive") => {
    if (!isMobile) {
      toast({ title, description, variant });
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/google/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google/accounts"] });
      showToast("Success", "Google Ads account disconnected");
    },
    onError: (error: Error) => {
      showToast("Error", error.message, "destructive");
    },
  });

  const handleConnect = () => {
    // Check for environment variables in both dev and prod environments
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error("VITE_GOOGLE_CLIENT_ID not found in environment");
      showToast(
        "Configuration Error",
        "Google Client ID is not configured. Please contact support.",
        "destructive"
      );
      return;
    }

    // Google OAuth2 configuration
    const scope = encodeURIComponent("https://www.googleapis.com/auth/adwords");
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline&prompt=consent`;

    // On mobile devices, open in current window
    if (isMobile) {
      window.location.href = googleOAuthUrl;
      return;
    }

    // Desktop: use popup
    const width = 600;
    const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleOAuthUrl,
      "Connect Google Ads",
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (!popup) {
      console.error("Failed to open popup window");
      showToast(
        "Error",
        "Failed to open the connection window. Please allow popups for this site.",
        "destructive"
      );
      return;
    }

    // Handle the OAuth callback
    const handleCallback = async (event: MessageEvent) => {
      try {
        if (event.data.error) {
          throw new Error(`OAuth error: ${event.data.error} - ${event.data.errorDescription}`);
        }

        const { code } = event.data;
        if (!code) return;

        await apiRequest("POST", "/api/google/connect", { code });
        queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/google/accounts"] });

        showToast("Success", "Google Ads account connected successfully");
      } catch (error) {
        console.error("Connection error:", error);
        showToast(
          "Connection Failed",
          error instanceof Error ? error.message : "Failed to connect Google Ads account",
          "destructive"
        );
      } finally {
        window.removeEventListener("message", handleCallback);
        clearInterval(pollTimer);
      }
    };

    window.addEventListener("message", handleCallback);

    // Poll for popup closure
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener("message", handleCallback);
      }
    }, 500);
  };

  if (statusLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  // Show configuration error if environment variables are missing
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Google Client ID is not configured. Please ensure VITE_GOOGLE_CLIENT_ID is set in your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {status?.connected ? (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-medium text-sm sm:text-base">Connected</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your Google Ads account is connected
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {disconnectMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Disconnect
              </Button>
            </div>
          </div>

          {accountsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : accountsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Accounts</AlertTitle>
              <AlertDescription>
                Failed to load advertising accounts. Please try disconnecting and reconnecting your account.
              </AlertDescription>
            </Alert>
          ) : accounts?.length > 0 ? (
            <div className="overflow-auto">
              <div className="text-sm font-medium mb-2">Connected Accounts</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Account Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account: any) => (
                    <TableRow key={account.customerId}>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        <div className="sm:hidden text-xs text-muted-foreground mb-1">Customer ID</div>
                        {account.customerId}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {account.accountName}
                      </TableCell>
                      <TableCell>
                        <div className="sm:hidden text-xs text-muted-foreground mb-1">Status</div>
                        <span className={account.status === 'ENABLED' ? 'text-green-600' : 'text-red-600'}>
                          {account.status === 'ENABLED' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Accounts Found</AlertTitle>
              <AlertDescription>
                No advertising accounts were found for your account.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" />
              <span className="font-medium text-sm sm:text-base">Not Connected</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Connect your Google Ads account to get started
            </p>
          </div>
          <Button
            onClick={handleConnect}
            className="w-full sm:w-auto"
            size="sm"
          >
            Connect Google Ads
          </Button>
        </div>
      )}
    </div>
  );
}