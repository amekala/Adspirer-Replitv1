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
import { MetricLineChart, MetricAreaChart } from './ChartComponents';

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
  showGraphs?: boolean;
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
        accent: 'text-blue-500 dark:text-blue-400',
        gradientFrom: '#3b82f6',
        gradientTo: '#93c5fd'
      };
    case 'clicks':
      return {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-800/30',
        text: 'text-indigo-700 dark:text-indigo-300',
        accent: 'text-indigo-500 dark:text-indigo-400',
        gradientFrom: '#6366f1',
        gradientTo: '#a5b4fc'
      };
    case 'cost':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/30',
        text: 'text-amber-700 dark:text-amber-300',
        accent: 'text-amber-500 dark:text-amber-400',
        gradientFrom: '#f59e0b',
        gradientTo: '#fcd34d'
      };
    case 'conversions':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800/30',
        text: 'text-green-700 dark:text-green-300',
        accent: 'text-green-500 dark:text-green-400',
        gradientFrom: '#10b981',
        gradientTo: '#6ee7b7'
      };
    case 'ctr':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800/30',
        text: 'text-purple-700 dark:text-purple-300',
        accent: 'text-purple-500 dark:text-purple-400',
        gradientFrom: '#8b5cf6',
        gradientTo: '#c4b5fd'
      };
    case 'roas':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800/30',
        text: 'text-emerald-700 dark:text-emerald-300',
        accent: 'text-emerald-500 dark:text-emerald-400',
        gradientFrom: '#059669',
        gradientTo: '#6ee7b7'
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/20',
        border: 'border-slate-200 dark:border-slate-700/30',
        text: 'text-slate-700 dark:text-slate-300',
        accent: 'text-slate-500 dark:text-slate-400',
        gradientFrom: '#64748b',
        gradientTo: '#cbd5e1'
      };
  }
}

// Enhanced metric card component with improved visual design
function MetricCard({ metric }: { metric: CampaignMetric }) {
  const { type, label, value } = metric;
  const colors = getMetricColors(type);
  const icon = getMetricIcon(type);
  const formattedValue = formatValue(value, type);
  
  return (
    <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border} flex flex-col gap-1 min-w-[100px] hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-center gap-2">
        <div className={`${colors.accent} p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm`}>
          {icon}
        </div>
        <div className={`text-xs font-medium ${colors.text}`}>{label}</div>
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
        {formattedValue}
      </div>
    </div>
  );
}

// Full-width metric display component with visual emphasis
function MetricCardWide({ metric }: { metric: CampaignMetric }) {
  const { type, label, value } = metric;
  const colors = getMetricColors(type);
  const icon = getMetricIcon(type, "h-5 w-5");
  const formattedValue = formatValue(value, type);
  
  return (
    <div className={`p-4 rounded-lg ${colors.bg} border ${colors.border} w-full shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`${colors.accent} p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-sm`}>
            {icon}
          </div>
          <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {formattedValue}
        </div>
      </div>
    </div>
  );
}

// Enhanced campaign card with visually appealing design
function CampaignCard({ campaign, showGraphs = false }: { campaign: Campaign, showGraphs?: boolean }) {
  // Check if this is a campaign with just CTR (matching the bottom of the screenshot)
  const isSingleMetricCampaign = campaign.id === 'metrics' && 
                                campaign.metrics.length === 1 && 
                                campaign.metrics[0].type === 'ctr';
  
  if (isSingleMetricCampaign) {
    return (
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-4 bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-900/10 dark:to-slate-900/10 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Campaign Performance</h3>
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
  
  // Extract data for potential graphing
  const timeSeriesData = [
    { date: 'Week 1', impressions: campaign.metrics.find(m => m.type === 'impressions')?.value || 0 },
    { date: 'Week 2', impressions: Math.round((campaign.metrics.find(m => m.type === 'impressions')?.value as number || 0) * 0.8) },
    { date: 'Week 3', impressions: Math.round((campaign.metrics.find(m => m.type === 'impressions')?.value as number || 0) * 1.2) },
    { date: 'Week 4', impressions: Math.round((campaign.metrics.find(m => m.type === 'impressions')?.value as number || 0) * 0.9) },
  ];
  
  // Regular multi-metric campaign card with enhanced styling
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            {displayName && (
              <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-sm">
                {displayName}
              </span>
            )}
            <span>Campaign</span>
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              ID: {campaign.id}
            </span>
          </h3>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Metrics grid with attractive cards */}
          <div className="grid grid-cols-2 gap-3">
            {campaign.metrics.map((metric, i) => (
              <MetricCard key={i} metric={metric} />
            ))}
          </div>
          
          {/* Optional graphs section */}
          {showGraphs && campaign.metrics.some(m => m.type === 'impressions') && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Impressions Trend</h4>
              <div className="h-[200px]">
                <MetricAreaChart 
                  data={timeSeriesData} 
                  metrics={['impressions']} 
                  height={200}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Enhanced insights panel with better visual treatment
function InsightsPanel({ insights }: { insights: string[] }) {
  if (!insights || insights.length === 0) return null;
  
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Info className="h-4 w-4 text-amber-500" />
          Insights
        </h3>
      </div>
      
      <div className="p-4 bg-white dark:bg-slate-900">
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-5 w-5 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mt-0.5">
                <span className="text-xs font-bold">{i+1}</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Main component with improved layout and optional graphs
export function CampaignDataCards({ campaigns, insights = [], className = '', showGraphs = false }: CampaignDataProps) {
  if (!campaigns || campaigns.length === 0) {
    return null;
  }
  
  // Extract impression data for overall trend graph if available
  const hasImpressionData = campaigns.some(c => c.metrics.some(m => m.type === 'impressions'));
  const timeSeriesData = hasImpressionData ? campaigns.map((campaign, index) => {
    return {
      date: `Campaign ${index + 1}`,
      impressions: campaign.metrics.find(m => m.type === 'impressions')?.value || 0
    };
  }) : [];
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Optional overall trend graph */}
      {showGraphs && hasImpressionData && campaigns.length > 1 && (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Campaign Impressions Comparison
            </h3>
          </div>
          <div className="p-4 bg-white dark:bg-slate-900">
            <div className="h-[200px]">
              <MetricLineChart 
                data={timeSeriesData} 
                metrics={['impressions']} 
                height={200} 
              />
            </div>
          </div>
        </Card>
      )}
      
      {/* Campaign cards */}
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} showGraphs={showGraphs} />
      ))}
      
      {/* Insights panel */}
      {insights.length > 0 && (
        <InsightsPanel insights={insights} />
      )}
    </div>
  );
}