import React from 'react';
import { Message } from "@/lib/chatService";
import { AdvancedDataPoint, ComparisonItem, KPIData, TimelineEvent } from './AdvancedVisualization';

/**
 * Advanced parser to extract structured data from AI responses
 * for visualization with charts, tables, and other rich components.
 */

// Types of data patterns that can be identified
export type DataPattern = 
  | 'kpi-dashboard'
  | 'time-series'
  | 'comparison'
  | 'distribution'
  | 'correlation'
  | 'timeline'
  | 'ranking'
  | 'treemap'
  | 'table'
  | 'text'
  | 'campaign-data';

// Result of parsing a message
export interface ParsedVisualizationData {
  type: DataPattern;
  title?: string;
  description?: string;
  data: any;
  originalText: string;
}

// Shapes that can be detected for visualizations
interface PatternMatch {
  type: DataPattern;
  confidence: number; // 0-1
  data: any;
  title?: string;
  description?: string;
  textRange: [number, number]; // Start and end indices of the matched text
}

/**
 * Component that parses a message for visualizable data patterns
 */
interface AdvancedDataParserProps {
  message: Message;
  children: (visualizations: ParsedVisualizationData[]) => React.ReactNode;
}

export function AdvancedDataParser({ message, children }: AdvancedDataParserProps) {
  // Parse the message content to extract visualizable data
  const parsedVisualizations = React.useMemo(() => {
    return parseMessageForVisualizations(message);
  }, [message]);

  // Render children with the parsed visualizations
  return <>{children(parsedVisualizations)}</>;
}

/**
 * Main parsing function to extract all visualizable patterns from a message
 */
function parseMessageForVisualizations(message: Message): ParsedVisualizationData[] {
  // First check if this is a direct visualization request from the user
  const directRequest = detectVisualizationRequest(message);
  if (directRequest) {
    return [directRequest];
  }
  
  const content = message.content;
  
  // Skip parsing for user messages or very short messages
  if (message.role === 'user' || content.length < 100) {
    return [];
  }

  const patterns: PatternMatch[] = [];

  // Try to identify different patterns in the message
  tryParseKPIDashboard(content, patterns);
  tryParseTimeSeriesData(content, patterns);
  tryParseComparisonData(content, patterns);
  tryParseDistributionData(content, patterns);
  tryParseCorrelationData(content, patterns);
  tryParseTimeline(content, patterns);
  tryParseTreemapData(content, patterns);
  tryParseTableData(content, patterns);
  
  // Try to extract campaign data even if it's not in a clearly defined section
  tryExtractCampaignData(content, patterns);

  // Sort by confidence (descending) and remove overlaps
  return resolveOverlappingPatterns(patterns).map(pattern => ({
    type: pattern.type,
    title: pattern.title,
    description: pattern.description,
    data: pattern.data,
    originalText: content.substring(pattern.textRange[0], pattern.textRange[1])
  }));
}

/**
 * KPI Dashboard: Look for multiple metrics with summary information
 */
function tryParseKPIDashboard(content: string, patterns: PatternMatch[]) {
  // Look for sections that might contain KPIs
  const kpiSections = [
    ...content.matchAll(/(?:Performance|Overview|Summary|Metrics|Dashboard|Report)[\s\S]*?(?:Summary|Highlights|Key Metrics)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];

  for (const section of kpiSections) {
    if (!section[1]) continue;
    
    const kpisText = section[0];
    const startIndex = content.indexOf(kpisText);
    if (startIndex === -1) continue;
    
    const endIndex = startIndex + kpisText.length;
    
    // Extract title
    const titleMatch = kpisText.match(/^(.*?)(?::|\.|\n)/);
    const title = titleMatch ? titleMatch[1].trim() : "Performance Overview";
    
    // Extract individual KPIs
    const kpis: KPIData[] = [];
    
    // Various metric patterns
    const metricPatterns = [
      // "Metric: value" pattern
      /(?:•|\-|\*|\d+\.|)[^\n]*?(CTR|Clicks|Impressions|Conversions|Cost|ROAS|CPC|CPA|ROI|Sales|Revenue)(?:[:\s]+|\s+is\s+|\s+was\s+)[^\n\d]*?([\d,.]+%?|\$[\d,.]+|[\d,.]+x)/gi,
      
      // "value is the metric" pattern
      /(?:•|\-|\*|\d+\.|)[^\n]*?([\d,.]+%?|\$[\d,.]+|[\d,.]+x)[^\n]*?(?:is|was)[^\n]*?(CTR|Clicks|Impressions|Conversions|Cost|ROAS|CPC|CPA|ROI|Sales|Revenue)/gi
    ];
    
    for (const pattern of metricPatterns) {
      const matches = [...kpisText.matchAll(pattern)];
      
      for (const match of matches) {
        let metricName, value;
        
        if (pattern.source.startsWith('(?:•|\\-|\\*|\\d+\\.|)[^\\n]*?(CTR|')) {
          // First pattern
          metricName = match[1];
          value = match[2];
        } else {
          // Second pattern
          metricName = match[2];
          value = match[1];
        }
        
        // Skip if already found
        if (kpis.some(kpi => kpi.title === metricName)) continue;
        
        // Extract value and type
        let numValue = parseFloat(value.replace(/[$,%x]/g, ''));
        if (isNaN(numValue)) continue;
        
        // Determine metric type
        let type: string;
        switch (metricName.toLowerCase()) {
          case 'ctr': type = 'ctr'; break;
          case 'clicks': type = 'clicks'; break;
          case 'impressions': type = 'impressions'; break;
          case 'conversions': type = 'conversions'; break;
          case 'cost': case 'cpc': case 'cpa': type = 'cost'; break;
          case 'roas': case 'roi': type = 'roas'; break;
          case 'sales': case 'revenue': type = 'sales'; break;
          default: type = 'default';
        }
        
        // Look for change percentage
        const changePattern = new RegExp(`${metricName}[^%\n]*?(?:increased|decreased|up|down|grew|dropped)\\s+by\\s+([\\d.]+)%`, 'i');
        const changeMatch = kpisText.match(changePattern);
        let change: number | undefined = undefined;
        
        if (changeMatch && changeMatch[1]) {
          change = parseFloat(changeMatch[1]);
          // Apply sign based on direction
          if (kpisText.substring(changeMatch.index!, changeMatch.index! + 50).match(/decreased|down|dropped/i)) {
            change = -change;
          }
        }
        
        kpis.push({
          title: metricName,
          value: numValue,
          type,
          change
        });
      }
    }
    
    // Only add if we found multiple metrics
    if (kpis.length >= 3) {
      patterns.push({
        type: 'kpi-dashboard',
        confidence: 0.8,
        data: kpis,
        title,
        textRange: [startIndex, endIndex]
      });
    }
  }
}

/**
 * Time Series: Look for data with dates and values
 */
function tryParseTimeSeriesData(content: string, patterns: PatternMatch[]) {
  // Look for time series sections with dates
  const timeSeriesSections = [
    ...content.matchAll(/(?:Trend|Performance Over Time|Historical Data|Time Series)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  // Also look for table-like structures with dates
  const tablePatterns = [
    // Markdown table pattern
    /\|[^|\n]*?(?:Date|Day|Week|Month|Year)[^|\n]*\|(?:[^|\n]*?\|)+\n\|(?:[-:]+\|)+\n((?:\|[^|\n]*?\|(?:[^|\n]*?\|)*\n)+)/g,
    
    // List of dates pattern
    /(?:(?:•|\-|\*|\d+\.)\s*([A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?):([^\n]+)(?:\n|$))+/g
  ];
  
  // Process table patterns first
  for (const tablePattern of tablePatterns) {
    const tables = [...content.matchAll(tablePattern)];
    
    for (const table of tables) {
      const tableText = table[0];
      const startIndex = content.indexOf(tableText);
      if (startIndex === -1) continue;
      
      const endIndex = startIndex + tableText.length;
      
      // Extract metrics and dates
      const timeSeriesData = [];
      let metrics: string[] = [];
      
      if (tablePattern.source.startsWith('\\|')) {
        // Parse markdown table
        const lines = tableText.split('\n').filter(line => line.trim());
        
        // Get headers
        const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
        const dateColumnIndex = headers.findIndex(h => /Date|Day|Week|Month|Year/i.test(h));
        
        if (dateColumnIndex === -1) continue;
        
        // Get metrics (all other numeric columns)
        metrics = headers.filter((h, i) => i !== dateColumnIndex);
        
        // Parse rows (skip header and separator row)
        for (let i = 2; i < lines.length; i++) {
          const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
          if (cells.length !== headers.length) continue;
          
          const entry: any = { date: cells[dateColumnIndex] };
          
          metrics.forEach((metric, metricIndex) => {
            const columnIndex = headers.indexOf(metric);
            if (columnIndex !== -1) {
              const value = parseFloat(cells[columnIndex].replace(/[$,%]/g, ''));
              if (!isNaN(value)) {
                entry[metric.toLowerCase()] = value;
              }
            }
          });
          
          timeSeriesData.push(entry);
        }
      } else {
        // Parse list-style dates
        const dateEntries = tableText.split('\n').filter(line => /^(?:•|-|\*|\d+\.)/.test(line.trim()));
        
        // Extract metrics from the content
        const metricMatch = content.substring(Math.max(0, startIndex - 100), startIndex).match(/(?:tracking|measuring|monitoring|analyzing)\s+([^.,]+)/i);
        if (metricMatch) {
          const metricText = metricMatch[1];
          metrics = ['value'];
          
          if (/clicks|impressions|conversions|cost|ctr|roi|roas/i.test(metricText)) {
            metrics = Array.from(new Set([
              ...metricText.match(/clicks|impressions|conversions|cost|ctr|roi|roas/gi) || []
            ])).map(m => m.toLowerCase());
          }
        } else {
          metrics = ['value'];
        }
        
        // Parse entries
        for (const entry of dateEntries) {
          const match = entry.match(/(?:•|\-|\*|\d+\.)\s*([A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?):([^\n]+)/);
          if (!match) continue;
          
          const date = match[1];
          const valueText = match[2];
          
          // Extract numeric values
          const valueMatch = valueText.match(/([\d,.]+)/);
          if (!valueMatch) continue;
          
          const value = parseFloat(valueMatch[1].replace(/,/g, ''));
          if (isNaN(value)) continue;
          
          timeSeriesData.push({
            date,
            [metrics[0]]: value
          });
        }
      }
      
      // Only add if we have enough data points
      if (timeSeriesData.length >= 3) {
        patterns.push({
          type: 'time-series',
          confidence: 0.75,
          data: {
            metrics,
            timeSeriesData
          },
          title: "Performance Over Time",
          textRange: [startIndex, endIndex]
        });
      }
    }
  }
  
  // Process time series narrative sections
  for (const section of timeSeriesSections) {
    // Implementation for narrative time series data
    // Omitted for brevity
  }
}

/**
 * Comparison: Look for comparisons between multiple campaigns or metrics
 */
function tryParseComparisonData(content: string, patterns: PatternMatch[]) {
  // Look for comparison sections
  const comparisonSections = [
    ...content.matchAll(/(?:Comparison|Versus|vs\.|Comparing|Compare)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  for (const section of comparisonSections) {
    if (!section[1]) continue;
    
    const comparisonText = section[0];
    const startIndex = content.indexOf(comparisonText);
    if (startIndex === -1) continue;
    
    const endIndex = startIndex + comparisonText.length;
    
    // Extract title
    const titleMatch = comparisonText.match(/^([^:.\n]+)/);
    const title = titleMatch ? titleMatch[0].trim() : "Campaign Comparison";
    
    // Extract description 
    const descMatch = comparisonText.match(/^[^:.\n]+[:.]\s*([^.\n]+)/);
    const description = descMatch ? descMatch[1].trim() : undefined;
    
    // Look for campaign IDs or names
    const campaignMatches = [
      ...comparisonText.matchAll(/Campaign\s+(?:ID:|\(ID:|\(ID\s*:|ID\s*:|\w+\s+ID:)\s*(\d{8,})/gi),
      ...comparisonText.matchAll(/Campaign\s+(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9\s]+))\s+has/gi)
    ];
    
    const comparisonItems: ComparisonItem[] = [];
    
    // For each campaign, extract metrics
    for (const campaign of campaignMatches) {
      const id = campaign[1] || campaign[2] || campaign[3] || 'unknown';
      
      // Find the section relating to this campaign
      const campaignSection = comparisonText.substring(campaign.index!, Math.min(
        campaign.index! + 300,
        comparisonText.indexOf('\n\n', campaign.index!) !== -1 
          ? comparisonText.indexOf('\n\n', campaign.index!) 
          : comparisonText.length
      ));
      
      // Extract metrics
      const metrics = [];
      const metricPatterns = [
        /(?:CTR|Click-Through Rate)[:\s]+([0-9.]+)%/gi,
        /(?:Impressions)[:\s]+([0-9,]+)/gi,
        /(?:Clicks)[:\s]+([0-9,]+)/gi,
        /(?:Cost)[:\s]+\$?([0-9,.]+)/gi,
        /(?:Conversions)[:\s]+([0-9,]+)/gi,
        /(?:ROAS|Return on Ad Spend)[:\s]+([0-9.]+)x/gi
      ];
      
      for (const pattern of metricPatterns) {
        const match = pattern.exec(campaignSection);
        if (!match) continue;
        
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (isNaN(value)) continue;
        
        let type: string;
        let name: string;
        
        if (pattern.source.includes('CTR|Click-Through')) {
          type = 'ctr';
          name = 'CTR';
        } else if (pattern.source.includes('Impressions')) {
          type = 'impressions';
          name = 'Impressions';
        } else if (pattern.source.includes('Clicks')) {
          type = 'clicks';
          name = 'Clicks';
        } else if (pattern.source.includes('Cost')) {
          type = 'cost';
          name = 'Cost';
        } else if (pattern.source.includes('Conversions')) {
          type = 'conversions';
          name = 'Conversions';
        } else if (pattern.source.includes('ROAS|Return')) {
          type = 'roas';
          name = 'ROAS';
        } else {
          continue;
        }
        
        metrics.push({
          name,
          value,
          type
        });
      }
      
      if (metrics.length > 0) {
        comparisonItems.push({
          name: id,
          metrics
        });
      }
    }
    
    // Only add if we have at least two items to compare
    if (comparisonItems.length >= 2) {
      patterns.push({
        type: 'comparison',
        confidence: 0.8,
        data: comparisonItems,
        title,
        description,
        textRange: [startIndex, endIndex]
      });
    }
  }
}

/**
 * Distribution: Look for data that shows percentage breakdowns
 */
function tryParseDistributionData(content: string, patterns: PatternMatch[]) {
  // Look for distribution sections
  const distributionSections = [
    ...content.matchAll(/(?:Distribution|Breakdown|Composition|Share|Split)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  for (const section of distributionSections) {
    if (!section[1]) continue;
    
    const distributionText = section[0];
    const startIndex = content.indexOf(distributionText);
    if (startIndex === -1) continue;
    
    const endIndex = startIndex + distributionText.length;
    
    // Extract title
    const titleMatch = distributionText.match(/^([^:.\n]+)/);
    const title = titleMatch ? titleMatch[0].trim() : "Distribution Breakdown";
    
    // Extract items with percentages (bullet points or list items)
    const itemMatches = [
      ...distributionText.matchAll(/(?:•|\-|\*|\d+\.)\s*([^:\n]+):\s*([0-9.]+)%/gi),
      ...distributionText.matchAll(/(?:•|\-|\*|\d+\.)\s*([^:\n]+)\s+(?:accounts for|represents|makes up)\s+([0-9.]+)%/gi)
    ];
    
    const distributionData: AdvancedDataPoint[] = [];
    
    for (const item of itemMatches) {
      const name = item[1].trim();
      const value = parseFloat(item[2]);
      if (isNaN(value)) continue;
      
      distributionData.push({
        name,
        value
      });
    }
    
    // Only add if we have enough data points
    if (distributionData.length >= 3) {
      patterns.push({
        type: 'distribution',
        confidence: 0.75,
        data: distributionData,
        title,
        textRange: [startIndex, endIndex]
      });
    }
  }
}

/**
 * Timeline: Look for chronological events with dates
 */
function tryParseTimeline(content: string, patterns: PatternMatch[]) {
  // Look for timeline sections
  const timelineSections = [
    ...content.matchAll(/(?:Timeline|History|Events|Chronology|Milestones)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  for (const section of timelineSections) {
    if (!section[1]) continue;
    
    const timelineText = section[0];
    const startIndex = content.indexOf(timelineText);
    if (startIndex === -1) continue;
    
    const endIndex = startIndex + timelineText.length;
    
    // Extract title
    const titleMatch = timelineText.match(/^([^:.\n]+)/);
    const title = titleMatch ? titleMatch[0].trim() : "Campaign Timeline";
    
    // Find date patterns with descriptions
    const datePatterns = [
      // MM/DD/YYYY format
      /(?:•|\-|\*|\d+\.)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})(?:[\s:-]+)([^\n]+)/g,
      
      // Month Day, Year format
      /(?:•|\-|\*|\d+\.)\s*([A-Z][a-z]+\s+\d{1,2}(?:,\s+\d{4})?)(?:[\s:-]+)([^\n]+)/g,
      
      // YYYY-MM-DD format
      /(?:•|\-|\*|\d+\.)\s*(\d{4}-\d{2}-\d{2})(?:[\s:-]+)([^\n]+)/g
    ];
    
    const timelineEvents: TimelineEvent[] = [];
    
    for (const pattern of datePatterns) {
      const matches = [...timelineText.matchAll(pattern)];
      
      for (const match of matches) {
        const date = match[1];
        const description = match[2].trim();
        
        // Extract event title (first phrase or until punctuation)
        const titleMatch = description.match(/^([^.,;:!?]+)/);
        const eventTitle = titleMatch ? titleMatch[0].trim() : "Event";
        
        const eventDesc = description.replace(titleMatch ? titleMatch[0] : '', '').trim();
        
        timelineEvents.push({
          date,
          title: eventTitle,
          description: eventDesc.length > 0 ? eventDesc : undefined
        });
      }
    }
    
    // Only add if we have multiple events
    if (timelineEvents.length >= 2) {
      patterns.push({
        type: 'timeline',
        confidence: 0.8,
        data: timelineEvents,
        title,
        textRange: [startIndex, endIndex]
      });
    }
  }
}

/**
 * Look for data suitable for correlation/scatter analysis
 */
function tryParseCorrelationData(content: string, patterns: PatternMatch[]) {
  // Look for correlation sections
  const correlationSections = [
    ...content.matchAll(/(?:Correlation|Relationship|Scatter|Analysis|Between)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  for (const section of correlationSections) {
    // Implementation for correlation data
    // Omitted for brevity
  }
}

/**
 * Look for hierarchical data suitable for a treemap
 */
function tryParseTreemapData(content: string, patterns: PatternMatch[]) {
  // Look for hierarchical data sections
  const hierarchySections = [
    ...content.matchAll(/(?:Budget Allocation|Spending|Distribution by Category|Hierarchical|Breakdown)[\s\S]*?(?::\s*\n|\.|$)([\s\S]*?)(?:\n\n|\n(?:[A-Z]|\d+\.)|$)/gi)
  ];
  
  for (const section of hierarchySections) {
    // Implementation for treemap data
    // Omitted for brevity
  }
}

/**
 * Look for data in tabular format
 */
function tryParseTableData(content: string, patterns: PatternMatch[]) {
  // Look for markdown tables
  const tableMatches = [...content.matchAll(/\|([^\n]+)\|\n\|([-:]+\|)+\n((?:\|[^\n]+\|\n)+)/g)];
  
  for (const tableMatch of tableMatches) {
    const tableText = tableMatch[0];
    const startIndex = content.indexOf(tableText);
    if (startIndex === -1) continue;
    
    const endIndex = startIndex + tableText.length;
    
    // Check for a title above the table
    let title = "Data Table";
    const titleMatch = content.substring(Math.max(0, startIndex - 100), startIndex).match(/(?:^|\n)([^.\n:]+)(?::|\.|\n)[^\n]*$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Extract headers
    const headerRow = tableMatch[1];
    const headers = headerRow.split('|').map(h => h.trim()).filter(h => h.length > 0);
    
    // Extract rows
    const bodyRows = tableMatch[3].split('\n').filter(r => r.includes('|'));
    const rows = bodyRows.map(r => 
      r.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0)
    );
    
    // Only add if it's a valid table
    if (headers.length > 0 && rows.length > 0) {
      patterns.push({
        type: 'table',
        confidence: 0.9,
        data: { headers, rows },
        title,
        textRange: [startIndex, endIndex]
      });
    }
  }
}

/**
 * Resolve overlapping patterns by selecting the highest confidence ones
 */
function resolveOverlappingPatterns(patterns: PatternMatch[]): PatternMatch[] {
  if (patterns.length <= 1) {
    return patterns;
  }
  
  // Sort by confidence (high to low)
  patterns.sort((a, b) => b.confidence - a.confidence);
  
  const resolved: PatternMatch[] = [];
  
  for (const pattern of patterns) {
    // Check if this pattern overlaps with any already resolved pattern
    const overlaps = resolved.some(p => 
      (pattern.textRange[0] >= p.textRange[0] && pattern.textRange[0] <= p.textRange[1]) ||
      (pattern.textRange[1] >= p.textRange[0] && pattern.textRange[1] <= p.textRange[1])
    );
    
    if (!overlaps) {
      resolved.push(pattern);
    }
  }
  
  return resolved;
}

/**
 * Detect if the message is explicitly requesting a visualization
 */
function detectVisualizationRequest(message: Message): ParsedVisualizationData | null {
  if (message.role !== 'user') return null;
  
  const content = message.content.toLowerCase();
  
  // Patterns for common visualization requests
  const patterns = [
    { type: 'time-series', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:line|area|time)\s+(?:chart|graph|plot|visualization)/i },
    { type: 'distribution', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:pie|donut|bar|distribution)\s+(?:chart|graph|plot|visualization)/i },
    { type: 'comparison', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:comparison|comparative|radar|versus|vs)\s+(?:chart|graph|plot|visualization)/i },
    { type: 'correlation', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:scatter|correlation|relationship)\s+(?:chart|graph|plot|visualization)/i },
    { type: 'kpi-dashboard', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:dashboard|overview|summary|kpi)/i },
    { type: 'timeline', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:timeline|history|chronology)/i },
    { type: 'treemap', pattern: /(?:give|show|create|generate)\s+(?:me\s+)?(?:a|an)?\s+(?:treemap|hierarchy|budget|allocation)/i }
  ];
  
  // Check for specific metrics mentioned
  const metrics = [
    { name: 'impressions', pattern: /impressions/i },
    { name: 'clicks', pattern: /clicks/i },
    { name: 'cost', pattern: /cost|spend/i },
    { name: 'conversions', pattern: /conversions/i },
    { name: 'ctr', pattern: /ctr|click.*through|click.*rate/i },
    { name: 'roas', pattern: /roas|return/i }
  ];
  
  // Check for time periods
  const timePatterns = [
    { period: 'day', pattern: /day|daily/i },
    { period: 'week', pattern: /week|weekly/i },
    { period: 'month', pattern: /month|monthly/i },
    { period: 'year', pattern: /year|yearly|annual/i },
    { period: 'quarter', pattern: /quarter|quarterly/i }
  ];
  
  // Look for direct visualization requests
  for (const { type, pattern } of patterns) {
    if (pattern.test(content)) {
      // Identify which metrics to include
      const requestedMetrics = metrics
        .filter(m => m.pattern.test(content))
        .map(m => m.name);
      
      // Identify time period if any
      const timePeriod = timePatterns.find(t => t.pattern.test(content))?.period || 'month';
      
      // If no specific metrics mentioned but type is time-series, default to impressions
      if (type === 'time-series' && requestedMetrics.length === 0) {
        requestedMetrics.push('impressions');
      }
      
      // Create dummy data for the visualization request
      let dummyData;
      let title = '';
      
      switch (type) {
        case 'time-series':
          title = `${requestedMetrics.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' and ')} Over Time`;
          
          // Generate time periods based on requested time period
          let dates: string[];
          if (timePeriod === 'day') {
            dates = Array.from({ length: 7 }, (_, i) => `Day ${i+1}`);
          } else if (timePeriod === 'week') {
            dates = Array.from({ length: 4 }, (_, i) => `Week ${i+1}`);
          } else if (timePeriod === 'month') {
            dates = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          } else if (timePeriod === 'quarter') {
            dates = ['Q1', 'Q2', 'Q3', 'Q4'];
          } else {
            dates = Array.from({ length: 5 }, (_, i) => `Year ${2020 + i}`);
          }
          
          // Generate data for each metric
          dummyData = {
            metrics: requestedMetrics,
            timeSeriesData: dates.map((date, i) => {
              const dataPoint: any = { date };
              requestedMetrics.forEach(metric => {
                // Generate realistic-looking data based on metric
                let baseValue: number;
                switch (metric) {
                  case 'impressions': baseValue = 10000 + Math.random() * 5000; break;
                  case 'clicks': baseValue = 500 + Math.random() * 200; break;
                  case 'cost': baseValue = 1000 + Math.random() * 500; break;
                  case 'conversions': baseValue = 50 + Math.random() * 20; break;
                  case 'ctr': baseValue = 2 + Math.random() * 1.5; break;
                  case 'roas': baseValue = 3 + Math.random() * 2; break;
                  default: baseValue = 100 + Math.random() * 50;
                }
                
                // Add some trend (increasing or occasional dips)
                const trend = i * (0.1 + Math.random() * 0.1);
                const fluctuation = Math.random() > 0.7 ? -0.2 : 0.1;
                dataPoint[metric] = Math.round(baseValue * (1 + trend + fluctuation));
              });
              return dataPoint;
            })
          };
          break;
          
        case 'distribution':
          title = 'Campaign Performance Distribution';
          dummyData = [
            { name: 'Campaign A', value: 35 },
            { name: 'Campaign B', value: 25 },
            { name: 'Campaign C', value: 20 },
            { name: 'Campaign D', value: 15 },
            { name: 'Others', value: 5 }
          ];
          break;
          
        case 'comparison':
          title = 'Campaign Metrics Comparison';
          
          // Create comparison data with metrics
          dummyData = [
            {
              name: 'Campaign A',
              metrics: requestedMetrics.length > 0 ? 
                requestedMetrics.map(metricName => ({
                  name: metricName.charAt(0).toUpperCase() + metricName.slice(1),
                  value: metricName === 'ctr' ? 3.2 : metricName === 'roas' ? 4.5 : 15000,
                  type: metricName
                })) : 
                [
                  { name: 'Impressions', value: 15000, type: 'impressions' },
                  { name: 'Clicks', value: 450, type: 'clicks' },
                  { name: 'CTR', value: 3.0, type: 'ctr' }
                ]
            },
            {
              name: 'Campaign B',
              metrics: requestedMetrics.length > 0 ? 
                requestedMetrics.map(metricName => ({
                  name: metricName.charAt(0).toUpperCase() + metricName.slice(1),
                  value: metricName === 'ctr' ? 2.8 : metricName === 'roas' ? 3.9 : 12000,
                  type: metricName
                })) : 
                [
                  { name: 'Impressions', value: 12000, type: 'impressions' },
                  { name: 'Clicks', value: 336, type: 'clicks' },
                  { name: 'CTR', value: 2.8, type: 'ctr' }
                ]
            }
          ];
          break;
          
        // Add other visualization types as needed
        default:
          return null;
      }
      
      // Return the visualization request with dummy data
      return {
        type: type as DataPattern,
        title,
        data: dummyData,
        originalText: message.content
      };
    }
  }
  
  return null;
}

/**
 * Try to extract campaign data even if it's not in a clearly defined section
 */
function tryExtractCampaignData(content: string, patterns: PatternMatch[]) {
  // Look for patterns that indicate campaign data
  const campaignIdMatches = [
    ...content.matchAll(/Campaign\s+(?:ID)?\s*[:\s]+(\d{8,})/gi)
  ];
  
  if (campaignIdMatches.length === 0) return;
  
  // Extract metrics from the content
  const campaigns = [];
  
  for (const match of campaignIdMatches) {
    const id = match[1];
    const startIndex = match.index!;
    const endIndex = startIndex + 500; // Look at a reasonable chunk of text
    const campaignSection = content.substring(startIndex, endIndex);
    
    // Extract metrics from this section
    const metrics: any[] = [];
    
    // Check for impressions
    const impressionsMatch = campaignSection.match(/(?:Total\s+)?Impressions[:\s]+([0-9,]+)/i);
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
    
    // Check for clicks
    const clicksMatch = campaignSection.match(/(?:Total\s+)?Clicks[:\s]+([0-9,]+)/i);
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
    
    // Check for CTR
    const ctrMatch = campaignSection.match(/(?:Click-Through Rate|CTR)[:\s]+([0-9.]+)%?/i);
    if (ctrMatch && ctrMatch[1]) {
      const value = parseFloat(ctrMatch[1]);
      if (!isNaN(value)) {
        metrics.push({
          type: 'ctr',
          label: 'CTR',
          value
        });
      }
    }
    
    // Add more metric extraction as needed
    
    if (metrics.length > 0) {
      campaigns.push({
        id,
        metrics
      });
    }
  }
  
  // Only add if we found campaigns with metrics
  if (campaigns.length > 0) {
    // Find a suitable title
    let title = "Campaign Performance";
    const titleMatch = content.match(/^\s*(Campaign[^.!?]*)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    patterns.push({
      type: 'campaign-data',
      confidence: 0.9,
      data: campaigns,
      title,
      textRange: [0, content.length]
    });
  }
} 