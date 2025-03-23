import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MousePointer, 
  Eye, 
  ShoppingCart, 
  Target,
  Info
} from "lucide-react";

/**
 * A reusable card-based display system for chat interfaces.
 * This component can intelligently parse and display different types 
 * of data in appropriate visual formats while maintaining consistency.
 */

// ========== TYPES ==========

// Types of data that might appear in a chat message
export type MetricType = 'ctr' | 'impressions' | 'clicks' | 'cost' | 'conversions' | 'sales' | 'roas';

export interface Metric {
  type: MetricType;
  name: string;  // Display name (e.g., "Click-Through Rate")
  value: string | number;
  previousValue?: string | number;
  change?: number;
  unit?: string;  // E.g., '%', '$', etc.
}

export interface Campaign {
  id: string;
  name?: string;
  metrics: Metric[];
}

export interface ComparisonData {
  title: string;
  campaigns: Campaign[];
  insights?: string[];
}

export interface CardData {
  type: 'metric' | 'campaign' | 'comparison' | 'text' | 'table';
  content: any;
}

// Component props
export interface DataDisplayProps {
  data: CardData | CardData[];
  className?: string;
}

// ========== UTILITY FUNCTIONS ==========

// Get appropriate icon for a metric
const getMetricIcon = (type: MetricType) => {
  switch (type) {
    case 'ctr': return <Target className="h-4 w-4" />;
    case 'impressions': return <Eye className="h-4 w-4" />;
    case 'clicks': return <MousePointer className="h-4 w-4" />;
    case 'cost': return <DollarSign className="h-4 w-4" />;
    case 'conversions': return <ShoppingCart className="h-4 w-4" />;
    case 'sales': return <DollarSign className="h-4 w-4" />;
    case 'roas': return <BarChart3 className="h-4 w-4" />;
    default: return <Info className="h-4 w-4" />;
  }
};

// Get the appropriate color scheme for a metric
const getMetricColorScheme = (type: MetricType) => {
  switch (type) {
    case 'ctr': return {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800/50',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-500 dark:text-purple-400'
    };
    case 'impressions': return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800/50',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500 dark:text-blue-400'
    };
    case 'clicks': return {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-200 dark:border-indigo-800/50',
      text: 'text-indigo-700 dark:text-indigo-300',
      icon: 'text-indigo-500 dark:text-indigo-400'
    };
    case 'cost': return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/50',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500 dark:text-amber-400'
    };
    case 'conversions': return {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800/50',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-500 dark:text-green-400'
    };
    case 'sales': 
    case 'roas': return {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500 dark:text-emerald-400'
    };
    default: return {
      bg: 'bg-slate-50 dark:bg-slate-800/20',
      border: 'border-slate-200 dark:border-slate-700/50',
      text: 'text-slate-700 dark:text-slate-300',
      icon: 'text-slate-500 dark:text-slate-400'
    };
  }
};

// Format value with appropriate prefix/suffix
const formatValue = (value: string | number, type: MetricType, unit?: string) => {
  if (typeof value === 'string') {
    return value;
  }
  
  switch (type) {
    case 'cost':
    case 'sales':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    case 'ctr':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit || '%'}`;
    case 'roas':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit || 'x'}`;
    default:
      return value.toLocaleString('en-US');
  }
};

// ========== COMPONENTS ==========

// Single Metric Card Component
const MetricCard = ({ metric }: { metric: Metric }) => {
  const colors = getMetricColorScheme(metric.type);
  const icon = getMetricIcon(metric.type);
  const formattedValue = formatValue(metric.value, metric.type, metric.unit);
  
  return (
    <Card className={`${colors.bg} border ${colors.border} p-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${colors.icon}`}>
            {icon}
          </div>
          <h3 className={`text-sm font-medium ${colors.text}`}>{metric.name}</h3>
        </div>
        
        {metric.change !== undefined && (
          <div className={`flex items-center text-xs font-medium ${
            metric.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {metric.change >= 0 ? 
              <TrendingUp className="h-3 w-3 mr-1" /> : 
              <TrendingDown className="h-3 w-3 mr-1" />
            }
            {Math.abs(metric.change).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
        {formattedValue}
      </div>
      
      {metric.previousValue && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Prev: {formatValue(metric.previousValue, metric.type, metric.unit)}
        </div>
      )}
    </Card>
  );
};

// Campaign Summary Card Component
const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 p-4 shadow-sm bg-white dark:bg-slate-900">
      <div className="flex items-center mb-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Campaign <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            ID: {campaign.id}
          </span>
        </h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {campaign.metrics.map((metric, index) => (
          <MetricCard key={`${campaign.id}-${metric.type}-${index}`} metric={metric} />
        ))}
      </div>
    </Card>
  );
};

// Comparison Display Component
const ComparisonDisplay = ({ data }: { data: ComparisonData }) => {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 p-4 shadow-sm bg-white dark:bg-slate-900 w-full">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{data.title}</h2>
      
      <div className="space-y-4">
        {data.campaigns.map((campaign, index) => (
          <div key={`comparison-${campaign.id}`}>
            {index > 0 && <Separator className="my-4" />}
            <CampaignCard campaign={campaign} />
          </div>
        ))}
      </div>
      
      {data.insights && data.insights.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Insights</h4>
          <ul className="space-y-2">
            {data.insights.map((insight, index) => (
              <li key={`insight-${index}`} className="text-sm text-slate-700 dark:text-slate-300">
                • {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

// Text Display Component
const TextDisplay = ({ content }: { content: string }) => {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 p-4 shadow-sm bg-white dark:bg-slate-900">
      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{content}</div>
    </Card>
  );
};

// Table Display Component (for structured data)
const TableDisplay = ({ content }: { content: { headers: string[], rows: string[][] } }) => {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              {content.headers.map((header, index) => (
                <th key={`header-${index}`} className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <tr 
                key={`row-${rowIndex}`} 
                className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}`}
              >
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// Determine which component to render based on data type
const renderCardContent = (card: CardData) => {
  switch (card.type) {
    case 'metric':
      return <MetricCard metric={card.content} />;
    case 'campaign':
      return <CampaignCard campaign={card.content} />;
    case 'comparison':
      return <ComparisonDisplay data={card.content} />;
    case 'text':
      return <TextDisplay content={card.content} />;
    case 'table':
      return <TableDisplay content={card.content} />;
    default:
      return null;
  }
};

// Main Component
export function DataDisplay({ data, className = '' }: DataDisplayProps) {
  // Handle array of cards
  if (Array.isArray(data)) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((card, index) => (
          <div key={`data-card-${index}`}>
            {renderCardContent(card)}
          </div>
        ))}
      </div>
    );
  }
  
  // Handle single card
  return (
    <div className={className}>
      {renderCardContent(data)}
    </div>
  );
}