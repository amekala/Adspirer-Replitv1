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

export default function ChatPage() {
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
    try {
      // Check if there's a message and conversation ID
      if (!message.trim() || !currentConversationId) return;
      
      // Save the message content before clearing input
      const messageContent = message;
      setMessage(""); // Clear input immediately for better UX
      
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
        let formatted;
        try {
          // Import chatService to use the formatting function
          const { formatConversationResponse } = await import("@/lib/chatService");
          formatted = formatConversationResponse(currentConversation);
          
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
        }
      }
      
      // Use direct fetch and handle streaming ourselves for greater control
      try {
        // Step 1: Send the user message to the server
        await apiRequest("POST", `/api/chat/conversations/${currentConversationId}/messages`, {
          role: "user",
          content: messageContent,
        });
        
        // Step 2: Call the AI completions endpoint
        console.log('Calling AI completions endpoint...');
        const completionResponse = await fetch('/api/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: messageContent
          }),
          credentials: 'include' // Include credentials for session authentication
        });

        if (!completionResponse.ok) {
          const errorText = await completionResponse.text();
          console.error('AI completion error:', errorText);
          throw new Error(`HTTP error! status: ${completionResponse.status}`);
        }

        // Process the streaming response
        console.log('Processing streaming response...');
        const reader = completionResponse.body?.getReader();
        if (!reader) {
          throw new Error('No reader available from response');
        }
        
        const decoder = new TextDecoder();
        let streamedContent = '';
        
        // Start reading the stream
        try {
          let done = false;
          
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
              // Decode the chunk and parse it
              const chunk = decoder.decode(value, { stream: true });
              console.log('Received chunk:', chunk);
              
              // Process each line (could be multiple SSE events in one chunk)
              const lines = chunk.split('\n\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6); // Remove 'data: ' prefix
                  
                  if (data === '[DONE]') {
                    console.log('Stream completed');
                    done = true;
                    break;
                  }
                  
                  if (data === '[ERROR]') {
                    console.error('Server reported an error');
                    done = true;
                    break;
                  }
                  
                  try {
                    // Parse the JSON data
                    const parsedData = JSON.parse(data);
                    if (parsedData.content) {
                      streamedContent += parsedData.content;
                      
                      // Create an updated conversation object with streamed content
                      if (currentConversation) {
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
                        let messages = Array.isArray(latestConversation.messages) 
                          ? [...latestConversation.messages] 
                          : [];
                          
                        // Find if we have a typing indicator already
                        const typingIndex = messages.findIndex(m => 
                          m.id === 'typing-indicator' || m.id.startsWith('streaming-'));
                        
                        if (typingIndex >= 0) {
                          // Update the existing typing indicator with content
                          messages[typingIndex] = {
                            ...messages[typingIndex],
                            id: 'streaming-' + Date.now(),
                            content: streamedContent
                          };
                        } else {
                          // Add new assistant message
                          messages.push({
                            id: 'streaming-' + Date.now(),
                            role: 'assistant',
                            content: streamedContent,
                            createdAt: new Date().toISOString()
                          });
                        }
                        
                        // Update the query cache
                        queryClient.setQueryData(
                          ['/api/chat/conversations', currentConversationId, 'specific'],
                          {
                            conversation: latestConversation.conversation,
                            messages
                          }
                        );
                      }
                    }
                  } catch (parseError) {
                    console.error('Error parsing streaming data:', parseError);
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        console.error("Error handling streaming response:", error);
      }
      
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
              <>
                {/* Adding debug info */}
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