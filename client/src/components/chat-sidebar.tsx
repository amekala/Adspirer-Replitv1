import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  PlusCircle, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Search,
  Settings,
  Home,
  LogOut
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";

interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  isLoading: boolean;
}

export function ChatSidebar({
  conversations = [],
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  isLoading,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    (conversation) => conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle starting edit mode
  const handleEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  // Handle saving edit
  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle);
    }
    setEditingId(null);
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingId(null);
  };
  
  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Handle confirmed deletion
  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="confirm-delete-conversation"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* New Chat Button */}
      <div className="p-3 border-b border-white/10">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start text-slate-200"
          variant="outline"
          aria-label="New Chat"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search Box */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-8 bg-transparent text-slate-200 border-white/20 focus:border-white/40"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="p-2 space-y-1" data-testid="conversation-list">
          {isLoading ? (
            // Loading skeletons
            Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center p-2 rounded-md">
                  <Skeleton className="h-4 w-4 mr-3" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))
          ) : filteredConversations.length === 0 ? (
            <div className="p-3 text-center text-slate-400">
              {searchTerm ? "No conversations found" : "No conversations yet"}
            </div>
          ) : (
            // Conversation list
            filteredConversations.map((conversation) => {
              const isEditing = editingId === conversation.id;
              const isActive = currentConversationId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  data-testid="conversation-item"
                  className={`group flex items-center justify-between rounded-md p-2 ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  } cursor-pointer text-slate-200`}
                  onClick={() => !isEditing && onConversationSelect(conversation.id)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <MessageSquare className="h-4 w-4 mr-3 shrink-0" />
                    
                    {isEditing ? (
                      <div className="flex items-center space-x-1 w-full">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(conversation.id);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          className="h-7 text-sm bg-transparent text-slate-200 border-white/20"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleSaveEdit(conversation.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="truncate">{conversation.title}</div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" alignOffset={-10}>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(conversation.id, conversation.title);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(conversation.id);
                            }}
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Bottom Navigation Buttons */}
      <div className="p-3 border-t border-white/10 mt-auto">
        <div className="space-y-2">
          <Link href="/settings">
            <Button
              variant="outline"
              className="w-full justify-start text-slate-200 bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          
          <Separator className="my-2 bg-white/10" />
          
          <Link href="/">
            <Button
              variant="outline"
              className="w-full justify-start text-slate-200 bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          
          <Button
            variant="outline"
            className="w-full justify-start text-destructive bg-white/5 border-white/10 hover:bg-white/10"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <div className="mr-2 h-4 w-4 animate-spin">•</div>
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}