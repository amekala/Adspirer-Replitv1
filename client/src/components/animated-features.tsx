import React from "react";
import { 
  MessageSquare, 
  BarChart3, 
  Sparkles, 
  LineChart, 
  PieChart,
  Wand2,
  Zap,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Link } from "wouter";

// Feature section with alternating layout
type FeatureSection = {
  title: string;
  description: string;
  features: string[];
  image: string;
  alt: string;
  buttonText: string;
  imagePosition: "left" | "right";
};

const featureSections: FeatureSection[] = [
  {
    title: "Campaign Analytics Dashboard",
    description: "Gain deeper insights into your campaign performance across all connected platforms. Our interactive dashboards provide clear visualizations of the metrics that matter most to your business.",
    features: [
      "Real-time performance monitoring",
      "Customizable dashboard widgets",
      "Automated performance alerts",
      "Cross-platform data integration"
    ],
    image: "/campaign-analytics.svg",
    alt: "Campaign analytics dashboard",
    buttonText: "Explore Analytics",
    imagePosition: "right"
  },
  {
    title: "Multi-Platform Integration",
    description: "Connect all your retail media and advertising platforms in one place. No more switching between multiple dashboards or manually compiling reports from various sources.",
    features: [
      "One-click platform authentication",
      "Automated data synchronization",
      "Unified campaign management",
      "Standardized cross-platform metrics"
    ],
    image: "/multi-platform.svg",
    alt: "Multi-platform integration",
    buttonText: "Connect Platforms",
    imagePosition: "left"
  }
];

export function AnimatedFeatures() {
  return (
    <div className="py-20 relative">
      <div className="text-center mb-20">
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

      <div className="max-w-6xl mx-auto space-y-32">
        {featureSections.map((section, sectionIndex) => (
          <FeatureBlock 
            key={sectionIndex} 
            section={section} 
            index={sectionIndex} 
          />
        ))}
      </div>
    </div>
  );
}

interface FeatureBlockProps {
  section: FeatureSection;
  index: number;
}

function FeatureBlock({ section, index }: FeatureBlockProps) {
  const isEven = index % 2 === 0;
  const imageOrder = section.imagePosition === "left" ? "order-1 lg:order-1" : "order-1 lg:order-2";
  const contentOrder = section.imagePosition === "left" ? "order-2 lg:order-2" : "order-2 lg:order-1";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Image Column */}
      <motion.div
        className={`${imageOrder}`}
        initial={{ opacity: 0, x: section.imagePosition === "left" ? -20 : 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-70" />
          <div className="relative rounded-xl overflow-hidden">
            <img 
              src={section.image} 
              alt={section.alt} 
              className="w-full h-auto shadow-2xl rounded-xl"
            />
          </div>
        </div>
      </motion.div>

      {/* Content Column */}
      <motion.div
        className={`${contentOrder}`}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl md:text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          {section.title}
        </h3>
        
        <p className="text-slate-300 text-lg mb-6">
          {section.description}
        </p>
        
        <ul className="space-y-4 mb-8">
          {section.features.map((feature, index) => (
            <motion.li 
              key={index}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <div className="rounded-full bg-indigo-500/20 p-1 mt-1">
                <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-300">{feature}</span>
            </motion.li>
          ))}
        </ul>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <AnimatedButton asChild gradient="primary">
            <Link href="/auth">
              {section.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </AnimatedButton>
        </motion.div>
      </motion.div>
    </div>
  );
}