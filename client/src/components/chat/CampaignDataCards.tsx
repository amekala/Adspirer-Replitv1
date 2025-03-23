import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  EyeIcon, 
  MousePointerIcon, 
  DollarSignIcon, 
  ShoppingCartIcon, 
  TargetIcon,
  BarChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  InfoIcon
} from "lucide-react";

/**
 * This component is specifically designed to format campaign data
 * in a visually appealing horizontal card layout with consistent styling.
 */

interface CampaignMetric {
  type: 'impressions' | 'clicks' | 'cost' | 'conversions' | 'ctr' | 'roas';
  label: string;
  value: string | number;
  raw?: any; // Raw value from the database
}

interface Campaign {
  id: string;
  name?: string;
  metrics: CampaignMetric[];
}

interface CampaignDataProps {
  campaigns: Campaign[];
  insights?: string[];
  className?: string;
}

// Format value based on metric type
function formatValue(value: string | number, type: string): string {
  if (typeof value === 'string') {
    // If already formatted as string, use it
    return value;
  }
  
  switch (type) {
    case 'impressions':
    case 'clicks':
    case 'conversions':
      return value.toLocaleString();
    case 'cost':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'ctr':
    case 'roas':
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    default:
      return String(value);
  }
}

// Get appropriate icon for metric type
function getMetricIcon(type: string, className = "h-4 w-4") {
  switch (type) {
    case 'impressions':
      return <EyeIcon className={className} />;
    case 'clicks':
      return <MousePointerIcon className={className} />;
    case 'cost':
      return <DollarSignIcon className={className} />;
    case 'conversions':
      return <ShoppingCartIcon className={className} />;
    case 'ctr':
      return <TargetIcon className={className} />;
    case 'roas':
      return <BarChartIcon className={className} />;
    default:
      return <InfoIcon className={className} />;
  }
}

// Get appropriate color scheme for metric
function getMetricColors(type: string) {
  switch (type) {
    case 'impressions':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-200 dark:border-blue-800/30',
        text: 'text-blue-700 dark:text-blue-300',
        accent: 'text-blue-500'
      };
    case 'clicks':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-900/10',
        border: 'border-indigo-200 dark:border-indigo-800/30',
        text: 'text-indigo-700 dark:text-indigo-300',
        accent: 'text-indigo-500'
      };
    case 'cost':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        border: 'border-amber-200 dark:border-amber-800/30',
        text: 'text-amber-700 dark:text-amber-300',
        accent: 'text-amber-500'
      };
    case 'conversions':
      return {
        bg: 'bg-green-50 dark:bg-green-900/10',
        border: 'border-green-200 dark:border-green-800/30',
        text: 'text-green-700 dark:text-green-300',
        accent: 'text-green-500'
      };
    case 'ctr':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/10',
        border: 'border-purple-200 dark:border-purple-800/30',
        text: 'text-purple-700 dark:text-purple-300',
        accent: 'text-purple-500'
      };
    case 'roas':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
        border: 'border-emerald-200 dark:border-emerald-800/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        accent: 'text-emerald-500'
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-900/10',
        border: 'border-slate-200 dark:border-slate-700/30',
        text: 'text-slate-700 dark:text-slate-300',
        accent: 'text-slate-500'
      };
  }
}

// Single metric component 
function MetricCard({ metric }: { metric: CampaignMetric }) {
  const { type, label, value } = metric;
  const colors = getMetricColors(type);
  const icon = getMetricIcon(type);
  const formattedValue = formatValue(value, type);
  
  return (
    <div className={`p-2 rounded-md ${colors.bg} border ${colors.border} flex flex-col gap-1 min-w-[95px]`}>
      <div className="flex items-center gap-1.5">
        <div className={colors.accent}>{icon}</div>
        <div className={`text-xs font-medium ${colors.text}`}>{label}</div>
      </div>
      <div className="text-base font-bold text-slate-900 dark:text-white">
        {formattedValue}
      </div>
    </div>
  );
}

// Single campaign component
function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="p-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center mb-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Campaign {campaign.name && `(${campaign.name})`}
          <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            ID: {campaign.id}
          </span>
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {campaign.metrics.map((metric, i) => (
          <MetricCard key={`${campaign.id}-${metric.type}-${i}`} metric={metric} />
        ))}
      </div>
    </Card>
  );
}

// Insights component
function InsightsPanel({ insights }: { insights: string[] }) {
  return (
    <Card className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Insights</h3>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={`insight-${i}`} className="text-sm text-slate-700 dark:text-slate-300 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
            {insight}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Main component
export function CampaignDataCards({ campaigns, insights = [], className = '' }: CampaignDataProps) {
  if (!campaigns || campaigns.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
      
      {insights.length > 0 && (
        <InsightsPanel insights={insights} />
      )}
    </div>
  );
}