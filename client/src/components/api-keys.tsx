import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertApiKeySchema, type ApiKey } from "@shared/schema";
import { Loader2, Copy, Key, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ApiKeys() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const result = insertApiKeySchema.safeParse({ name });
      if (!result.success) {
        throw new Error("Invalid key name");
      }
      const res = await apiRequest("POST", "/api/keys", result.data);
      return res.json();
    },
    onSuccess: (newKey: ApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      setShowNewKey(newKey.keyValue);
      setName("");
      toast({
        title: "Success",
        description: "API key created successfully",
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">
            Manage your API keys for accessing the AdsConnect API
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Key className="mr-2 h-4 w-4" />
              Generate New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(name);
                setIsOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Development Key"
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
      </div>

      {showNewKey && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-green-600 dark:text-green-400">
                  New API Key Generated
                </p>
                <p className="text-sm text-muted-foreground">
                  Copy this key now. You won't be able to see it again!
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(showNewKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="mt-4 rounded-lg bg-green-100 p-4 text-sm font-mono dark:bg-green-950/30">
              {showNewKey}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {keys?.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between p-4 bg-muted rounded-lg"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{key.name}</h3>
                <Badge variant={key.isActive ? "secondary" : "destructive"}>
                  {key.isActive ? "Active" : "Revoked"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                {key.lastUsed && (
                  <span>• Last used {new Date(key.lastUsed).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            {key.isActive && (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}