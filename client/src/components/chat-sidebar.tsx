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
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
  Home,
  AlertTriangle
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  isLoading: boolean;
}

export function ChatSidebar({
  conversations = [],
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isLoading,
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  
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

  // No longer needed since we've simplified to a single collapse button

  // Toggle sidebar collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Handle opening delete confirmation dialog
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirming deletion
  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
      setConversationToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className={`border-r border-border transition-all duration-300 ${
      isCollapsed ? 
        'w-16 min-w-16' : 
        'min-w-[300px] w-[300px]'
    }`}>
      <div className="flex flex-col h-full">
        <div className="p-3 border-b flex justify-between items-center">
          {!isCollapsed ? (
            <>
              <Button
                onClick={onNewConversation}
                className="flex-1 justify-start"
                variant="outline"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Chat
              </Button>
              <div className="flex gap-1 ml-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9" 
                        onClick={toggleCollapsed}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Collapse Sidebar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9" 
                      onClick={toggleCollapsed}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Expand Sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className={`p-3 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
            {isLoading ? (
              // Loading skeletons
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center p-2 rounded-md">
                    {!isCollapsed && (
                      <>
                        <Skeleton className="h-4 w-4 mr-3" />
                        <Skeleton className="h-5 w-full" />
                      </>
                    )}
                    {isCollapsed && (
                      <Skeleton className="h-9 w-9" />
                    )}
                  </div>
                ))
            ) : filteredConversations.length === 0 ? (
              !isCollapsed && (
                <div className="p-3 text-center text-muted-foreground">
                  {searchTerm ? "No conversations found" : "No conversations yet"}
                </div>
              )
            ) : (
              // Conversation list
              filteredConversations.map((conversation) => {
                const isEditing = editingId === conversation.id;
                const isActive = currentConversationId === conversation.id;

                // Collapsed view for conversation
                if (isCollapsed) {
                  return (
                    <TooltipProvider key={conversation.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            size="icon"
                            className="w-12 h-12 flex items-center justify-center mb-1"
                            onClick={() => onConversationSelect(conversation.id)}
                          >
                            <MessageSquare className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{conversation.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                // Expanded view for conversation
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-center justify-between rounded-md p-2 ${
                      isActive ? "bg-muted" : "hover:bg-muted/50"
                    } cursor-pointer`}
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
                            className="h-7 text-sm"
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
                        <div className="flex space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(conversation.id, conversation.title);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Rename</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={(e) => handleDeleteClick(conversation.id, e)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Footer with navigation */}
        <div className={`p-3 border-t ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard">
                      <Home className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Back to Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
              Delete Conversation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}