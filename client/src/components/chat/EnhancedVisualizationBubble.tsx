import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Bot, User, BarChart3, PieChart, LineChart, Table, ArrowRightLeft, Clock, PanelLeftOpen } from "lucide-react";
import { Message } from "@/lib/chatService";
import { AdvancedDataParser, ParsedVisualizationData } from './AdvancedDataParser';
import { MetricBarChart } from './ChartComponents';
import { 
  KPIDashboard, 
  RadarAnalysis, 
  ScatterMatrix, 
  InteractiveTimeline, 
  MetricTreeMap, 
  MultiViewVisualization 
} from './AdvancedVisualization';
import { MetricLineChart, MetricAreaChart, MetricPieChart } from './ChartComponents';
import { CampaignDataCards } from './CampaignDataCards';

interface EnhancedVisualizationBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function EnhancedVisualizationBubble({ message, isStreaming = false }: EnhancedVisualizationBubbleProps) {
  const isUser = message.role === "user";

  // For user messages, check if they're requesting a visualization
  if (isUser) {
    // Check if this is a direct request for a visualization
    if (isVisualizationRequest(message.content)) {
      // Show a loading indicator if we're streaming
      if (isStreaming) {
        return (
          <div className="flex justify-end group py-1.5 sm:py-2 chat-message user">
            <div className="flex flex-row-reverse gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
              <div className="flex-shrink-0 hidden xs:block">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-gradient-to-r from-indigo-500 to-purple-500 overflow-hidden ring-1 sm:ring-2 ring-white/10">
                  <div className="flex items-center justify-center h-full w-full">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </Avatar>
              </div>
              
              <div className="flex flex-col gap-1 items-end">
                <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white rounded-tr-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:brightness-110">
                  <div className="whitespace-pre-wrap text-sm md:text-base">
                    {message.content}
                    <span className="inline-block animate-pulse ml-0.5">▌</span>
                  </div>
                </div>
                <div className="px-2 text-[10px] sm:text-xs text-slate-400 text-right">
                  {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · Preparing visualization...
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div className="flex justify-end group py-1.5 sm:py-2 chat-message user">
          <div className="flex flex-row-reverse gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
            <div className="flex-shrink-0 hidden xs:block">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-gradient-to-r from-indigo-500 to-purple-500 overflow-hidden ring-1 sm:ring-2 ring-white/10">
                <div className="flex items-center justify-center h-full w-full">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </Avatar>
            </div>
            
            <div className="flex flex-col gap-1 items-end">
              <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white rounded-tr-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:brightness-110">
                <div className="whitespace-pre-wrap text-sm md:text-base">
                  {message.content}
                </div>
              </div>
              <div className="px-2 text-[10px] sm:text-xs text-slate-400 text-right">
                {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Standard user message display
    return (
      <div className="flex justify-end group py-1.5 sm:py-2 chat-message user">
        <div className="flex flex-row-reverse gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
          <div className="flex-shrink-0 hidden xs:block">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-gradient-to-r from-indigo-500 to-purple-500 overflow-hidden ring-1 sm:ring-2 ring-white/10">
              <div className="flex items-center justify-center h-full w-full">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </Avatar>
          </div>
          
          <div className="flex flex-col gap-1 items-end">
            <div className="p-2 sm:p-3 rounded-2xl bg-gradient-to-r from-indigo-500/80 to-purple-500/80 text-white rounded-tr-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:brightness-110">
              <div className="whitespace-pre-wrap text-sm md:text-base">
                {message.content}
                {isStreaming && <span className="inline-block animate-pulse ml-0.5">▌</span>}
              </div>
            </div>
            <div className="px-2 text-[10px] sm:text-xs text-slate-400 text-right">
              {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For AI messages, use the AdvancedDataParser to extract structured data for visualization
  return (
    <div className="flex justify-start group py-1.5 sm:py-2 chat-message assistant">
      <div className="flex flex-row gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
        <div className="flex-shrink-0 hidden xs:block">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-gradient-to-r from-blue-500 to-cyan-400 overflow-hidden ring-1 sm:ring-2 ring-white/10">
            <div className="flex items-center justify-center h-full w-full">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
          </Avatar>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-2xl rounded-tl-sm shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:bg-white/15">
            <AdvancedDataParser message={message}>
              {(visualizations) => (
                <div className="divide-y divide-white/10">
                  {/* If visualizations are found, render them */}
                  {visualizations.length > 0 ? (
                    visualizations.map((viz, index) => (
                      <div key={`viz-${index}`} className="p-3 sm:p-4">
                        {renderVisualization(viz, isStreaming)}
                      </div>
                    ))
                  ) : (
                    // If no structured data, try to extract campaign data directly
                    <div className="p-3 sm:p-4">
                      {tryExtractAndRenderCampaignData(message.content, isStreaming)}
                    </div>
                  )}
                </div>
              )}
            </AdvancedDataParser>
          </div>
          <div className="px-2 text-[10px] sm:text-xs text-slate-400">
            {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the appropriate visualization based on the parsed data type
 */
function renderVisualization(
  visualization: ParsedVisualizationData,
  isStreaming: boolean
): React.ReactNode {
  const { type, title, description, data, originalText } = visualization;
  
  // Show a loading placeholder if still streaming
  if (isStreaming) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-300 animate-pulse">
          {getVisualizationIcon(type)}
          <span>Preparing visualization...</span>
        </div>
        <div className="whitespace-pre-wrap text-sm md:text-base text-white">
          {originalText.substring(0, 100)}
          <span className="inline-block animate-pulse ml-0.5">▌</span>
        </div>
      </div>
    );
  }
  
  // Render based on the type of data detected
  switch (type) {
    case 'campaign-data':
      // For campaign data detected directly in message content
      return (
        <CampaignDataCards 
          campaigns={data} 
          showGraphs={true}
          className="w-full" 
        />
      );
    
    case 'kpi-dashboard':
      return <KPIDashboard kpis={data} title={title} description={description} />;
    
    case 'time-series':
      // For time series data, we can offer multiple visualization options
      return (
        <MultiViewVisualization
          title={title || "Performance Over Time"}
          description={description}
          views={[
            {
              id: 'line',
              label: 'Line Chart',
              chart: <MetricLineChart data={data.timeSeriesData} metrics={data.metrics} height={300} />
            },
            {
              id: 'area',
              label: 'Area Chart',
              chart: <MetricAreaChart data={data.timeSeriesData} metrics={data.metrics} height={300} />
            },
            {
              id: 'bar',
              label: 'Bar Chart',
              chart: <MetricBarChart 
                data={data.timeSeriesData.map((d: any) => ({
                  name: d.date,
                  value: d[data.metrics[0]]
                }))} 
                metricType={data.metrics[0]}
                height={300}
              />
            }
          ]}
        />
      );
    
    case 'comparison':
      return (
        <MultiViewVisualization
          title={title || "Campaign Comparison"}
          description={description}
          views={[
            {
              id: 'radar',
              label: 'Radar View',
              chart: <RadarAnalysis data={data} />
            },
            {
              id: 'bars',
              label: 'Bar Chart',
              chart: <MetricBarChart 
                data={data.map((item: any) => ({
                  name: item.name,
                  value: item.metrics[0]?.value || 0
                }))}
                title={`${data[0]?.metrics[0]?.name || 'Metric'} Comparison`}
                metricType={data[0]?.metrics[0]?.type || 'default'}
                height={300}
              />
            }
          ]}
        />
      );
    
    case 'distribution':
      return (
        <MultiViewVisualization
          title={title || "Distribution Analysis"}
          description={description}
          views={[
            {
              id: 'pie',
              label: 'Pie Chart',
              chart: <MetricPieChart data={data} height={300} />
            },
            {
              id: 'bar',
              label: 'Bar Chart',
              chart: <MetricBarChart data={data} height={300} />
            }
          ]}
        />
      );
    
    case 'correlation':
      if (data.xMetric && data.yMetric) {
        return (
          <ScatterMatrix 
            data={data.points}
            xMetric={data.xMetric}
            yMetric={data.yMetric}
            zMetric={data.zMetric}
            title={title || "Correlation Analysis"}
            description={description}
          />
        );
      }
      break;
    
    case 'timeline':
      return (
        <InteractiveTimeline 
          events={data}
          title={title || "Campaign Timeline"}
          description={description}
        />
      );
    
    case 'treemap':
      return (
        <MetricTreeMap 
          data={data}
          title={title || "Budget Allocation"}
          description={description}
        />
      );
    
    case 'table':
      return (
        <div className="overflow-x-auto">
          <h3 className="text-lg font-medium mb-3">{title || "Data Table"}</h3>
          {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{description}</p>}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                {data.headers.map((header: string, i: number) => (
                  <th key={`th-${i}`} className="px-4 py-2 text-left border-b border-slate-200 dark:border-slate-700 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row: string[], rowIndex: number) => (
                <tr 
                  key={`tr-${rowIndex}`}
                  className={rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}
                >
                  {row.map((cell: string, cellIndex: number) => (
                    <td key={`td-${rowIndex}-${cellIndex}`} className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    
    // When no visualization could be rendered, or for text content
    case 'text':
    default:
      // For raw text, check for campaign patterns we can extract
      if (originalText.includes('Campaign') && 
          (originalText.includes('Impressions') || originalText.includes('Clicks') || originalText.includes('CTR'))) {
        // Try to extract campaign data on the fly
        const campaignData = extractCampaignData(originalText);
        if (campaignData && campaignData.campaigns.length > 0) {
          return (
            <CampaignDataCards 
              campaigns={campaignData.campaigns}
              insights={campaignData.insights}
              showGraphs={true}
              className="w-full"
            />
          );
        }
      }
        
      return (
        <div className="whitespace-pre-wrap text-sm md:text-base text-white">
          {originalText}
        </div>
      );
  }
  
  // Fallback for unsupported visualizations
  return (
    <div className="whitespace-pre-wrap text-sm md:text-base text-white">
      {originalText}
    </div>
  );
}

// Helper function to extract campaign data from text
function extractCampaignData(text: string): { campaigns: any[], insights: string[] } | null {
  // Find campaign IDs 
  const campaignIds: string[] = [];
  const idRegex = /Campaign\s+(?:ID)?[:\s]+(\d{8,})/gi;
  let idMatch;
  
  // Use exec in a loop to avoid TypeScript downlevel iteration issues
  while ((idMatch = idRegex.exec(text)) !== null) {
    if (idMatch[1]) {
      campaignIds.push(idMatch[1]);
    }
  }
  
  if (campaignIds.length === 0) return null;
  
  // Extract campaigns
  const campaigns = [];
  
  for (const id of campaignIds) {
    // Find the section of text related to this campaign
    const campaignRegex = new RegExp(`Campaign[^\\d]*(ID)?[^\\d]*${id}[\\s\\S]*?(Campaign|$)`, 'i');
    const match = text.match(campaignRegex);
    
    if (!match) continue;
    
    const campaignSection = match[0];
    const metrics = [];
    
    // Look for impressions
    const impressionsMatch = campaignSection.match(/(?:Total\s+)?Impressions[:\s]+([0-9,]+)/i);
    if (impressionsMatch && impressionsMatch[1]) {
      const value = parseInt(impressionsMatch[1].replace(/,/g, ''));
      metrics.push({
        type: 'impressions',
        label: 'Impressions',
        value
      });
    }
    
    // Look for clicks
    const clicksMatch = campaignSection.match(/(?:Total\s+)?Clicks[:\s]+([0-9,]+)/i);
    if (clicksMatch && clicksMatch[1]) {
      const value = parseInt(clicksMatch[1].replace(/,/g, ''));
      metrics.push({
        type: 'clicks',
        label: 'Clicks',
        value
      });
    }
    
    // Look for CTR
    const ctrMatch = campaignSection.match(/(?:Click-Through Rate|CTR)[:\s]+([0-9.]+)%?/i);
    if (ctrMatch && ctrMatch[1]) {
      const value = parseFloat(ctrMatch[1]);
      metrics.push({
        type: 'ctr',
        label: 'CTR',
        value
      });
    }
    
    // Look for cost
    const costMatch = campaignSection.match(/(?:Total\s+)?Cost[:\s]+\$?([0-9,.]+)/i);
    if (costMatch && costMatch[1]) {
      const value = parseFloat(costMatch[1].replace(/,/g, ''));
      metrics.push({
        type: 'cost',
        label: 'Cost',
        value
      });
    }
    
    if (metrics.length > 0) {
      // Look for a name (e.g., "Campaign with Most Clicks")
      let name;
      const nameMatch = text.match(/Campaign with ([^:]+)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }
      
      campaigns.push({
        id,
        name,
        metrics
      });
    }
  }
  
  // Look for insights
  const insights: string[] = [];
  
  // Check for an insights section
  const insightsMatch = text.match(/Insights:?([\s\S]*?)(?:\n\n|$)/i);
  if (insightsMatch && insightsMatch[1]) {
    const insightsText = insightsMatch[1];
    const bulletPoints = insightsText.split(/\n\s*[-•*]\s*/);
    
    for (const point of bulletPoints) {
      if (point.trim().length > 10) {
        insights.push(point.trim());
      }
    }
  }
  
  return {
    campaigns,
    insights
  };
}

// Check if a user message is explicitly requesting a visualization
function isVisualizationRequest(content: string): boolean {
  const visualizationKeywords = [
    /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:line|area|bar|pie|chart|graph|plot|visualization)/i,
    /(?:visualize|display|present)\s+(?:the|my|this)?\s+data/i,
    /(?:plot|chart|graph)\s+(?:the|my|this)?\s+(?:data|metrics|performance|results)/i
  ];
  
  return visualizationKeywords.some(pattern => pattern.test(content));
}

// Try to extract campaign data directly from the message content
function tryExtractAndRenderCampaignData(content: string, isStreaming: boolean): React.ReactNode {
  // Don't try to extract while still streaming
  if (isStreaming) {
    return (
      <div className="whitespace-pre-wrap text-sm md:text-base text-white">
        {content}
        <span className="inline-block animate-pulse ml-0.5">▌</span>
      </div>
    );
  }
  
  // If content contains relevant campaign metrics, try to extract
  if (content.includes('Campaign') && 
      (content.includes('Impressions') || content.includes('Clicks') || content.includes('CTR'))) {
    // Try to extract campaign data on the fly
    const campaignData = extractCampaignData(content);
    if (campaignData && campaignData.campaigns.length > 0) {
      return (
        <CampaignDataCards 
          campaigns={campaignData.campaigns}
          insights={campaignData.insights}
          showGraphs={true}
          className="w-full"
        />
      );
    }
  }
  
  // If extraction failed, just render the content as is
  return (
    <div className="whitespace-pre-wrap text-sm md:text-base text-white">
      {content}
    </div>
  );
}

/**
 * Get the appropriate icon for a visualization type
 */
function getVisualizationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'kpi-dashboard':
    case 'campaign-data':
      return <BarChart3 className="h-5 w-5" />;
    case 'time-series':
      return <LineChart className="h-5 w-5" />;
    case 'comparison':
      return <ArrowRightLeft className="h-5 w-5" />;
    case 'distribution':
      return <PieChart className="h-5 w-5" />;
    case 'correlation':
      return <PanelLeftOpen className="h-5 w-5" />;
    case 'timeline':
      return <Clock className="h-5 w-5" />;
    case 'table':
      return <Table className="h-5 w-5" />;
    default:
      return <Bot className="h-5 w-5" />;
  }
} 