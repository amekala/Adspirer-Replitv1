import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  Scatter
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any; // Additional properties
}

export interface ComparisonDataPoint {
  name: string;
  [key: string]: any; // Campaign IDs or metrics as keys
}

export interface TimeSeriesDataPoint {
  date: string;
  [key: string]: any; // Metrics as keys
}

// Color schemes for different metrics
export const metricColors = {
  impressions: '#3b82f6', // blue
  clicks: '#6366f1',      // indigo
  cost: '#f59e0b',        // amber
  conversions: '#10b981', // emerald
  ctr: '#8b5cf6',         // purple
  roas: '#059669',        // green
  sales: '#059669',       // green
  default: '#64748b'      // slate
};

// Get a color for a metric
export const getMetricColor = (metricType: string): string => {
  return metricColors[metricType as keyof typeof metricColors] || metricColors.default;
};

// Common tooltip formatter for currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

// Common tooltip formatter for percentage values
const formatPercentage = (value: number) => {
  return `${value.toFixed(2)}%`;
};

// Get appropriate formatter based on metric type
export const getValueFormatter = (metricType: string) => {
  switch (metricType) {
    case 'cost':
    case 'sales':
      return formatCurrency;
    case 'ctr':
      return formatPercentage;
    case 'impressions':
    case 'clicks':
    case 'conversions':
      return (value: number) => value.toLocaleString();
    case 'roas':
      return (value: number) => `${value.toFixed(2)}x`;
    default:
      return (value: number) => value.toString();
  }
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <Card className="bg-white/95 dark:bg-slate-800/95 shadow-lg border-0 p-2 !backdrop-blur-sm">
        <div className="text-xs font-medium mb-1 text-slate-600 dark:text-slate-300">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <div className="text-xs">
              <span className="font-medium">{entry.name}: </span>
              <span>{valueFormatter ? valueFormatter(entry.value) : entry.value}</span>
            </div>
          </div>
        ))}
      </Card>
    );
  }
  return null;
};

// Bar Chart Component
export interface BarChartProps {
  data: ChartDataPoint[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  metricType?: string;
  height?: number;
  horizontal?: boolean;
  gradient?: boolean;
  className?: string;
}

export const MetricBarChart: React.FC<BarChartProps> = ({
  data,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  metricType = 'default',
  height = 300,
  horizontal = false,
  gradient = true,
  className = ''
}) => {
  const color = getMetricColor(metricType);
  const valueFormatter = getValueFormatter(metricType);
  
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <defs>
                {gradient && (
                  <linearGradient id={`barColor${metricType}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.2} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                </>
              )}
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              <Bar
                dataKey="value"
                name={metricType.charAt(0).toUpperCase() + metricType.slice(1)}
                fill={gradient ? `url(#barColor${metricType})` : color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Pie Chart Component
export interface PieChartProps {
  data: ChartDataPoint[];
  title?: string;
  description?: string;
  metricType?: string;
  height?: number;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
  dataKey?: string;
}

export const MetricPieChart: React.FC<PieChartProps> = ({
  data,
  title,
  description,
  metricType = 'default',
  height = 300,
  className = '',
  innerRadius = 60,
  outerRadius = 90,
  dataKey = 'value'
}) => {
  const valueFormatter = getValueFormatter(metricType);
  const COLORS = data.map(item => item.color || getMetricColor(metricType));
  
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                dataKey={dataKey}
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Multi-series Line Chart Component
export interface LineChartProps {
  data: TimeSeriesDataPoint[];
  metrics: string[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  className?: string;
}

export const MetricLineChart: React.FC<LineChartProps> = ({
  data,
  metrics,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  className = ''
}) => {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {metrics.map((metric, index) => (
                <Line
                  key={`line-${metric}`}
                  type="monotone"
                  dataKey={metric}
                  name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  stroke={getMetricColor(metric)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Area Chart Component
export interface AreaChartProps {
  data: TimeSeriesDataPoint[];
  metrics: string[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  stacked?: boolean;
  className?: string;
}

export const MetricAreaChart: React.FC<AreaChartProps> = ({
  data,
  metrics,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  stacked = false,
  className = ''
}) => {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <defs>
                {metrics.map((metric, index) => (
                  <linearGradient
                    key={`gradient-${metric}`}
                    id={`colorGradient${metric}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={getMetricColor(metric)}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={getMetricColor(metric)}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {metrics.map((metric, index) => (
                <Area
                  key={`area-${metric}`}
                  type="monotone"
                  dataKey={metric}
                  name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  stackId={stacked ? "1" : index.toString()}
                  stroke={getMetricColor(metric)}
                  fillOpacity={1}
                  fill={`url(#colorGradient${metric})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Multi-series Comparison Bar Chart
export interface ComparisonBarChartProps {
  data: ComparisonDataPoint[];
  keys: string[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  horizontal?: boolean;
  className?: string;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  data,
  keys,
  title,
  description,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  horizontal = false,
  className = ''
}) => {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                </>
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {keys.map((key, index) => (
                <Bar
                  key={`bar-${key}`}
                  dataKey={key}
                  fill={getMetricColor(index.toString())}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Multi-metric Composed Chart
export interface ComposedChartProps {
  data: TimeSeriesDataPoint[];
  barMetrics?: string[];
  lineMetrics?: string[];
  areaMetrics?: string[];
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}

export const MultiMetricChart: React.FC<ComposedChartProps> = ({
  data,
  barMetrics = [],
  lineMetrics = [],
  areaMetrics = [],
  title,
  description,
  height = 400,
  className = ''
}) => {
  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader className="pb-0">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <defs>
                {areaMetrics.map((metric, index) => (
                  <linearGradient
                    key={`gradient-${metric}`}
                    id={`composedGradient${metric}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={getMetricColor(metric)}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={getMetricColor(metric)}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {barMetrics.map((metric, index) => (
                <Bar
                  key={`bar-${metric}`}
                  dataKey={metric}
                  name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  fill={getMetricColor(metric)}
                  radius={[4, 4, 0, 0]}
                />
              ))}
              
              {lineMetrics.map((metric, index) => (
                <Line
                  key={`line-${metric}`}
                  type="monotone"
                  dataKey={metric}
                  name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  stroke={getMetricColor(metric)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
              
              {areaMetrics.map((metric, index) => (
                <Area
                  key={`area-${metric}`}
                  type="monotone"
                  dataKey={metric}
                  name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  stroke={getMetricColor(metric)}
                  fillOpacity={1}
                  fill={`url(#composedGradient${metric})`}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}; 