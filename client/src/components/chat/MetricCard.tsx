import React from 'react';
import { Card } from "@/components/ui/card";
import { cva, type VariantProps } from "class-variance-authority";

// Define card variants for different metric types
const metricCardVariants = cva(
  "flex flex-col p-3 rounded-lg shadow-sm transition-all",
  {
    variants: {
      type: {
        ctr: "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50",
        impressions: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50",
        clicks: "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50",
        cost: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50",
        conversions: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50",
        sales: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50",
        roas: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50",
        default: "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
      },
      size: {
        sm: "max-w-[160px]",
        md: "max-w-[200px]",
        lg: "max-w-[280px]",
        full: "w-full"
      }
    },
    defaultVariants: {
      type: "default",
      size: "md"
    }
  }
);

// Define props for the MetricCard component
export interface MetricCardProps extends VariantProps<typeof metricCardVariants> {
  icon?: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

// Map of metric types to their respective icons (using emoji for simplicity)
const metricIcons: Record<string, string> = {
  ctr: '🎯',
  impressions: '👁️',
  clicks: '👆',
  cost: '💸',
  conversions: '✅',
  sales: '💰',
  roas: '📈',
  default: '📊'
};

export function MetricCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  type = "default",
  size,
  className
}: MetricCardProps) {
  // Get the appropriate icon based on type
  const metricIcon = icon || metricIcons[type as string] || metricIcons.default;
  
  // Get appropriate text color based on type
  const getTextColor = () => {
    switch (type) {
      case 'ctr': return 'text-purple-700 dark:text-purple-300';
      case 'impressions': return 'text-blue-700 dark:text-blue-300';
      case 'clicks': return 'text-indigo-700 dark:text-indigo-300';
      case 'cost': return 'text-amber-700 dark:text-amber-300';
      case 'conversions': return 'text-green-700 dark:text-green-300';
      case 'sales': 
      case 'roas': return 'text-emerald-700 dark:text-emerald-300';
      default: return 'text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <Card className={`${metricCardVariants({ type, size, className })} hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="mr-2 text-lg">{metricIcon}</span>
          <h3 className={`font-medium ${getTextColor()}`}>{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${
            trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      
      <div className="text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </div>
      
      {subtitle && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {subtitle}
        </div>
      )}
    </Card>
  );
}