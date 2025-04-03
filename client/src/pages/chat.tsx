import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chat } from "../components/chat";
import { ChatSidebar } from "../components/chat-sidebar";
import { ChatSettings } from "../components/chat-settings";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, PlusCircle, MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "@/components/ui/toggle";
import { BarChart3 } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth() || {};
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [useRichVisualizations, setUseRichVisualizations] = useState(true);
  const [messageSending, setMessageSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery<any[]>({
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
    onSuccess: async (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setCurrentConversationId(newConversation.id);
      
      toast({
        title: "Conversation created",
        description: "New conversation has been created"
      });
      
      // Trigger an initial assistant message to welcome the user
      try {
        // Wait a brief moment for the conversation to be properly loaded
        setTimeout(async () => {
          console.log('Triggering initial welcome message for new conversation');
          
          // Add a temporary welcome indicator
          const welcomeTypingMessage = {
            id: 'typing-indicator',
            role: 'assistant' as const,
            content: '...',
            createdAt: new Date().toISOString()
          };
          
          // Add the temporary message to the UI
          const conversationWithTyping = {
            conversation: newConversation,
            messages: [welcomeTypingMessage]
          };
          
          // Update the conversation in the query cache with typing indicator
          queryClient.setQueryData(
            ['/api/chat/conversations', newConversation.id],
            conversationWithTyping
          );
          
          // Also update the specific query
          queryClient.setQueryData(
            ['/api/chat/conversations', newConversation.id, 'specific'],
            conversationWithTyping
          );
          
          // The server automatically generates a welcome message when creating a conversation
          // Set up polling to check for the welcome message
          try {
            // Start with an immediate refresh
            queryClient.invalidateQueries({ 
              queryKey: ["/api/chat/conversations", newConversation.id] 
            });
            
            queryClient.invalidateQueries({ 
              queryKey: ["/api/chat/conversations", newConversation.id, "specific"] 
            });
            
            // Then set up a polling mechanism to check for the welcome message
            let pollCount = 0;
            const maxPolls = 10; // Try up to 10 times
            const pollInterval = 500; // Every 500ms
            
            const pollForWelcomeMessage = async () => {
              if (pollCount >= maxPolls) {
                console.log('Reached maximum poll attempts for welcome message');
                return;
              }
              
              pollCount++;
              console.log(`Polling for welcome message (attempt ${pollCount})`);
              
              // Fetch the conversation with messages
              try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/chat/conversations/${newConversation.id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  
                  // Check if the welcome message exists
                  if (data.messages && data.messages.length > 0) {
                    console.log('Welcome message detected, updating UI');
                    
                    // Update both query caches
                    queryClient.setQueryData(
                      ['/api/chat/conversations', newConversation.id],
                      data
                    );
                    
                    queryClient.setQueryData(
                      ['/api/chat/conversations', newConversation.id, 'specific'],
                      data
                    );
                    
                    // Successfully found welcome message, stop polling
                    return;
                  }
                }
                
                // Schedule next poll if we didn't find a welcome message
                setTimeout(pollForWelcomeMessage, pollInterval);
              } catch (error) {
                console.error('Error polling for welcome message:', error);
                // Continue polling despite error
                setTimeout(pollForWelcomeMessage, pollInterval);
              }
            };
            
            // Start polling after a short delay to allow server to generate the welcome message
            setTimeout(pollForWelcomeMessage, 1000);
            
          } catch (error) {
            console.error("Error setting up welcome message polling:", error);
          }
        }, 500);
      } catch (error) {
        console.error("Error sending initial welcome message:", error);
      }
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
    
    // If settings are open, close them
    if (showSettings) {
      setShowSettings(false);
    }
  };

  // Select a conversation
  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id);
    
    // If settings are open, close them
    if (showSettings) {
      setShowSettings(false);
    }
  };

  // Toggle settings panel
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    try {
      // Check if there's a message and conversation ID
      if (!message.trim() || !currentConversationId) return;
      
      // Set message sending state to true
      setMessageSending(true);
      
      // Save the message content before clearing input
      const messageContent = message;
      setMessage(""); // Clear input immediately for better UX
      
      // First, add the user message to the conversation
      const userMessage = {
        id: 'temp-optimistic-user-' + Date.now(), // Add a special ID prefix we can detect later
        role: 'user' as const,
        content: messageContent,
        createdAt: new Date().toISOString(),
        isOptimistic: true // Add a flag to identify this as an optimistic update
      };
      
      // Add temporary typing indicator
      const typingIndicatorMessage = {
        id: 'typing-indicator',
        role: 'assistant' as const,
        content: '...',
        createdAt: new Date().toISOString()
      };
      
      // Create a temporary conversation with both the user message and typing indicator
      if (currentConversation) {
        let formatted;
        try {
          // Import chatService to use the formatting function
          const { formatConversationResponse } = await import("@/lib/chatService");
          formatted = formatConversationResponse(currentConversation);
          
          // First add the user message, then the typing indicator
          const updatedMessages = [...formatted.messages, userMessage, typingIndicatorMessage];
          
          // Update the conversation in the query cache with both messages
          queryClient.setQueryData(
            ['/api/chat/conversations', currentConversationId],
            {
              conversation: formatted.conversation,
              messages: updatedMessages
            }
          );
          
          // Also update the specific query cache for the current conversation
          queryClient.setQueryData(
            ['/api/chat/conversations', currentConversationId, 'specific'],
            {
              conversation: formatted.conversation,
              messages: updatedMessages
            }
          );
        } catch (err) {
          console.error("Error formatting conversation for user message and typing indicator:", err);
        }
      }
      
      // IMPORTANT: First persist the user message to the database
      try {
        await apiRequest("POST", `/api/chat/conversations/${currentConversationId}/messages`, {
          role: "user",
          content: messageContent
        });
          
        // Step 1: Make sure we have the user's message in the UI
        await queryClient.invalidateQueries({ 
          queryKey: ["/api/chat/conversations", currentConversationId, "specific"]
        });
        
        // Step 2: Call the AI completions endpoint
        console.log('Calling AI completions endpoint...');
        const token = localStorage.getItem('token');
        const completionResponse = await fetch('/api/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId: currentConversationId,
            message: messageContent
          })
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
                        ]) as { conversation: any; messages: any[] } || {
                          conversation: typeof currentConversation === 'object' && currentConversation ? 
                            (currentConversation as any).conversation || {} : {},
                          messages: typeof currentConversation === 'object' && currentConversation ? 
                            (currentConversation as any).messages || [] : []
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
    } finally {
      // Set message sending state back to false when done
      setMessageSending(false);
    }
  };

  // Handle message input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // Handle form submission
  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
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
    <Layout>
      <div className="flex flex-row min-h-[calc(100vh-4rem)] mx-auto container p-4 sm:p-6 relative z-10">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 hidden md:flex flex-col mr-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
            <div className="p-4 flex justify-between items-center border-b border-white/10">
              <h2 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Chats</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNewConversation}
                  title="New Chat"
                  className="px-2 bg-white/10 border-white/20 hover:bg-white/20"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Using directly ChatSidebar which already has ScrollArea component inside it */}
            <div className="flex-1 overflow-hidden h-full">
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
                onOpenSettings={handleToggleSettings}
                isLoading={isLoadingConversations}
              />
            </div>
          </div>
        </div>

        {/* Main content area - conditionally show either chat or settings */}
        <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden shadow-lg relative">
          {showSettings ? (
            <div className="h-full p-6">
              <ChatSettings onBack={() => setShowSettings(false)} />
            </div>
          ) : (
            <>
              {/* Mobile header */}
              <div className="md:hidden border-b border-white/10 p-3 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    // Open sidebar for mobile
                  }}
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                >
                  <MenuIcon className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold truncate flex-1 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  {currentConversation?.title || "New Chat"}
                </h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNewConversation}
                    title="New Chat"
                    className="bg-white/10 border-white/20 hover:bg-white/20"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chat conversation container with fixed height - scrollable */}
              <div 
                className="flex-1 overflow-y-auto" 
                ref={chatContainerRef}
                style={{ 
                  height: "calc(100vh - 16rem)", // Adjust height to leave space for the input
                  maxHeight: "calc(100vh - 16rem)",
                  overflowY: "auto"
                }}
              >
                <div className="p-4 md:p-6 space-y-6">
                  <Chat 
                    conversation={conversationMessages} 
                    isLoading={isLoadingMessages || messageSending} 
                    useRichVisualizations={useRichVisualizations}
                  />
                </div>
              </div>

              {/* Input area - fixed at bottom */}
              <div className="border-t border-white/10 p-4 sticky bottom-0 bg-white/5 backdrop-blur-md">
                <form onSubmit={handleSubmitMessage} className="space-y-2">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Ask me anything..."
                      className="min-h-24 pr-20 resize-none overflow-hidden bg-background/40 backdrop-blur-sm border-white/20 focus:border-white/40 focus:ring-2 focus:ring-indigo-500/40"
                      value={message}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      disabled={messageSending || !currentConversationId}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
                      <Toggle
                        variant="outline"
                        size="sm"
                        pressed={useRichVisualizations}
                        onPressedChange={setUseRichVisualizations}
                        title="Toggle rich visualizations"
                        aria-label="Toggle rich visualizations"
                        className="bg-white/10 border-white/20 data-[state=on]:bg-gradient-to-r data-[state=on]:from-indigo-500/20 data-[state=on]:to-purple-500/20 data-[state=on]:text-white"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Toggle>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!message.trim() || messageSending || !currentConversationId}
                        className="h-8 w-8 p-0 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}