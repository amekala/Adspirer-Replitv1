import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { Message } from "@/lib/chatService";
import { MessageParser } from './MessageParser';
import { DataDisplay } from './DataDisplaySystem';

interface EnhancedMessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function EnhancedMessageBubble({ message, isStreaming = false }: EnhancedMessageBubbleProps) {
  const isUser = message.role === "user";

  // If it's a user message, render a simpler bubble
  if (isUser) {
    return (
      <div className="flex justify-end group py-2 chat-message user">
        <div className="flex flex-row-reverse gap-3 max-w-[80%] md:max-w-[70%]">
          <div className="flex-shrink-0 ml-2">
            <Avatar className="h-9 w-9 bg-blue-600 self-start mt-0.5 overflow-hidden ring-2 ring-background">
              <div className="flex items-center justify-center h-full w-full">
                <User className="h-5 w-5 text-white" />
              </div>
            </Avatar>
          </div>
          
          <Card className="p-3 bg-blue-600 text-white border-0 shadow-md rounded-2xl rounded-tr-sm">
            <div className="whitespace-pre-wrap text-sm md:text-base">
              {message.content}
              {isStreaming && <span className="inline-block animate-pulse ml-0.5">▌</span>}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // For AI messages, parse the content for structured data
  return (
    <div className="flex justify-start group py-2 chat-message assistant">
      <div className="flex flex-row gap-3 max-w-[85%] md:max-w-[75%]">
        <div className="flex-shrink-0 mr-2">
          <Avatar className="h-9 w-9 bg-zinc-800 self-start mt-0.5 overflow-hidden ring-2 ring-background">
            <div className="flex items-center justify-center h-full w-full">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </Avatar>
        </div>
        
        <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md rounded-2xl rounded-tl-sm">
          <MessageParser messageContent={message.content}>
            {(parsedData) => 
              parsedData.length > 0 ? (
                <div className="space-y-3">
                  {/* If the AI is still typing, show the streaming indicator */}
                  {isStreaming && 
                    <div className="p-4 pb-0">
                      <span className="inline-block animate-pulse">▌</span>
                    </div>
                  }
                  
                  {/* Display all the structured cards */}
                  <DataDisplay data={parsedData} className="p-4 pt-0" />
                </div>
              ) : (
                // Fallback for completely unstructured content
                <div className="p-4 whitespace-pre-wrap text-sm md:text-base">
                  {message.content}
                  {isStreaming && <span className="inline-block animate-pulse ml-0.5">▌</span>}
                </div>
              )
            }
          </MessageParser>
        </Card>
      </div>
    </div>
  );
}