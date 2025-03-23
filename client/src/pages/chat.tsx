import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Chat } from "../components/chat";
import { ChatSidebar } from "../components/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Conversation, Message, sendMessage } from "@/lib/chatService";

export default function ChatPage() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // Removed useRagProcessing state - system will automatically detect
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const streamingMessageIdRef = useRef<string>('');

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/chat/conversations"],
    enabled: !!user,
  });

  // Fetch messages for the selected conversation
  const {
    data: conversationMessages,
    isLoading: isLoadingMessages
  } = useQuery({
    queryKey: ["/api/chat/conversations", currentConversationId, "specific"],
    queryFn: async () => {
      if (!currentConversationId) return null;
      const response = await apiRequest("GET", `/api/chat/conversations/${currentConversationId}`);
      return response.json();
    },
    enabled: !!currentConversationId && !!user,
  });
  
  // Combine conversation info with messages
  const currentConversation = useMemo(() => {
    if (conversationMessages) {
      console.log("Got specific conversation with messages:", conversationMessages);
      return conversationMessages;
    }
    
    // If we don't have messages yet but have conversation info from the list
    if (currentConversationId && Array.isArray(conversations)) {
      const conversationInfo = conversations.find(c => c.id === currentConversationId);
      if (conversationInfo) {
        console.log("Using conversation info from list:", conversationInfo);
        return {
          conversation: conversationInfo,
          messages: [] // No messages yet
        };
      }
    }
    
    return null;
  }, [currentConversationId, conversations, conversationMessages]);
  
  // Determine if we're still loading
  const isLoadingConversation = isLoadingMessages || isLoadingConversations;

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/conversations", {
        title: "New conversation" 
      });
      return res.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setCurrentConversationId(newConversation.id);
      
      toast({
        title: "Conversation created",
        description: "New conversation has been created"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create conversation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Send a message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      // Don't allow empty messages
      if (!messageContent.trim()) return;
      
      // Create the message object
      const messageToSend = {
        role: "user" as const,
        content: messageContent,
      };

      // Send the message to the API
      const res = await apiRequest("POST", `/api/chat/conversations/${currentConversationId}/messages`, messageToSend);
      return res.json();
    },
    onSuccess: () => {
      // Clear the text area after sending
      setMessage("");
      
      // Update the conversation with the new message
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", currentConversationId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle a new conversation
  const handleNewConversation = () => {
    createConversationMutation.mutate();
  };

  // Select a conversation
  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    // Check if there's a message and conversation ID
    if (!message.trim() || !currentConversationId) return;
    
    // Save the message content before clearing input
    const messageContent = message;
    setMessage(""); // Clear input immediately for better UX
    
    try {
      // First, create and display the user's message with optimistic update
      const userMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user' as const,
        content: messageContent,
        createdAt: new Date().toISOString()
      };
      
      // Add temporary typing indicator
      const typingIndicatorMessage = {
        id: 'typing-indicator',
        role: 'assistant' as const,
        content: '...',
        createdAt: new Date().toISOString()
      };
      
      // Create a temporary conversation with user message and typing indicator
      if (currentConversation) {
        try {
          // Import chatService to use the formatting function
          const { formatConversationResponse } = await import("@/lib/chatService");
          const formatted = formatConversationResponse(currentConversation);
          
          // Add both user message and typing indicator
          const updatedMessages = [...formatted.messages, userMessage, typingIndicatorMessage];
          
          // Update the conversation in the query cache with user message and typing indicator
          queryClient.setQueryData(
            ['/api/chat/conversations', currentConversationId, 'specific'],
            {
              conversation: formatted.conversation,
              messages: updatedMessages
            }
          );
        } catch (err) {
          console.error("Error formatting conversation for optimistic update:", err);
          // Continue despite formatting error - we can still try to send the message
        }
      }
      
      // Step 1: Send the user message to the server
      await apiRequest("POST", `/api/chat/conversations/${currentConversationId}/messages`, {
        role: "user",
        content: messageContent,
      });
      
      // Reset the streaming message ID for a new message
      streamingMessageIdRef.current = 'streaming-' + Date.now();
      
      // Use the chatService to handle AI response (not message sending)
      console.log('Calling advanced RAG query endpoint...');
      
      // Get streaming content handler
      const updateStreamingContent = (streamedContent: string) => {
        
        // Get latest conversation data
        const latestConversation = queryClient.getQueryData([
          "/api/chat/conversations", 
          currentConversationId, 
          "specific"
        ]) || {
          conversation: currentConversation.conversation,
          messages: currentConversation.messages || []
        };
        
        // Create a copy of the messages array
        let messages = Array.isArray((latestConversation as any).messages) 
          ? [...(latestConversation as any).messages] 
          : [];
          
        // Find if we have a streaming message already
        const typingIndex = messages.findIndex(m => 
          m.id === streamingMessageIdRef.current || m.id === 'typing-indicator');
        
        if (typingIndex >= 0) {
          // Update the existing streaming message with content
          messages[typingIndex] = {
            ...messages[typingIndex],
            id: streamingMessageIdRef.current,
            role: 'assistant',
            content: streamedContent,
            createdAt: new Date().toISOString()
          };
        } else {
          // Add new assistant message
          messages.push({
            id: streamingMessageIdRef.current,
            role: 'assistant',
            content: streamedContent,
            createdAt: new Date().toISOString()
          });
        }
        
        // Update the query cache with consistent reference
        queryClient.setQueryData(
          ['/api/chat/conversations', currentConversationId, 'specific'],
          {
            conversation: (latestConversation as any).conversation,
            messages
          }
        );
      };
      
      // Use the sendMessage function from chatService instead of direct fetch
      // Let the server detect if we should use RAG based on message content
      await sendMessage(
        currentConversationId,
        messageContent,
        updateStreamingContent
      );
      
      // Message was sent via the chatService, so we don't need to process the response here
      // The streaming content is handled by the updateStreamingContent callback
      
      // Final refresh to ensure we have the server's latest state
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", currentConversationId] 
      });
      
    } catch (error) {
      console.error("Error in chat process:", error);
      toast({
        title: "Error",
        description: `Failed to get AI response: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      
      // Refresh messages to show at least the user's message
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", currentConversationId] 
      });
    }
  };

  // Handle textarea resize and keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  // Handle chat title editing
  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await apiRequest("PUT", `/api/chat/conversations/${id}`, { 
        title 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update conversation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle chat deletion
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/chat/conversations/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      
      // If we deleted the current conversation, select another one
      if (id === currentConversationId && Array.isArray(conversations)) {
        const remainingConversations = conversations.filter((c: any) => c.id !== id);
        if (remainingConversations.length > 0) {
          setCurrentConversationId(remainingConversations[0].id);
        } else {
          setCurrentConversationId(null);
        }
      }
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete conversation: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Index campaign data for RAG queries
  const indexCampaignsForRAGMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/rag/index-campaigns`);
      return res.json();
    },
    onSuccess: (data) => {
      console.log("Campaign indexing complete:", data);
      toast({
        title: "Campaigns indexed",
        description: `Successfully indexed ${data.totalIndexed} campaigns for AI assistant`,
      });
    },
    onError: (error: Error) => {
      console.error("Error indexing campaigns:", error);
      toast({
        title: "Error",
        description: `Failed to index campaigns: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen overflow-hidden">
        <ChatSidebar 
          conversations={conversations as Conversation[]} 
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onRenameConversation={(id, title) => 
            updateConversationMutation.mutate({ id, title })
          }
          onDeleteConversation={(id) => 
            deleteConversationMutation.mutate(id)
          }
          isLoading={isLoadingConversations}
        />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {currentConversationId ? (
              <>
                {/* Debug info hidden */}
                <div className="hidden">
                  <pre>{JSON.stringify(currentConversation, null, 2)}</pre>
                </div>
                <Chat
                  conversation={currentConversation}
                  isLoading={isLoadingConversation}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-lg">
                  <h2 className="text-2xl font-bold">Welcome to Adspirer AI Chat</h2>
                  <p className="text-muted-foreground">
                    This AI assistant analyzes your campaign data to provide data-driven insights about your advertising performance.
                  </p>
                  <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                    <p className="font-medium">Ask questions like:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>What's the ROAS of our Amazon campaigns?</li>
                      <li>How does Google perform compared to Amazon?</li>
                      <li>Show me the CTR trend over the past month</li>
                      <li>Which campaigns should I optimize based on performance?</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleNewConversation}
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {currentConversationId && (
            <>
              <Separator />
              <div className="p-4">

                <div className="flex items-end space-x-2">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your advertising campaigns or anything else..."
                    className="min-h-[60px] resize-none overflow-hidden"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for a new line
                </p>
              </div>
            </>
          )}
        </div>
    </div>
  );
}
