import React, { useState, useEffect, useRef } from "react";
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
        
        // Add debugging
        console.log("Conversation messages before sorting:", formatted.messages);
        
        // Sort messages by createdAt to maintain proper flow
        if (formatted.messages && formatted.messages.length > 0) {
          formatted.messages.sort((a, b) => {
            // Ensure we have valid dates (defensive coding)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });
          console.log(`Found ${formatted.messages.length} messages for conversation ${formatted.conversation.id}`);
          console.log("Conversation messages after sorting:", formatted.messages);
        }
        
        // Check if there's a typing indicator or streaming message
        const hasTypingMessage = formatted.messages.some(
          msg => (msg.id === 'typing-indicator') || 
                (typeof msg.id === 'string' && msg.id.startsWith('streaming-'))
        );
        
        // Check that we have both user and assistant messages
        const hasUserMessages = formatted.messages.some(msg => msg.role === 'user');
        const hasAssistantMessages = formatted.messages.some(msg => msg.role === 'assistant');
        
        console.log(`Message types - User: ${hasUserMessages}, Assistant: ${hasAssistantMessages}, Typing: ${hasTypingMessage}`);
        
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
    <div className="space-y-6 pb-4">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Start the conversation by typing a message below.</p>
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
  const hasMarkdown = !isUser && (
    message.content.includes('|') || 
    message.content.includes('**') || 
    message.content.includes('```')
  );
  
  // Process message content to enhance formatting (for AI messages only)
  const processedContent = React.useMemo(() => {
    if (isUser) return message.content;
    
    let processed = message.content;
    
    // Format tables with better styling
    if (processed.includes('|') && processed.includes('\n')) {
      // Replace markdown tables with styled HTML tables
      const tablePattern = /(\|[^\n]+\|\n)((?:\|:?[-]+:?)+\|\n)((?:\|[^\n]+\|\n)+)/g;
      processed = processed.replace(tablePattern, (match: string, headerRow: string, separator: string, bodyRows: string) => {
        // Extract headers
        const headers: string[] = headerRow.split('|')
          .filter((cell: string) => cell.trim().length > 0)
          .map((cell: string) => cell.trim());
        
        // Extract body rows
        const rows: string[][] = bodyRows.split('\n')
          .filter((row: string) => row.includes('|'))
          .map((row: string) => row.split('|')
            .filter((cell: string) => cell.trim().length > 0)
            .map((cell: string) => cell.trim())
          );
        
        // Render styled HTML table
        return `<div class="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 dark:bg-slate-800">
              <tr>
                ${headers.map((header: string) => `<th class="px-4 py-2 text-left font-medium">${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row: string[], i: number) => `
                <tr class="${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}">
                  ${row.map((cell: string) => {
                    // Style numeric values and metrics differently
                    let styledCell = cell;
                    
                    // Style percentages (e.g., CTR)
                    if (/\d+\.\d+%/.test(cell)) {
                      styledCell = cell.replace(/(\d+\.\d+%)/, '<span class="font-medium text-blue-600 dark:text-blue-400">$1</span>');
                    }
                    
                    // Style currency values
                    if (/\$\d+(\.\d+)?/.test(cell)) {
                      styledCell = cell.replace(/(\$\d+(\.\d+)?)/, '<span class="font-medium text-emerald-600 dark:text-emerald-400">$1</span>');
                    }
                    
                    return `<td class="px-4 py-2 border-t border-slate-200 dark:border-slate-700">${styledCell}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
      });
    }
    
    // Format metrics and KPIs with colorful badges
    const metricsPattern = /(CTR|ROAS|CPC|Impressions|Clicks|Conversions|Cost|Sales):\s*([^,\n]+)/gi;
    processed = processed.replace(metricsPattern, (match: string, metric: string, value: string) => {
      // Select appropriate icon and colors based on metric type
      let icon = '📊'; // Default icon
      let bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      let textColor = 'text-blue-700 dark:text-blue-300';
      
      if (/CTR/i.test(metric)) {
        icon = '🎯';
        bgColor = 'bg-purple-100 dark:bg-purple-900/30';
        textColor = 'text-purple-700 dark:text-purple-300';
      } else if (/ROAS|Sales/i.test(metric)) {
        icon = '💰';
        bgColor = 'bg-emerald-100 dark:bg-emerald-900/30';
        textColor = 'text-emerald-700 dark:text-emerald-300';
      } else if (/Cost|CPC/i.test(metric)) {
        icon = '💸';
        bgColor = 'bg-amber-100 dark:bg-amber-900/30';
        textColor = 'text-amber-700 dark:text-amber-300';
      } else if (/Impressions/i.test(metric)) {
        icon = '👁️';
        bgColor = 'bg-sky-100 dark:bg-sky-900/30';
        textColor = 'text-sky-700 dark:text-sky-300';
      } else if (/Clicks/i.test(metric)) {
        icon = '👆';
        bgColor = 'bg-indigo-100 dark:bg-indigo-900/30';
        textColor = 'text-indigo-700 dark:text-indigo-300';
      } else if (/Conversions/i.test(metric)) {
        icon = '✅';
        bgColor = 'bg-green-100 dark:bg-green-900/30';
        textColor = 'text-green-700 dark:text-green-300';
      }
      
      return `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-sm ${bgColor} ${textColor} mr-2 mb-2">
        <span class="mr-1">${icon}</span>
        <span class="font-medium">${metric}:</span> ${value}
      </span>`;
    });
    
    // Format campaign IDs with badges
    const campaignIdPattern = /Campaign(?:\s+ID)?[:\s]+(\d{8,})/gi;
    processed = processed.replace(campaignIdPattern, (match: string, id: string) => {
      return `Campaign <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">ID: ${id}</span>`;
    });
    
    // Format markdown bold text
    processed = processed.replace(/\*\*(.+?)\*\*/g, (match: string, content: string) => {
      return `<strong>${content}</strong>`;
    });
    
    // Format code blocks
    processed = processed.replace(/```(?:\w+)?\n([\s\S]+?)\n```/g, 
      (match: string, code: string) => {
        return `<pre class="bg-slate-100 dark:bg-slate-800 p-3 my-2 rounded-md overflow-x-auto text-xs"><code>${code}</code></pre>`;
      }
    );
    
    return processed;
  }, [isUser, message.content]);
  
  // Detect if we need to render HTML content
  const shouldRenderHTML = !isUser && (
    processedContent.includes('<table') || 
    processedContent.includes('<span class') || 
    processedContent.includes('<strong>') ||
    processedContent.includes('<pre')
  );
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group py-2 chat-message ${isUser ? 'user' : 'assistant'}`}>
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
          {shouldRenderHTML ? (
            <div 
              className="text-sm md:text-base prose-sm dark:prose-invert prose-headings:mb-2 prose-p:mb-2 prose-p:leading-relaxed prose-li:mb-0"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm md:text-base">
              {message.content}
              {isStreaming && <span className="inline-block animate-pulse ml-0.5">▌</span>}
            </div>
          )}
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