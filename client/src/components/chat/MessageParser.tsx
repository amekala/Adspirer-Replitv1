import React from 'react';
import { CardData, Metric, Campaign, MetricType } from './DataDisplaySystem';

/**
 * This component analyzes chat message content and extracts structured data.
 * It can recognize patterns like:
 * - Campaign metrics (CTR, impressions, clicks, etc.)
 * - Campaign comparisons
 * - Tables
 * - Regular text
 * 
 * It then returns the appropriate cards for the DataDisplaySystem.
 */

interface MessageParserProps {
  messageContent: string;
  children: (data: CardData[]) => React.ReactNode;
}

export function MessageParser({ messageContent, children }: MessageParserProps) {
  // Parse the message content to extract structured data
  const parsedData = React.useMemo(() => {
    return parseMessageContent(messageContent);
  }, [messageContent]);

  // Render children with the parsed data
  return <>{children(parsedData)}</>;
}

// Main parsing function
function parseMessageContent(content: string): CardData[] {
  const results: CardData[] = [];
  
  // Skip parsing for user messages or very short messages
  if (content.length < 50) {
    results.push({ type: 'text', content });
    return results;
  }

  // Split content into sections (campaigns, comparisons, etc.)
  const sections = splitIntoSections(content);
  
  // Process each section
  sections.forEach(section => {
    // Try to extract a campaign comparison
    const comparisonData = extractCampaignComparison(section);
    if (comparisonData) {
      results.push({ type: 'comparison', content: comparisonData });
      return;
    }
    
    // Try to extract a single campaign
    const campaignData = extractCampaignData(section);
    if (campaignData) {
      results.push({ type: 'campaign', content: campaignData });
      return;
    }
    
    // Try to extract a table
    const tableData = extractTable(section);
    if (tableData) {
      results.push({ type: 'table', content: tableData });
      return;
    }
    
    // If there are metrics but not a full campaign, extract those
    const metrics = extractMetrics(section);
    if (metrics.length > 0) {
      // Group related metrics in a single card
      results.push({ 
        type: 'campaign', 
        content: { 
          id: 'metrics', 
          metrics 
        } 
      });
      return;
    }
    
    // If no structured data is found, treat as text
    if (section.trim()) {
      results.push({ type: 'text', content: section });
    }
  });
  
  return results;
}

// Helper functions

// Split content into logical sections
function splitIntoSections(content: string): string[] {
  // Split by major headings or patterns
  const sections = content.split(/(?:#{3,}|Campaign Performance Analysis|Comparison:|Conclusion:)/g);
  return sections.filter(s => s.trim().length > 0);
}

// Extract campaign comparison data
function extractCampaignComparison(content: string): any {
  // Pattern that might indicate a comparison
  if (!content.includes('Campaign') || !content.includes('ID')) {
    return null;
  }
  
  // Look for patterns of multiple campaigns being compared
  const campaignIds = extractCampaignIds(content);
  
  // Need at least 2 campaigns for a comparison
  if (campaignIds.length < 2) {
    return null;
  }
  
  // Extract campaigns' data
  const campaigns: Campaign[] = [];
  
  campaignIds.forEach(id => {
    // Find the section relating to this campaign
    const campaignRegex = new RegExp(`Campaign[^\\d]*(ID)?[^\\d]*${id}[\\s\\S]*?(Campaign|$)`, 'i');
    const match = content.match(campaignRegex);
    
    if (match) {
      const campaignSection = match[0];
      const campaign = extractCampaignData(campaignSection);
      
      if (campaign) {
        campaigns.push(campaign);
      }
    }
  });
  
  // Extract insights about the comparison
  const insights: string[] = [];
  
  // Look for patterns that suggest insights
  const insightPatterns = [
    /which is significantly (higher|lower) than/gi,
    /this suggests/gi,
    /indicates that/gi,
    /comparison:/gi,
    /interestingly/gi,
    /conclusion/gi
  ];
  
  insightPatterns.forEach(pattern => {
    const match = content.match(pattern);
    if (match) {
      const startIndex = content.indexOf(match[0]);
      const endIndex = content.indexOf('.', startIndex) + 1;
      
      if (endIndex > startIndex) {
        const insight = content.substring(startIndex, endIndex).trim();
        if (insight && !insights.includes(insight)) {
          insights.push(insight);
        }
      }
    }
  });
  
  // If we found campaigns, create a comparison
  if (campaigns.length >= 2) {
    return {
      title: "Campaign Comparison",
      campaigns,
      insights: insights.length > 0 ? insights : undefined
    };
  }
  
  return null;
}

// Extract a single campaign's data
function extractCampaignData(content: string): Campaign | null {
  // Extract campaign ID
  const idMatch = content.match(/Campaign\s+(?:ID)?\s*[:\s]+(\d{8,})/i);
  
  if (!idMatch) {
    return null;
  }
  
  const id = idMatch[1];
  
  // Extract metrics
  const metrics = extractMetrics(content);
  
  if (metrics.length === 0) {
    return null;
  }
  
  return {
    id,
    metrics
  };
}

// Extract all metrics from content
function extractMetrics(content: string): Metric[] {
  const metrics: Metric[] = [];
  
  // Patterns for different metrics
  const metricPatterns = [
    {
      type: 'impressions' as MetricType,
      name: 'Impressions',
      pattern: /(?:Total)?\s+(?:👁️|Impressions)[:"]?\s+(?:is|was|were|of)?\s*([,\d]+)/i
    },
    {
      type: 'clicks' as MetricType,
      name: 'Clicks',
      pattern: /(?:Total)?\s+(?:👆|Clicks)[:"]?\s+(?:is|was|were|of)?\s*([,\d]+)/i
    },
    {
      type: 'cost' as MetricType,
      name: 'Cost',
      pattern: /(?:Total)?\s+(?:💸|Cost)[:"]?\s+(?:is|was|were|of)?\s*\$?([,\d.]+)/i
    },
    {
      type: 'conversions' as MetricType,
      name: 'Conversions',
      pattern: /(?:Total)?\s+(?:✅|Conversions)[:"]?\s+(?:is|was|were|of)?\s*([,\d]+)/i
    },
    {
      type: 'ctr' as MetricType,
      name: 'CTR',
      pattern: /(?:Click-Through Rate|CTR)(?:\s+\(CTR\))?[:"]?\s+(?:is|was|were|of)?\s*([\d.]+)%?/i
    },
    {
      type: 'roas' as MetricType,
      name: 'ROAS',
      pattern: /(?:Return on Ad Spend|ROAS)(?:\s+\(ROAS\))?[:"]?\s+(?:is|was|were|of)?\s*(\$?[\d,.]+)(?:x|X)?/i
    }
  ];
  
  // Extract each metric
  metricPatterns.forEach(({ type, name, pattern }) => {
    const match = content.match(pattern);
    
    if (match) {
      // Parse value (remove commas and dollar signs)
      let value: string | number = match[1].replace(/,|\$/g, '');
      
      // Convert to number if possible
      if (!isNaN(parseFloat(value))) {
        value = parseFloat(value);
        
        // Ensure ROAS is displayed as a ratio (no percentage conversion)
        if (type === 'roas' && value < 1) {
          // If ROAS was entered as a percentage (e.g., 8.5 meaning 8.5%),
          // convert it to a proper ratio (0.085)
          if (value > 0.5) {
            value = value / 100;
          }
        }
      }
      
      metrics.push({
        type,
        name,
        value,
        unit: type === 'ctr' ? '%' : type === 'roas' ? 'x' : undefined
      });
    }
  });
  
  return metrics;
}

// Extract campaign IDs from content
function extractCampaignIds(content: string): string[] {
  const ids: string[] = [];
  let match;
  const idRegex = /Campaign\s+(?:ID)?\s*[:\s]+(\d{8,})/gi;
  
  // Use exec in a loop instead of matchAll to avoid TypeScript downlevel iteration issues
  while ((match = idRegex.exec(content)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  
  return ids;
}

// Extract table data from content
function extractTable(content: string): { headers: string[], rows: string[][] } | null {
  // Look for markdown table pattern
  const tablePattern = /\|([^\n]+)\|\n\|([-:]+\|)+\n((?:\|[^\n]+\|\n)+)/g;
  const match = tablePattern.exec(content);
  
  if (!match) {
    return null;
  }
  
  // Extract headers
  const headerRow = match[1];
  const headers = headerRow.split('|').map(h => h.trim()).filter(h => h.length > 0);
  
  // Extract body rows
  const bodyText = match[3];
  const rowTexts = bodyText.split('\n').filter(r => r.includes('|'));
  
  const rows = rowTexts.map(rowText => 
    rowText.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
  );
  
  if (headers.length === 0 || rows.length === 0) {
    return null;
  }
  
  return { headers, rows };
}