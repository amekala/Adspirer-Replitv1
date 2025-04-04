import React from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

export function PlatformLogosGrid() {
  // Carefully selected marketing questions (fewer bubbles, better organization)
  const chatBubbles = [
    {
      text: "How did Meta ROAS compare to Google last month?",
      color: "from-indigo-400/90 to-blue-500/90",
      position: { top: "10%", left: "5%" },
      size: "max-w-[260px]"
    },
    {
      text: "Analyze our Q1 performance vs competitors",
      color: "from-purple-400/90 to-fuchsia-500/90",
      position: { top: "12%", left: "62%" },
      size: "max-w-[250px]"
    },
    {
      text: "Show conversion trends for the last 6 months",
      color: "from-lime-500/80 to-emerald-400/80",
      position: { top: "37%", left: "15%" },
      size: "max-w-[270px]"
    },
    {
      text: "What's our blended ROAS across platforms YTD?",
      color: "from-amber-400/80 to-orange-400/80",
      position: { top: "66%", left: "8%" },
      size: "max-w-[260px]"
    },
    {
      text: "Create an A/B test for our product listings",
      color: "from-sky-400/90 to-blue-400/90",
      position: { top: "40%", right: "10%" },
      size: "max-w-[250px]"
    },
    {
      text: "Which campaigns have the highest CTR?",
      color: "from-rose-400/80 to-red-400/80",
      position: { top: "65%", right: "15%" },
      size: "max-w-[240px]"
    }
  ];

  return (
    <div className="py-16">
      <motion.h2 
        className="text-center text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Ask your marketing copilot anything
      </motion.h2>
      
      <motion.p 
        className="text-center text-slate-400 mb-12 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        From campaign creation to performance analysis, just ask in everyday language
      </motion.p>
      
      <motion.div 
        className="max-w-6xl mx-auto px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Desktop layout (fixed positions) */}
        <div className="hidden md:block h-[400px] relative">
          {chatBubbles.map((bubble, index) => (
            <motion.div
              key={index}
              className={`absolute bg-gradient-to-r ${bubble.color} px-5 py-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md text-white text-sm ${bubble.size} flex items-start gap-3`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
              style={bubble.position}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.15)"
              }}
            >
              <div className="rounded-full bg-white/20 p-1.5 mt-0.5 flex-shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <span>{bubble.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Mobile layout (stacked grid) */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {chatBubbles.map((bubble, index) => (
            <motion.div
              key={index}
              className={`bg-gradient-to-r ${bubble.color} px-5 py-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md text-white text-sm w-full flex items-start gap-3`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.1 + (index * 0.05) }}
              whileHover={{ 
                scale: 1.02, 
                boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)"
              }}
            >
              <div className="rounded-full bg-white/20 p-1.5 mt-0.5 flex-shrink-0">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <span>{bubble.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}