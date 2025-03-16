import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AmazonConnect() {
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/amazon/status"],
    retry: false,
  });

  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useQuery({
    queryKey: ["/api/amazon/profiles"],
    enabled: status?.connected === true,
    retry: 1,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/amazon/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/amazon/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/amazon/profiles"] });
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

  const syncMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/amazon/campaigns/sync");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign sync started. This may take a few minutes.",
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

    if (!clientId) {
      console.error("VITE_AMAZON_CLIENT_ID not found in environment");
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

    let popup: Window | null = null;
    let pollTimer: NodeJS.Timeout | null = null;

    const handleCallback = async (event: MessageEvent) => {
      try {
        console.log("Received postMessage:", event.data);

        if (event.data.error) {
          throw new Error(`OAuth error: ${event.data.error} - ${event.data.errorDescription}`);
        }

        const { code } = event.data;
        if (!code) return;

        await apiRequest("POST", "/api/amazon/connect", { code });
        queryClient.invalidateQueries({ queryKey: ["/api/amazon/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/amazon/profiles"] });

        toast({
          title: "Success",
          description: "Amazon Advertising account connected successfully",
        });
      } catch (error) {
        console.error("Connection error:", error);
        toast({
          title: "Connection Failed",
          description: error instanceof Error ? error.message : "Failed to connect Amazon account",
          variant: "destructive",
        });
      } finally {
        window.removeEventListener("message", handleCallback);
        if (pollTimer) clearInterval(pollTimer);
      }
    };

    window.addEventListener("message", handleCallback);

    // Add mode=web-sdk to force web authentication even on mobile
    const amazonOAuthUrl = `https://www.amazon.com/ap/oa?client_id=${clientId}&scope=advertising::campaign_management&response_type=code&redirect_uri=${window.location.origin}/auth/callback&mode=web-sdk`;

    // On mobile, open in a new tab instead of popup
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      window.location.href = amazonOAuthUrl;
      return;
    }

    // Desktop: use popup
    popup = window.open(
      amazonOAuthUrl,
      "Connect Amazon Ads",
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );

    if (popup) {
      // Poll for popup closure
      pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          window.removeEventListener("message", handleCallback);
        }
      }, 500);
    } else {
      console.error("Failed to open popup window");
      toast({
        title: "Error",
        description: "Failed to open the connection window. Please allow popups for this site.",
        variant: "destructive",
      });
    }
  };

  if (statusLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  const clientId = import.meta.env.VITE_AMAZON_CLIENT_ID;
  if (!clientId) {
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
                Your Amazon Advertising account is connected
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync
              </Button>
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

          {profilesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : profilesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Profiles</AlertTitle>
              <AlertDescription>
                Failed to load advertising profiles. Please try disconnecting and reconnecting your account.
              </AlertDescription>
            </Alert>
          ) : profiles?.length > 0 ? (
            <div className="overflow-auto">
              <div className="text-sm font-medium mb-2">Connected Profiles</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile ID</TableHead>
                    <TableHead className="hidden sm:table-cell">Account Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Marketplace</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.profileId}>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        <div className="sm:hidden text-xs text-muted-foreground mb-1">Profile ID</div>
                        {profile.profileId}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {profile.accountName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {profile.marketplace}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {profile.accountType}
                      </TableCell>
                      <TableCell>
                        <div className="sm:hidden text-xs text-muted-foreground mb-1">Status</div>
                        <span className={profile.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                          {profile.status === 'active' ? 'Active' : 'Inactive'}
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
              <AlertTitle>No Profiles Found</AlertTitle>
              <AlertDescription>
                No advertising profiles were found for your account.
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
              Connect your Amazon Advertising account to get started
            </p>
          </div>
          <Button
            onClick={handleConnect}
            className="w-full sm:w-auto"
            size="sm"
          >
            Connect Amazon Ads
          </Button>
        </div>
      )}
    </div>
  );
}