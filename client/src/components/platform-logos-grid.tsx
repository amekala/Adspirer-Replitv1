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
        className="max-w-5xl mx-auto flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="relative w-full max-w-4xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl filter blur-xl opacity-30" />
          <div className="relative p-6 rounded-2xl overflow-hidden">
            <img 
              src="/platforms-grid.svg" 
              alt="Platform logos" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}