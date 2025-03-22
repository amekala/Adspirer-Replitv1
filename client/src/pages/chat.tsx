import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Chat } from "../components/chat";
import { ChatSidebar } from "../components/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  return <ChatPageContent />;
}

function ChatPageContent() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/chat/conversations"],
    enabled: !!user,
  });

  // Fetch current conversation and messages
  const { data: currentConversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["/api/chat/conversations", currentConversationId],
    enabled: !!currentConversationId && !!user,
  });

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
        description: "Started a new chat conversation",
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

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      // First save the user message
      await apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, { 
        role: "user", 
        content: message 
      });
      
      // Then start the streaming completion
      const response = await fetch(`/api/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          conversationId, 
          message 
        }),
      });
      
      return response;
    },
    onSuccess: () => {
      // Refetch conversation to update messages
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

  // Create a new conversation if none exists
  useEffect(() => {
    if (user && Array.isArray(conversations) && conversations.length === 0 && !isLoadingConversations) {
      createConversationMutation.mutate();
    } else if (user && Array.isArray(conversations) && conversations.length > 0 && !currentConversationId) {
      // Set the current conversation to the most recent one
      setCurrentConversationId(conversations[0].id);
    }
  }, [user, conversations, isLoadingConversations]);

  // Handle new conversation button click
  const handleNewConversation = () => {
    createConversationMutation.mutate();
  };

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  // Handle message submission
  const handleSendMessage = async () => {
    if (!message.trim() || !currentConversationId) return;
    
    const messageToSend = message;
    setMessage(""); // Clear input immediately for better UX
    
    try {
      // Step 1: Save the user's message and show it immediately
      await sendMessageMutation.mutateAsync({
        conversationId: currentConversationId,
        message: messageToSend
      });
      
      // Refresh messages to show the user's message
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", currentConversationId] 
      });

      // Set typing indicator
      const typingIndicatorMessage = {
        id: 'typing-indicator',
        role: 'assistant',
        content: '...',
        createdAt: new Date().toISOString()
      };
      
      if (currentConversation && currentConversation.messages) {
        // If we have a current conversation with messages, manually add the typing indicator
        // This is just for UI purposes and won't be saved to the database
        const tempMessages = [...currentConversation.messages, typingIndicatorMessage];
        const tempConversation = {
          ...currentConversation,
          messages: tempMessages
        };
        
        // Use queryClient.setQueryData to update the UI without fetching from the server
        queryClient.setQueryData(
          ['/api/chat/conversations', currentConversationId],
          tempConversation
        );
      }

      // Step 2: Call the AI completions endpoint
      console.log('Calling AI completions endpoint...');
      const completionResponse = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: messageToSend
        }),
        credentials: 'include' // Important: include credentials for session authentication
      });

      if (!completionResponse.ok) {
        console.error('AI completion error:', await completionResponse.text());
        throw new Error(`HTTP error! status: ${completionResponse.status}`);
      }

      console.log('Processing AI streaming response...');
      // Process the streaming response directly from the completionResponse
      console.log('Processing streaming response...');
      
      // Get a reader from the response body
      const reader = completionResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        console.error('No reader available from response');
        throw new Error('No reader available from response');
      }
      
      let streamedMessage = '';
      
      // Track if we've received any data
      let hasReceivedData = false;
      let streamedMessage = '';
      
      // Listen for message events
      eventSource.onmessage = (event) => {
        try {
          console.log('SSE message received:', event.data);
          
          if (event.data === '[DONE]') {
            console.log('Stream completed.');
            eventSource.close();
            return;
          }
          
          if (event.data === '[ERROR]') {
            console.error('Server reported an error in the stream.');
            eventSource.close();
            return;
          }
          
          // Parse the JSON data
          const data = JSON.parse(event.data);
          
          if (data.content) {
            streamedMessage += data.content;
            hasReceivedData = true;
            
            // Update the UI with the streaming content
            if (currentConversation && currentConversation.messages) {
              // If we have the typing indicator, replace it with the current streamed content
              const updatedMessages = [...currentConversation.messages];
              
              // Find or create the assistant message
              const lastIndex = updatedMessages.length - 1;
              if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'assistant') {
                // Update the existing assistant message
                updatedMessages[lastIndex] = {
                  ...updatedMessages[lastIndex],
                  content: streamedMessage
                };
              } else {
                // Add a new assistant message
                updatedMessages.push({
                  id: 'temp-assistant-' + Date.now(),
                  role: 'assistant',
                  content: streamedMessage,
                  createdAt: new Date().toISOString()
                });
              }
              
              // Update the state with the new message content
              const tempConversation = {
                ...currentConversation,
                messages: updatedMessages
              };
              
              queryClient.setQueryData(
                ['/api/chat/conversations', currentConversationId],
                tempConversation
              );
            }
          }
        } catch (error) {
          console.error('Error processing SSE message:', error);
        }
      };
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        
        // Refresh messages to get the final state
        queryClient.invalidateQueries({ 
          queryKey: ["/api/chat/conversations", currentConversationId] 
        });
      };
      
      // Give the stream time to complete, then close it if it hasn't already
      setTimeout(() => {
        if (eventSource.readyState !== 2) { // 2 = CLOSED
          console.log('Stream timeout reached, closing EventSource');
          eventSource.close();
          
          // Final refresh after timeout
          if (hasReceivedData) {
            queryClient.invalidateQueries({ 
              queryKey: ["/api/chat/conversations", currentConversationId] 
            });
          }
        }
      }, 10000); // 10 second timeout
      
      // Wait for the stream to complete (this won't actually work as written, but we'll leave in place)
      await new Promise(resolve => {
        eventSource.onclose = resolve;
      });
      }
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

  return (
    <div className="flex h-screen overflow-hidden">
        <ChatSidebar 
          conversations={conversations} 
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
              <Chat
                conversation={currentConversation}
                isLoading={isLoadingConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">Welcome to Adspirer AI Chat</h2>
                  <p className="text-muted-foreground">
                    Start a new conversation to get insights about your advertising campaigns
                  </p>
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
                    placeholder="Type your message..."
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