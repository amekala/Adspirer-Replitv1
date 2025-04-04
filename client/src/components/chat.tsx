import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Message, Conversation, formatConversationResponse } from "@/lib/chatService";
import { EnhancedMessageBubble } from './chat/EnhancedMessageBubble';
import { EnhancedVisualizationBubble } from './chat/EnhancedVisualizationBubble';
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";

interface ChatProps {
  conversation: any; // This will be processed into the correct format
  isLoading: boolean;
  useRichVisualizations?: boolean; // New prop to toggle enhanced visualizations
}

// Skeleton component for loading state
function MessageSkeleton({ role }: { role: 'user' | 'assistant' }) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group py-2`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 max-w-[80%] md:max-w-[70%]`}>
        <div className="flex-shrink-0">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[170px]" />
          <Skeleton className="h-4 w-[230px]" />
        </div>
      </div>
    </div>
  );
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex justify-start group py-2">
      <div className="flex flex-row gap-3">
        <div className="flex-shrink-0">
          <Avatar className="h-9 w-9 bg-indigo-600 dark:bg-zinc-800 overflow-hidden ring-2 ring-background">
            <div className="flex items-center justify-center h-full w-full">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </Avatar>
        </div>
        <Card className="p-3 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl rounded-tl-sm">
          <div className="flex space-x-2 items-center">
            <span className="h-2 w-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="h-2 w-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            <span className="h-2 w-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function Chat({ conversation, isLoading, useRichVisualizations = true }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [processed, setProcessed] = useState<{
    conversation: Conversation | null;
    messages: Message[];
  }>({
    conversation: null,
    messages: []
  });

  // Process and format the conversation data
  useEffect(() => {
    if (conversation) {
      console.log("Processing conversation for display:", conversation);
      try {
        const formatted = formatConversationResponse(conversation);
        
        // Add debugging
        console.log("Conversation messages before sorting:", formatted.messages);
        
        // Remove duplicate user messages (handle optimistic updates)
        // If we find a message with id starting with 'temp-optimistic-user-' and there's a server
        // message with the same content, remove the optimistic one
        const messagesWithoutDuplicates = formatted.messages.filter((msg, index, array) => {
          // If this is an optimistic message
          if (typeof msg.id === 'string' && msg.id.startsWith('temp-optimistic-user-') && msg.role === 'user') {
            // Check if there's a non-optimistic server message with the same content
            const duplicateIndex = array.findIndex((serverMsg, i) => 
              i !== index && // Not the same message
              serverMsg.role === 'user' && // Same role
              serverMsg.content === msg.content && // Same content
              (typeof serverMsg.id !== 'string' || !serverMsg.id.startsWith('temp-optimistic-user-')) // Not optimistic
            );
            // If a duplicate is found, filter out this optimistic message
            return duplicateIndex === -1;
          }
          return true;
        });
        
        // Sort messages by createdAt to maintain proper flow
        if (messagesWithoutDuplicates && messagesWithoutDuplicates.length > 0) {
          messagesWithoutDuplicates.sort((a, b) => {
            // Ensure we have valid dates (defensive coding)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });
          console.log(`Found ${messagesWithoutDuplicates.length} messages for conversation ${formatted.conversation.id}`);
          console.log("Conversation messages after sorting:", messagesWithoutDuplicates);
        }
        
        // Check if there's a typing indicator or streaming message
        const hasTypingMessage = messagesWithoutDuplicates.some(
          msg => (msg.id === 'typing-indicator') || 
                (typeof msg.id === 'string' && msg.id.startsWith('streaming-'))
        );
        
        // Check that we have both user and assistant messages
        const hasUserMessages = messagesWithoutDuplicates.some(msg => msg.role === 'user');
        const hasAssistantMessages = messagesWithoutDuplicates.some(msg => msg.role === 'assistant');
        
        // Set isTyping if there's a typing indicator
        setIsTyping(hasTypingMessage);
        
        // Set the processed messages and conversation
        setProcessed({
          conversation: formatted.conversation,
          messages: messagesWithoutDuplicates
        });
      } catch (error) {
        console.error("Error processing conversation data:", error);
      }
    }
  }, [conversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [processed.messages]);

  // Simulate typing effect if loading but no typing message is present
  useEffect(() => {
    if (isLoading && !isTyping) {
      setIsTyping(true);
    } else if (!isLoading && !processed.messages.some(
      msg => msg.id === 'typing-indicator' || (typeof msg.id === 'string' && msg.id.startsWith('streaming-'))
    )) {
      // Add a small delay before turning off typing indicator for better UX
      const typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 500);
      
      return () => clearTimeout(typingTimeout);
    }
  }, [isLoading, processed.messages, isTyping]);

  if (!conversation && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-muted-foreground">No conversation selected</p>
      </div>
    );
  }

  if (isLoading && !processed.conversation && processed.messages.length === 0) {
    return (
      <div className="space-y-4">
        <MessageSkeleton role="user" />
        <MessageSkeleton role="assistant" />
      </div>
    );
  }

  const { messages } = processed;
  const hasTypingIndicator = messages.some(msg => 
    msg.id === 'typing-indicator' || (typeof msg.id === 'string' && msg.id.startsWith('streaming-'))
  );

  return (
    <div className="space-y-6 pb-4">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-muted-foreground">Start the conversation by typing a message below.</p>
        </div>
      ) : (
        messages.map((message, index) => {
          // Determine if this message is streaming (for UI purposes)
          const isStreaming = 
            typeof message.id === 'string' && 
            (message.id === 'typing-indicator' || message.id.startsWith('streaming-'));
          
          // Use the appropriate message bubble component
          return useRichVisualizations ? (
            <EnhancedVisualizationBubble 
              key={message.id || index} 
              message={message}
              isStreaming={isStreaming}
            />
          ) : (
            <EnhancedMessageBubble 
              key={message.id || index} 
              message={message}
              isStreaming={isStreaming}
            />
          );
        })
      )}
      
      {/* Only show separate typing indicator if we don't already have one in the messages */}
      {isTyping && !hasTypingIndicator && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}