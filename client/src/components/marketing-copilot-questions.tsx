import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, BarChart3, BarChart4, PieChart, Sparkles, LineChart, Settings } from "lucide-react";

export function MarketingCopilotQuestions() {
  // Carefully curated marketing questions of different lengths for visual interest
  const chatBubbles = [
    {
      text: "How did Meta ROAS compare to Google last month?",
      color: "from-indigo-400/80 to-blue-500/80",
      width: "w-[280px]",
      icon: <LineChart className="h-3.5 w-3.5 text-white" />
    },
    {
      text: "Analyze our Q1 performance vs competitors",
      color: "from-purple-400/80 to-fuchsia-500/80",
      width: "w-[260px]",
      icon: <BarChart4 className="h-3.5 w-3.5 text-white" />
    },
    {
      text: "Create a PMax campaign for my summer collection",
      color: "from-sky-400/80 to-blue-400/80",
      width: "w-[305px]",
      icon: <Sparkles className="h-3.5 w-3.5 text-white" />
    },
    {
      text: "What's our blended ROAS across platforms YTD?",
      color: "from-amber-400/80 to-orange-400/80",
      width: "w-[260px]",
      icon: <PieChart className="h-3.5 w-3.5 text-white" />
    },
    {
      text: "Where should I reallocate $5K budget for best ROAS?",
      color: "from-teal-400/80 to-green-400/80",
      width: "w-[310px]",
      icon: <Settings className="h-3.5 w-3.5 text-white" />
    },
    {
      text: "Which campaigns have the highest CTR?",
      color: "from-rose-400/80 to-red-400/80",
      width: "w-[230px]",
      icon: <BarChart3 className="h-3.5 w-3.5 text-white" />
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
        Your personal marketing copilot
      </motion.h2>
      
      <motion.p 
        className="text-center text-slate-400 mb-12 max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Connect platforms, create campaigns, analyze data, and optimize performance - all through simple conversation
      </motion.p>
      
      <motion.div 
        className="max-w-6xl mx-auto px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Desktop layout - Two rows of evenly spaced bubbles */}
        <div className="hidden md:flex flex-col gap-10">
          {/* Row 1 */}
          <div className="flex justify-between items-center">
            {chatBubbles.slice(0, 3).map((bubble, index) => (
              <motion.div
                key={index}
                className={`bg-gradient-to-r ${bubble.color} px-5 py-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md text-white text-sm ${bubble.width} flex items-start gap-3`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 0 20px rgba(255, 255, 255, 0.15)"
                }}
              >
                <div className="rounded-full bg-white/20 p-1.5 mt-0.5 flex-shrink-0">
                  {bubble.icon}
                </div>
                <span>{bubble.text}</span>
              </motion.div>
            ))}
          </div>
          
          {/* Row 2 */}
          <div className="flex justify-between items-center">
            {chatBubbles.slice(3, 6).map((bubble, index) => (
              <motion.div
                key={index + 3}
                className={`bg-gradient-to-r ${bubble.color} px-5 py-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md text-white text-sm ${bubble.width} flex items-start gap-3`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0 0 20px rgba(255, 255, 255, 0.15)"
                }}
              >
                <div className="rounded-full bg-white/20 p-1.5 mt-0.5 flex-shrink-0">
                  {bubble.icon}
                </div>
                <span>{bubble.text}</span>
              </motion.div>
            ))}
          </div>
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
                {bubble.icon}
              </div>
              <span>{bubble.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}