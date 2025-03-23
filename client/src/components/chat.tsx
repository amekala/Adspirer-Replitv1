import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User } from "lucide-react";
import { Message, Conversation, formatConversationResponse } from "@/lib/chatService";

interface ChatProps {
  conversation: any; // This will be processed into the correct format
  isLoading: boolean;
}

export function Chat({ conversation, isLoading }: ChatProps) {
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
        
        // Sort messages by createdAt to maintain proper flow
        if (formatted.messages && formatted.messages.length > 0) {
          formatted.messages.sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          console.log(`Found ${formatted.messages.length} messages for conversation ${formatted.conversation.id}`);
        }
        
        // Check if there's a typing indicator or streaming message
        const hasTypingMessage = formatted.messages.some(
          msg => msg.id === 'typing-indicator' || (typeof msg.id === 'string' && msg.id.startsWith('streaming-'))
        );
        
        setProcessed(formatted);
        setIsTyping(hasTypingMessage);
      } catch (error) {
        console.error("Error formatting conversation:", error);
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
        <p className="text-muted-foreground">No conversation selected</p>
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
    <div className="space-y-6 pb-4 chat-component">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Start the conversation by typing a message below.</p>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Ask questions about your ad campaigns</p>
            <p className="mt-2 max-w-md mx-auto">
              Our AI combines your campaign data with analytical capabilities to provide 
              detailed insights and actionable recommendations.
            </p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageBubble 
            key={message.id || index} 
            message={message} 
            isStreaming={
              typeof message.id === 'string' && 
              (message.id === 'typing-indicator' || message.id.startsWith('streaming-'))
            }
          />
        ))
      )}
      
      {/* Only show separate typing indicator if we don't already have one in the messages */}
      {isTyping && !hasTypingIndicator && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({ message, isStreaming = false }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group py-2`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 max-w-[80%] md:max-w-[70%]`}>
        <div className={`flex-shrink-0 ${isUser ? "ml-2" : "mr-2"}`}>
          <Avatar className={`h-9 w-9 ${isUser ? "bg-blue-600" : "bg-zinc-800"} self-start mt-0.5 overflow-hidden ring-2 ring-background`}>
            {isUser ? (
              <div className="flex items-center justify-center h-full w-full">
                <User className="h-5 w-5 text-white" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
          </Avatar>
        </div>
        
        <Card className={`p-3 ${
          isUser 
            ? "bg-blue-600 text-white border-0" 
            : "bg-gray-100 dark:bg-zinc-800 text-foreground border-0"
        } shadow-md rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
          <div className="whitespace-pre-wrap text-sm md:text-base">
            {message.content}
            {isStreaming && <span className="inline-block animate-pulse ml-0.5">▌</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start py-2">
      <div className="flex flex-row gap-3 max-w-[80%]">
        <div className="flex-shrink-0 mr-2">
          <Avatar className="h-9 w-9 bg-zinc-800 overflow-hidden ring-2 ring-background">
            <div className="flex items-center justify-center h-full w-full">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </Avatar>
        </div>
        <Card className="p-3 bg-gray-100 dark:bg-zinc-800 text-foreground border-0 shadow-md rounded-2xl rounded-tl-sm">
          <div className="flex space-x-1.5 px-1 py-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function MessageSkeleton({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} py-2`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 max-w-[80%]`}>
        <div className={`flex-shrink-0 ${isUser ? "ml-2" : "mr-2"}`}>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className={`h-14 w-[280px] rounded-2xl`} />
      </div>
    </div>
  );
}