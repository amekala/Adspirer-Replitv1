import React from "react";
import { 
  MessageSquare, 
  BarChart3, 
  Sparkles, 
  Search, 
  LineChart, 
  PieChart,
  Wand2,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  AnimatedCard, 
  AnimatedCardContent 
} from "@/components/ui/animated-card";

type FeatureType = {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
};

const features: FeatureType[] = [
  {
    title: "AI-Powered Analysis",
    description: "Get intelligent insights and recommendations from our advanced AI analytics engine.",
    icon: <Sparkles size={24} />,
    gradient: "from-indigo-500 to-indigo-600",
    delay: 0.1
  },
  {
    title: "Multi-Platform Optimization",
    description: "Manage campaigns across Amazon, Walmart, Target, and more from one powerful interface.",
    icon: <Zap size={24} />,
    gradient: "from-violet-500 to-violet-600",
    delay: 0.2
  },
  {
    title: "Conversational Interface",
    description: "Chat with your campaigns in natural language and get clear, actionable answers.",
    icon: <MessageSquare size={24} />,
    gradient: "from-indigo-500 to-purple-600",
    delay: 0.3
  },
  {
    title: "Smart Recommendations",
    description: "Receive personalized recommendations based on your campaign performance data.",
    icon: <Wand2 size={24} />,
    gradient: "from-fuchsia-500 to-pink-600",
    delay: 0.4
  },
  {
    title: "Budget Optimization",
    description: "Automatically allocate budgets across platforms for maximum return on ad spend.",
    icon: <PieChart size={24} />,
    gradient: "from-blue-500 to-indigo-600",
    delay: 0.5
  },
  {
    title: "Performance Tracking",
    description: "Track your campaign metrics with beautiful, interactive visualizations in real-time.",
    icon: <LineChart size={24} />,
    gradient: "from-purple-500 to-fuchsia-600",
    delay: 0.6
  },
];

export function AnimatedFeatures() {
  return (
    <div className="py-20 relative">
      <div className="text-center mb-16">
        <motion.h2 
          className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Powerful Features
        </motion.h2>
        <motion.p 
          className="text-slate-400 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Everything you need to optimize your retail media advertising
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} />
        ))}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: FeatureType;
}

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.7, 
        delay: feature.delay,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <AnimatedCard 
        variant="gradient" 
        hoverEffect="lift"
        gradientBorder={true}
        className="h-full"
      >
        <AnimatedCardContent className="p-8">
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
            {feature.icon}
          </div>
          
          <h3 className="text-xl font-semibold mb-3 text-white">
            {feature.title}
          </h3>
          
          <p className="text-slate-300">
            {feature.description}
          </p>
        </AnimatedCardContent>
      </AnimatedCard>
    </motion.div>
  );
} 