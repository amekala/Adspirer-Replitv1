import React from "react";
import { motion } from "framer-motion";

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
      
      <motion.div 
        className="max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="grid grid-cols-5 md:grid-cols-5 gap-6 justify-center max-w-4xl mx-auto">
          {["Amazon", "Google", "Meta", "Walmart", "Target", 
            "Instacart", "Kroger", "Costco", "CVS", "Walgreens"].map((platform, index) => (
            <motion.div
              key={platform}
              className="aspect-square flex items-center justify-center rounded-xl bg-slate-900/50 backdrop-blur-md border border-slate-800/50 shadow-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <span className={`text-base font-medium text-${index < 3 ? ['amber-400', 'blue-400', 'facebook-500'][index] : 'slate-200'}`}>
                {platform}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}