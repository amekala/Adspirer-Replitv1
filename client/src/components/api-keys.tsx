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
import { Loader2, Copy, Key } from "lucide-react";

export function ApiKeys() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      setIsOpen(false);
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
        description: "API key deactivated",
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
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  return (
    <div>
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

      <div className="mt-6 space-y-4">
        {keys?.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between p-4 bg-muted rounded-lg"
          >
            <div>
              <h3 className="font-medium">{key.name}</h3>
              <p className="text-sm text-muted-foreground">
                Created {new Date(key.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {key.active ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(key.key)}
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
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Revoked</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
