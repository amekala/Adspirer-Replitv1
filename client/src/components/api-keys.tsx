import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertApiKeySchema, type ApiKey } from "@shared/schema";
import { Loader2, Copy, Key, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ApiKeys() {
  const { toast } = useToast();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [keyName, setKeyName] = useState("");

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = insertApiKeySchema.safeParse({ name });
      if (!result.success) {
        throw new Error("Please provide a name for your API key");
      }
      const res = await apiRequest("POST", "/api/keys", result.data);
      return res.json();
    },
    onSuccess: (key: ApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      setNewKey(key);
      setKeyName("");
      setShowGenerateDialog(false);
      setShowNewKeyDialog(true);
      toast({
        title: "Success",
        description: "API key generated successfully",
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

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Success",
        description: "API key revoked successfully",
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

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const truncateKey = (key: string) => {
    const start = key.slice(0, 6);
    const end = key.slice(-6);
    return `${start}...${end}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeKeys = keys?.filter(key => key.isActive) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for accessing the AdsConnect API
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)} className="w-full sm:w-auto">
          <Key className="mr-2 h-4 w-4" />
          Generate New API Key
        </Button>
      </div>

      {activeKeys.length > 0 ? (
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Key</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="hidden sm:table-cell">Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">
                    <div className="sm:hidden text-xs text-muted-foreground mb-1">Name</div>
                    {key.name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono">{truncateKey(key.keyValue)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(key.keyValue)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deactivateMutation.mutate(key.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      {deactivateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active API keys. Generate a new key to get started.
          </AlertDescription>
        </Alert>
      )}

      {/* Generate Key Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(keyName);
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production API Key"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Key
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy your API key now. You won't be able to see it again!
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-muted rounded-lg overflow-x-auto">
              <code className="text-xs sm:text-sm break-all whitespace-pre-wrap">{newKey?.keyValue}</code>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => newKey && copyToClipboard(newKey.keyValue)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button 
                className="w-full sm:w-auto"
                onClick={() => setShowNewKeyDialog(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}