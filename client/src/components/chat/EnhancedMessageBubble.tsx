import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { Message } from "@/lib/chatService";
import { MessageParser } from './MessageParser';
import { DataDisplay } from './DataDisplaySystem';
import { CampaignDataCards } from './CampaignDataCards';

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

  // Check if the message contains campaign data patterns
  const hasCampaignData = (
    message.content.includes('Campaign ID') || 
    (message.content.includes('CTR') && message.content.includes('Impressions'))
  );
  
  // Try to extract campaign data from the message
  const extractCampaignData = () => {
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
            type: 'impressions',
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
            type: 'clicks',
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
            type: 'cost',
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
            type: 'conversions',
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
            type: 'ctr',
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
  };
  
  const campaignData = hasCampaignData ? extractCampaignData() : null;

  // For AI messages, parse the content
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
          {/* If we successfully extracted campaign data, use CampaignDataCards */}
          {hasCampaignData && campaignData && campaignData.campaigns.length > 0 ? (
            <div className="p-4">
              {/* Show streaming indicator if still typing */}
              {isStreaming && (
                <div className="mb-2">
                  <span className="inline-block animate-pulse">▌</span>
                </div>
              )}
              
              <CampaignDataCards 
                campaigns={campaignData.campaigns}
                insights={campaignData.insights}
              />
              
              {/* Add any non-campaign text */}
              {message.content.split(/\n\s*\n/).filter(para => 
                !/campaign|ctr|impressions|clicks|cost|conversions|insights/i.test(para) && 
                para.trim().length > 30
              ).map((para, i) => (
                <div key={i} className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                  {para}
                </div>
              ))}
            </div>
          ) : (
            // Use the regular MessageParser for other content
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
          )}
        </Card>
      </div>
    </div>
  );
}