import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { Message } from "@/lib/chatService";
import { MessageParser } from './MessageParser';
import { DataDisplay } from './DataDisplaySystem';
import { CampaignDataCards } from './CampaignDataCards';
import ReactMarkdown from 'react-markdown';
import CampaignCreationCard from './CampaignCreationCard';

interface EnhancedMessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function EnhancedMessageBubble({ message, isStreaming = false }: EnhancedMessageBubbleProps) {
  const isUser = message.role === "user";
  const hasMetadata = message.metadata && Object.keys(message.metadata).length > 0;
  const isCampaignCreation = hasMetadata && (message.metadata as any)?.isCampaignCreation;
  
  // Extract the campaign data from the metadata, ensure it has the right type
  const campaignData = isCampaignCreation ? (message.metadata as any) : null;
  
  // If it's a user message, render a simpler bubble
  if (isUser) {
    return (
      <div className="flex justify-end group py-2">
        <div className="flex flex-row-reverse gap-3 max-w-[85%] md:max-w-[75%]">
          <div className="flex-shrink-0">
            <Avatar className="h-9 w-9 bg-primary overflow-hidden ring-2 ring-background">
              <div className="flex items-center justify-center h-full w-full">
                <User className="h-5 w-5 text-white" />
              </div>
            </Avatar>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground rounded-tr-sm">
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
            <div className="px-2 text-xs text-muted-foreground text-right">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract campaign data from the message if present
  const hasCampaignData = /impressions|clicks|cost|ctr|campaign|adgroup|roas/i.test(message.content);
  
  // Simple function to extract campaign data for visualization
  const extractCampaignData = () => {
    try {
      const campaigns = [];
      const insights = [];
      
      // Match campaign sections
      const campaignSections = message.content.split(/\n\s*\n/).filter(section => 
        /campaign|with|id|ctr|impressions|clicks|cost|conversions/i.test(section)
      );
      
      for (const section of campaignSections) {
        // Extract campaign ID
        const idMatch = section.match(/Campaign\s+(?:ID:|\(ID:|\(ID\s*:|ID\s*:|\w+\s+ID:)\s*(\d{8,})/i);
        if (!idMatch) continue;
        
        const id = idMatch[1];
        
        // Extract campaign name
        let name = '';
        const nameMatch = section.match(/Campaign\s+(?:with|named|called)\s+([^()\n]+?)(?:\s*\(|ID:|$)/i);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1].trim();
          if (name.toLowerCase() === 'with' || name === '') {
            name = 'Most Clicks';
          }
        } else if (section.includes('Most Clicks')) {
          name = 'Most Clicks';
        } else if (section.includes('Least Clicks')) {
          name = 'Least Clicks';
        }
        
        // Extract metrics
        const metrics = [];
        
        // Find impressions
        const impressionsMatch = section.match(/(?:Total\s+)?Impressions[:\s]+([0-9,]+)/i);
        if (impressionsMatch && impressionsMatch[1]) {
          const value = parseInt(impressionsMatch[1].replace(/,/g, ''));
          if (!isNaN(value)) {
            metrics.push({
              type: 'impressions' as const,
              label: 'Impressions',
              value
            });
          }
        }
        
        // Find clicks
        const clicksMatch = section.match(/(?:Total\s+)?Clicks[:\s]+([0-9,]+)/i);
        if (clicksMatch && clicksMatch[1]) {
          const value = parseInt(clicksMatch[1].replace(/,/g, ''));
          if (!isNaN(value)) {
            metrics.push({
              type: 'clicks' as const,
              label: 'Clicks', 
              value
            });
          }
        }
        
        // Find cost
        const costMatch = section.match(/(?:Total\s+)?Cost[:\s]+\$?([0-9,.]+)/i);
        if (costMatch && costMatch[1]) {
          const value = parseFloat(costMatch[1].replace(/,/g, ''));
          if (!isNaN(value)) {
            metrics.push({
              type: 'cost' as const,
              label: 'Cost',
              value
            });
          }
        }
        
        // Find conversions
        const conversionsMatch = section.match(/(?:Total\s+)?Conversions[:\s]+([0-9,]+)/i);
        if (conversionsMatch && conversionsMatch[1]) {
          const value = parseInt(conversionsMatch[1].replace(/,/g, ''));
          if (!isNaN(value)) {
            metrics.push({
              type: 'conversions' as const,
              label: 'Conversions',
              value
            });
          }
        }
        
        // Find CTR
        const ctrMatch = section.match(/(?:Click-Through Rate|CTR)[:\s]+([0-9.]+%?)/i);
        if (ctrMatch && ctrMatch[1]) {
          let value = parseFloat(ctrMatch[1].replace('%', ''));
          if (!isNaN(value)) {
            metrics.push({
              type: 'ctr' as const,
              label: 'CTR',
              value
            });
          }
        }
        
        // If we found metrics, add this campaign
        if (metrics.length > 0) {
          campaigns.push({
            id,
            name,
            metrics
          });
        }
      }
      
      // Extract insights if present
      const insightsSection = message.content.match(/Insights\s*(?:\n|:)([\s\S]*?)(?=\n\n|$)/i);
      if (insightsSection && insightsSection[1]) {
        const insightLines = insightsSection[1].split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
        
        insights.push(...insightLines);
      } else {
        // Look for descriptive insights in regular paragraphs
        const paragraphs = message.content.split(/\n\s*\n/);
        for (const para of paragraphs) {
          if (
            (para.includes('highest') || para.includes('lowest') || 
             para.includes('compared to') || para.includes('indicates')) && 
            !para.includes('Campaign ID')
          ) {
            insights.push(para.trim());
          }
        }
      }
      
      return { campaigns, insights };
    } catch (error) {
      console.error("Failed to extract campaign data:", error);
      return null;
    }
  };
  
  const campaignDataFromMessage = hasCampaignData ? extractCampaignData() : null;

  // For AI messages, parse the content
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group py-2`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 max-w-[85%] md:max-w-[75%]`}>
        <div className="flex-shrink-0">
          <Avatar className={`h-9 w-9 ${isUser ? 'bg-primary' : 'bg-indigo-600 dark:bg-zinc-800'} overflow-hidden ring-2 ring-background`}>
            <div className="flex items-center justify-center h-full w-full">
              {isUser ? (
                <User className="h-5 w-5 text-white" />
              ) : (
                <Bot className="h-5 w-5 text-white" />
              )}
            </div>
          </Avatar>
        </div>
        
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* For campaign creation messages, show the campaign card */}
          {!isUser && isCampaignCreation && campaignData && (
            <CampaignCreationCard campaignData={campaignData} />
          )}
          
          {/* For all messages, still show the message bubble */}
          <div 
            className={`p-3 rounded-2xl ${
              isUser 
                ? 'bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground rounded-tr-sm' 
                : 'bg-card border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm'
            } ${isStreaming ? 'border-l-4 border-l-indigo-500' : ''}`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <MessageParser messageContent={message.content} />
            )}
          </div>
          
          <div className={`px-2 text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.createdAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}