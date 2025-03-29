import React from "react";
import { motion } from "framer-motion";

type PlatformType = {
  name: string;
  logo: string;
  color: string;
  delay: number;
};

const platforms: PlatformType[] = [
  // Retailers
  { name: "Amazon", logo: "https://placehold.co/100x100/232F3E/FFF?text=Amazon", color: "#232F3E", delay: 0 },
  { name: "Walmart", logo: "https://placehold.co/100x100/0071DC/FFF?text=Walmart", color: "#0071DC", delay: 0.1 },
  { name: "Target", logo: "https://placehold.co/100x100/CC0000/FFF?text=Target", color: "#CC0000", delay: 0.2 },
  { name: "Instacart", logo: "https://placehold.co/100x100/43B02A/FFF?text=Instacart", color: "#43B02A", delay: 0.3 },
  { name: "Walgreens", logo: "https://placehold.co/100x100/e31837/FFF?text=Walgreens", color: "#e31837", delay: 0.4 },
  { name: "Kroger", logo: "https://placehold.co/100x100/0457A7/FFF?text=Kroger", color: "#0457A7", delay: 0.5 },
  { name: "Costco", logo: "https://placehold.co/100x100/005DAA/FFF?text=Costco", color: "#005DAA", delay: 0.6 },
  { name: "CVS", logo: "https://placehold.co/100x100/CC0000/FFF?text=CVS", color: "#CC0000", delay: 0.7 },
  
  // Ad Platforms
  { name: "Meta", logo: "https://placehold.co/100x100/4267B2/FFF?text=Meta", color: "#4267B2", delay: 0.8 },
  { name: "Google", logo: "https://placehold.co/100x100/4285F4/FFF?text=Google", color: "#4285F4", delay: 0.9 },
  { name: "Snap", logo: "https://placehold.co/100x100/FFFC00/000?text=Snap", color: "#FFFC00", delay: 1.0 },
];

export function PlatformLogosGrid() {
  return (
    <div className="py-16">
      <motion.h2 
        className="text-center text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Connected with platforms that matter
      </motion.h2>
      
      <motion.p 
        className="text-center text-slate-400 mb-12 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Optimize your advertising performance across top retail and ad platforms
      </motion.p>
      
      <div className="max-w-5xl mx-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 lg:gap-8">
        {platforms.map((platform, index) => (
          <LogoItem key={platform.name} platform={platform} />
        ))}
      </div>
    </div>
  );
}

interface LogoItemProps {
  platform: PlatformType;
}

function LogoItem({ platform }: LogoItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: platform.delay,
        ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier curve for springy effect
      }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: `0 0 20px ${platform.color}40`
      }}
      className="aspect-square flex items-center justify-center p-2 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800/50"
    >
      <img 
        src={platform.logo} 
        alt={`${platform.name} logo`} 
        className="w-[60px] h-[60px] object-contain"
      />
    </motion.div>
  );
} 