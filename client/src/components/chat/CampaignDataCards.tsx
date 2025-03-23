import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  Eye, 
  MousePointer, 
  DollarSign, 
  ShoppingCart, 
  Target,
  BarChart,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";

/**
 * This component is specifically designed to format campaign data
 * in a visually appealing layout with consistent styling.
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
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case 'roas':
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
    default:
      return String(value);
  }
}

// Get appropriate icon for metric type
function getMetricIcon(type: string, className = "h-4 w-4") {
  switch (type) {
    case 'impressions':
      return <Eye className={className} />;
    case 'clicks':
      return <MousePointer className={className} />;
    case 'cost':
      return <DollarSign className={className} />;
    case 'conversions':
      return <ShoppingCart className={className} />;
    case 'ctr':
      return <Target className={className} />;
    case 'roas':
      return <BarChart className={className} />;
    default:
      return <Info className={className} />;
  }
}

// Get appropriate color scheme for metric
function getMetricColors(type: string) {
  switch (type) {
    case 'impressions':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800/30',
        text: 'text-blue-700 dark:text-blue-300',
        accent: 'text-blue-500 dark:text-blue-400'
      };
    case 'clicks':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800/30',
        text: 'text-indigo-700 dark:text-indigo-300',
        accent: 'text-indigo-500 dark:text-indigo-400'
      };
    case 'cost':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/30',
        text: 'text-amber-700 dark:text-amber-300',
        accent: 'text-amber-500 dark:text-amber-400'
      };
    case 'conversions':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800/30',
        text: 'text-green-700 dark:text-green-300',
        accent: 'text-green-500 dark:text-green-400'
      };
    case 'ctr':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800/30',
        text: 'text-purple-700 dark:text-purple-300',
        accent: 'text-purple-500 dark:text-purple-400'
      };
    case 'roas':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        accent: 'text-emerald-500 dark:text-emerald-400'
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/20',
        border: 'border-slate-200 dark:border-slate-700/30',
        text: 'text-slate-700 dark:text-slate-300',
        accent: 'text-slate-500 dark:text-slate-400'
      };
  }
}

// Single metric component for compact display
function MetricCard({ metric }: { metric: CampaignMetric }) {
  const { type, label, value } = metric;
  const colors = getMetricColors(type);
  const icon = getMetricIcon(type);
  const formattedValue = formatValue(value, type);
  
  return (
    <div className={`p-2.5 rounded-md ${colors.bg} border ${colors.border} flex flex-col gap-1 min-w-[100px]`}>
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

// Full-width metric display component for the showcase metrics
function MetricCardWide({ metric }: { metric: CampaignMetric }) {
  const { type, label, value } = metric;
  const colors = getMetricColors(type);
  const icon = getMetricIcon(type, "h-5 w-5");
  const formattedValue = formatValue(value, type);
  
  return (
    <div className={`p-3 rounded-md ${colors.bg} border ${colors.border} w-full`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${colors.accent} p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80`}>
            {icon}
          </div>
          <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
        </div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">
          {formattedValue}
        </div>
      </div>
    </div>
  );
}

// Single campaign component
function CampaignCard({ campaign }: { campaign: Campaign }) {
  // Check if this is a campaign with just CTR (matching the bottom of the screenshot)
  const isSingleMetricCampaign = campaign.id === 'metrics' && 
                                campaign.metrics.length === 1 && 
                                campaign.metrics[0].type === 'ctr';
  
  if (isSingleMetricCampaign) {
    return (
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Campaign</h3>
            <span className="ml-2 text-sm font-medium text-slate-500">ID: metrics</span>
          </div>
        </div>
        <div className="p-5">
          <MetricCardWide metric={campaign.metrics[0]} />
        </div>
      </Card>
    );
  }
  
  // Select a display name based on campaign content
  let displayName = campaign.name || '';
  if (!displayName) {
    if (campaign.metrics.some(m => m.type === 'clicks' && Number(m.value) > 300)) {
      displayName = 'Most Clicks';
    } else if (campaign.metrics.some(m => m.type === 'clicks' && Number(m.value) < 100)) {
      displayName = 'Fewest Clicks';
    }
  }
  
  // Regular multi-metric campaign card
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="bg-white dark:bg-slate-900">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {displayName ? 
              `**Campaign with ${displayName}:**` : 
              '**Campaign:**'
            }
          </h3>
          <div className="text-sm mt-1 text-slate-700 dark:text-slate-300">
            - **Campaign ID:** {campaign.id}
          </div>
        </div>
        
        <div className="p-4 space-y-2">
          {campaign.metrics.map((metric, i) => (
            <div key={i} className="text-sm text-slate-700 dark:text-slate-300">
              - **{metric.label === 'CTR' ? 'Click-Through Rate (CTR)' : `Total ${metric.label}`}:** {formatValue(metric.value, metric.type)}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Insights component
function InsightsPanel({ insights }: { insights: string[] }) {
  if (!insights || insights.length === 0) return null;
  
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Insights
        </h3>
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-900">
        {insights.map((insight, i) => (
          <div key={i} className="text-sm text-slate-700 dark:text-slate-300 mt-2 first:mt-0">
            - {insight}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Footer note component
function NotePanel() {
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="p-4 bg-white dark:bg-slate-900">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <p className="font-medium">Note:</p>
          <p>- The data provided is limited to the campaigns requested. Additional data could provide a more comprehensive analysis of overall performance trends.</p>
        </div>
      </div>
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
      
      <NotePanel />
    </div>
  );
}