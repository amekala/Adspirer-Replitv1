import React from "react";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

export function PlatformLogosGrid() {
  // Example marketing questions that users can ask their copilot
  const chatQuestions = [
    "Create a PMax campaign for my summer collection",
    "Build a Meta Advantage+ campaign for new line of Nike Airforce",
    "What's our blended ROAS across platforms YTD?",
    "Where should I reallocate $5K budget for best ROAS?",
    "How did Meta ROAS compare to Google last month?",
    "Which campaigns have the highest CTR?", 
    "Analyze our Q1 performance vs competitors",
    "Create an A/B test for our product listings",
    "Show conversion trends for the last 6 months",
    "Suggest budget optimization for holiday season"
  ];

  // Different gradient colors for the chat bubbles
  const gradients = [
    "from-purple-500 to-pink-500",      // Purple to Pink 
    "from-blue-500 to-cyan-400",        // Blue to Cyan
    "from-amber-500 to-orange-500",     // Amber to Orange
    "from-emerald-500 to-teal-500",     // Emerald to Teal
    "from-indigo-500 to-blue-500",      // Indigo to Blue
    "from-red-500 to-rose-500",         // Red to Rose
    "from-fuchsia-500 to-pink-500",     // Fuchsia to Pink
    "from-sky-500 to-indigo-500",       // Sky to Indigo  
    "from-lime-500 to-emerald-500",     // Lime to Emerald
    "from-rose-500 to-red-500"          // Rose to Red
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
        className="max-w-5xl mx-auto relative"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="h-[400px] md:h-[350px] relative">
          {chatQuestions.map((question, index) => (
            <motion.div
              key={index}
              className={`absolute bg-gradient-to-r ${gradients[index]} px-5 py-3 rounded-2xl shadow-lg text-white text-sm max-w-[280px] flex items-start gap-3`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
              style={{
                top: `${Math.floor(Math.random() * 60) + (index % 3) * 30}%`,
                left: index % 2 === 0 
                  ? `${Math.floor(Math.random() * 20)}%` 
                  : `${Math.floor(Math.random() * 20) + 60}%`,
                zIndex: index
              }}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
              }}
            >
              <div className="rounded-full bg-white/20 p-1.5 mt-0.5">
                <MessageSquare className="h-3.5 w-3.5 text-white" />
              </div>
              <span>{question}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}