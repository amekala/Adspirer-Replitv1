import {
  MessageSquare,
  BarChart3,
  Sparkles,
  AreaChart,
  LineChart,
  PieChart
} from "lucide-react";
import { GlassCard, GlassCardContent } from "./ui/glass-card";

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: FeatureCardProps[] = [
  {
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    title: "AI-Powered Campaign Analysis",
    description: "Get instant insights and recommendations from our advanced AI analytics engine."
  },
  {
    icon: <AreaChart className="h-6 w-6 text-primary" />,
    title: "Cross-Platform Retail Optimization",
    description: "Optimize performance across Amazon, Walmart, Target, and more from one interface."
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-primary" />,
    title: "Conversational Interface",
    description: "Simply ask questions about your campaigns and get clear, actionable answers."
  },
  {
    icon: <LineChart className="h-6 w-6 text-primary" />,
    title: "Data-Driven Recommendations",
    description: "Receive personalized recommendations based on your campaign performance data."
  },
  {
    icon: <PieChart className="h-6 w-6 text-primary" />,
    title: "Budget Allocation",
    description: "Optimize your ad spend across platforms based on performance metrics."
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    title: "Performance Visualization",
    description: "See your campaign metrics with beautiful, interactive data visualizations."
  }
];

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <GlassCard className="hover:bg-white/20 transition-all duration-300">
      <GlassCardContent className="p-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-muted-foreground">
          {description}
        </p>
      </GlassCardContent>
    </GlassCard>
  );
}

export function FeatureCards() {
  return (
    <div className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Key Features</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Powerful tools to optimize your retail media advertising
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
} 