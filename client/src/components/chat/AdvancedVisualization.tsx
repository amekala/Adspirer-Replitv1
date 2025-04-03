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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMetricColor, getValueFormatter } from './ChartComponents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define types for visualization data
export interface AdvancedDataPoint {
  name: string;
  value: number;
  color?: string;
  description?: string;
  [key: string]: any;
}

export interface ComparisonItem {
  name: string;
  metrics: {
    name: string;
    value: number;
    type: string;
    change?: number;
  }[];
}

export interface KPIData {
  title: string;
  value: number;
  change?: number;
  type: string;
  description?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  value?: number;
  type?: string;
}

// Animation variants for motion components
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0, 
    transition: { delay: i * 0.1, duration: 0.3 } 
  })
};

// Advanced KPI Dashboard Card Component
export interface KPIDashboardProps {
  kpis: KPIData[];
  title?: string;
  description?: string;
  className?: string;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  kpis,
  title = "Performance Overview",
  description,
  className = ''
}) => {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {kpis.map((kpi, index) => {
              const formatter = getValueFormatter(kpi.type);
              const formattedValue = formatter(kpi.value);
              const colors = {
                positive: 'text-green-600 dark:text-green-400',
                negative: 'text-red-600 dark:text-red-400',
                neutral: 'text-slate-600 dark:text-slate-400'
              };
              const changeColor = !kpi.change ? colors.neutral : 
                kpi.change > 0 ? colors.positive : colors.negative;
              
              return (
                <motion.div
                  key={`kpi-${index}`}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.title}</h3>
                    {kpi.change !== undefined && (
                      <div className={`text-xs font-medium flex items-center ${changeColor}`}>
                        {kpi.change > 0 ? '↑' : kpi.change < 0 ? '↓' : '—'}
                        <span className="ml-1">{Math.abs(kpi.change).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formattedValue}
                    </div>
                    {kpi.secondaryValue && kpi.secondaryLabel && (
                      <div className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                        {kpi.secondaryLabel}: {formatter(kpi.secondaryValue)}
                      </div>
                    )}
                  </div>
                  {kpi.description && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {kpi.description}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 3D Enhanced Radar Chart for Multiple Metrics
export interface RadarAnalysisProps {
  data: ComparisonItem[];
  title?: string;
  description?: string;
  className?: string;
}

export const RadarAnalysis: React.FC<RadarAnalysisProps> = ({
  data,
  title = "Metric Comparison Analysis",
  description,
  className = ''
}) => {
  // Transform data for radar chart
  const metricNames = Array.from(
    new Set(data.flatMap(item => item.metrics.map(m => m.name)))
  );
  
  const radarData = metricNames.map(metric => {
    const metricData: any = { metric };
    data.forEach(item => {
      const metricValue = item.metrics.find(m => m.name === metric);
      metricData[item.name] = metricValue ? metricValue.value : 0;
    });
    return metricData;
  });
  
  const campaignNames = data.map(item => item.name);
  const colors = campaignNames.map((_, i) => getMetricColor(i.toString()));
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                {campaignNames.map((name, index) => (
                  <Radar
                    key={`radar-${name}`}
                    name={name}
                    dataKey={name}
                    stroke={colors[index]}
                    fill={colors[index]}
                    fillOpacity={0.3}
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Scatter Plot Matrix for Correlation Analysis
export interface ScatterMatrixProps {
  data: AdvancedDataPoint[];
  xMetric: string;
  yMetric: string;
  zMetric?: string;
  title?: string;
  description?: string;
  className?: string;
}

export const ScatterMatrix: React.FC<ScatterMatrixProps> = ({
  data,
  xMetric,
  yMetric,
  zMetric,
  title = "Correlation Analysis",
  description,
  className = ''
}) => {
  const xFormatter = getValueFormatter(xMetric);
  const yFormatter = getValueFormatter(yMetric);
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey={xMetric} 
                  name={xMetric.charAt(0).toUpperCase() + xMetric.slice(1)} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={xFormatter}
                />
                <YAxis 
                  type="number" 
                  dataKey={yMetric} 
                  name={yMetric.charAt(0).toUpperCase() + yMetric.slice(1)} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={yFormatter}
                />
                {zMetric && (
                  <ZAxis
                    type="number"
                    dataKey={zMetric}
                    range={[50, 400]}
                    name={zMetric.charAt(0).toUpperCase() + zMetric.slice(1)}
                  />
                )}
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter
                  name={`${xMetric} vs ${yMetric}`}
                  data={data}
                  fill={getMetricColor(xMetric)}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Multi-view Visualization Component (tabs)
export interface MultiViewProps {
  title?: string;
  description?: string;
  className?: string;
  views: {
    id: string;
    label: string;
    chart: React.ReactNode;
  }[];
}

export const MultiViewVisualization: React.FC<MultiViewProps> = ({
  title = "Campaign Performance",
  description,
  className = '',
  views
}) => {
  // Use the first view's ID as the default value
  const defaultTab = views[0]?.id || "";
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-4">
          {views.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start mb-4 overflow-x-auto flex-wrap">
                {views.map((view) => (
                  <TabsTrigger 
                    key={`tab-${view.id}`} 
                    value={view.id}
                    className="min-w-[100px]"
                  >
                    {view.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="mt-2">
                {views.map((view) => (
                  <TabsContent 
                    key={`content-${view.id}`} 
                    value={view.id}
                    className="mt-0"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {view.chart}
                    </motion.div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          ) : (
            <div className="text-center py-4 text-slate-500">No visualization views available</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Interactive Timeline Component
export interface TimelineProps {
  events: TimelineEvent[];
  title?: string;
  description?: string;
  className?: string;
}

export const InteractiveTimeline: React.FC<TimelineProps> = ({
  events,
  title = "Campaign Timeline",
  description,
  className = ''
}) => {
  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-4">
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            
            {/* Timeline events */}
            <div className="space-y-4">
              {sortedEvents.map((event, index) => {
                const eventDate = new Date(event.date);
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }).format(eventDate);
                
                return (
                  <motion.div
                    key={`timeline-${index}`}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="ml-10 relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-14 top-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center z-10">
                        <div className="h-4 w-4 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                      </div>
                    </div>
                    
                    {/* Event content */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-medium text-slate-900 dark:text-white">{event.title}</h3>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{formattedDate}</div>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{event.description}</p>
                      )}
                      
                      {event.value !== undefined && event.type && (
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          Value: {getValueFormatter(event.type)(event.value)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// TreeMap Component for Hierarchical Data
export interface TreeMapProps {
  data: AdvancedDataPoint[];
  title?: string;
  description?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export const MetricTreeMap: React.FC<TreeMapProps> = ({
  data,
  title = "Budget Allocation",
  description,
  valueFormatter = (value) => `$${value.toLocaleString()}`,
  className = ''
}) => {
  const COLORS = [
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
    '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
  ];
  
  const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, value } = props;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: depth < 2 ? COLORS[index % COLORS.length] : 'none',
            stroke: '#fff',
            strokeWidth: 2,
            fillOpacity: depth < 2 ? 0.8 : 0,
          }}
        />
        {width > 50 && height > 30 ? (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-xs font-medium"
          >
            {name}
          </text>
        ) : null}
        {width > 70 && height > 50 ? (
          <text
            x={x + width / 2}
            y={y + height / 2 + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-xs opacity-80"
          >
            {valueFormatter(value)}
          </text>
        ) : null}
      </g>
    );
  };
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`w-full ${className}`}
    >
      <Card className="border border-slate-200 dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="value"
                nameKey="name"
                aspectRatio={4/3}
                content={<CustomizedContent />}
              />
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Custom Tooltip Component for our visualization system
export const CustomTooltip = ({ active, payload, label, valueFormatter }: any) => {
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