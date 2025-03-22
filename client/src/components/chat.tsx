import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  messages: Message[];
}

interface ChatProps {
  conversation: { conversation: Conversation; messages: Message[] } | undefined;
  isLoading: boolean;
}

export function Chat({ conversation, isLoading }: ChatProps) {
  const [isTyping, setIsTyping] = useState(false);

  // Simulate typing effect
  useEffect(() => {
    if (isLoading) {
      setIsTyping(true);
    } else {
      // Add a small delay before turning off typing indicator for better UX
      const typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 500);
      
      return () => clearTimeout(typingTimeout);
    }
  }, [isLoading]);

  if (!conversation && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No conversation selected</p>
      </div>
    );
  }

  if (isLoading && !conversation) {
    return (
      <div className="space-y-4">
        <MessageSkeleton role="user" />
        <MessageSkeleton role="assistant" />
      </div>
    );
  }

  const messages = conversation?.messages || [];

  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Start the conversation by typing a message below.</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))
      )}
      
      {isTyping && <TypingIndicator />}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 max-w-[80%]`}>
        <Avatar className={`h-8 w-8 ${isUser ? "bg-primary" : "bg-muted"}`}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </Avatar>
        
        <Card className={`p-3 ${
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        } shadow-sm`}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </Card>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex flex-row gap-3 max-w-[80%]">
        <Avatar className="h-8 w-8 bg-muted">
          <Bot className="h-4 w-4" />
        </Avatar>
        <Card className="p-3 bg-muted text-foreground shadow-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function MessageSkeleton({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} gap-3 max-w-[80%]`}>
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className={`h-16 w-[300px] rounded-md`} />
      </div>
    </div>
  );
}