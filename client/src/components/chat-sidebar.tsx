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
  Home
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
  const [isPinned, setIsPinned] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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

  // Toggle sidebar pinned state
  const togglePinned = () => {
    setIsPinned(!isPinned);
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  // Toggle sidebar collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`border-r border-border transition-all duration-300 ${
      isCollapsed ? 
        'w-16 min-w-16' : 
        isPinned ? 'min-w-[300px] w-[300px]' : 'min-w-[300px] w-[300px] lg:min-w-[300px] lg:w-[300px] absolute lg:relative z-20 bg-background h-full shadow-lg lg:shadow-none'
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
                        onClick={togglePinned}
                      >
                        {isPinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                                onDeleteConversation(conversation.id);
                              }}
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
    </div>
  );
}