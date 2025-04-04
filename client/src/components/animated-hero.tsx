import React from "react";
import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/animated-button";
import { Link } from "wouter";
import { ChevronRight, User, Rocket, ArrowRight, MessageSquare } from "lucide-react";

interface AnimatedHeroProps {
  scrollToDemo: () => void;
}

export function AnimatedHero({ scrollToDemo }: AnimatedHeroProps) {
  return (
    <div className="relative pt-20 pb-20 md:pt-28 md:pb-28">
      <div className="container mx-auto px-4 relative z-10">
        {/* Gradient orb decorations */}
        <div className="absolute -top-40 -left-40 w-[300px] h-[300px] bg-indigo-500/30 rounded-full blur-[100px] -z-10" />
        <div className="absolute -bottom-40 -right-40 w-[300px] h-[300px] bg-violet-500/30 rounded-full blur-[100px] -z-10" />
        
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left side - Main text content */}
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-950/60 backdrop-blur-md border border-indigo-800/50 mb-8">
              <Rocket className="h-4 w-4 mr-2 text-indigo-400" />
              <span className="text-sm text-indigo-300">The future of campaign management</span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
                Chat With Your{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500">
                  Ad Campaigns
                </span>
              </h1>
            </motion.div>
            
            <motion.p 
              className="text-lg text-slate-300 mb-8 max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            >
              Ditch complex dashboards. Simply ask questions in natural language and get instant insights across Amazon, Google, and Meta platforms.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <AnimatedButton asChild size="lg" gradient="primary" glowEffect>
                <Link href="/auth" className="group">
                  Get Started Free
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </AnimatedButton>
              
              <AnimatedButton 
                onClick={scrollToDemo} 
                size="lg" 
                variant="outline" 
                gradient="accent"
              >
                Request Demo
              </AnimatedButton>
            </motion.div>
            
            <motion.div
              className="flex flex-col gap-3 mt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="text-sm text-slate-400 mb-1">
                Works with top retail and ad platforms
              </span>
              
              <div className="flex flex-wrap gap-4 items-center">
                {/* Platform logos */}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
                  <div className="w-6 h-6 rounded-full bg-amber-500/90 flex items-center justify-center text-xs font-semibold">A</div>
                  <span className="text-xs font-medium text-amber-300">Amazon</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
                  <div className="w-6 h-6 rounded-full bg-blue-500/90 flex items-center justify-center text-xs font-semibold">G</div>
                  <span className="text-xs font-medium text-blue-300">Google</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
                  <div className="w-6 h-6 rounded-full bg-facebook-500/90 flex items-center justify-center text-xs font-semibold">M</div>
                  <span className="text-xs font-medium text-facebook-300">Meta</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
                  <div className="w-6 h-6 rounded-full bg-blue-700/90 flex items-center justify-center text-xs font-semibold">W</div>
                  <span className="text-xs font-medium text-blue-300">Walmart</span>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800/50">
                  <div className="w-6 h-6 rounded-full bg-red-600/90 flex items-center justify-center text-xs font-semibold">T</div>
                  <span className="text-xs font-medium text-red-300">Target</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Right side - Chat Interface */}
          <motion.div 
            className="flex-1 max-w-lg w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/70 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Ad Campaign Assistant</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs text-emerald-500">Online</span>
                </div>
              </div>
              
              {/* Chat messages */}
              <div className="p-4 space-y-4 min-h-[340px]">
                {/* User message 1 */}
                <div className="flex justify-end gap-3">
                  <div className="bg-indigo-600/20 backdrop-blur-md p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm text-slate-200">How are my campaigns performing this week?</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                
                {/* AI response 1 */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-400">
                    AI
                  </div>
                  <div className="bg-slate-800/70 backdrop-blur-md p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm text-slate-200">
                      Your Amazon campaigns have seen a 24% increase in ROAS this week. Google Ads performance is stable with a slight increase in CTR by 0.3%.
                    </p>
                  </div>
                </div>
                
                {/* User message 2 */}
                <div className="flex justify-end gap-3">
                  <div className="bg-indigo-600/20 backdrop-blur-md p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm text-slate-200">Which campaign has the highest ROAS?</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                
                {/* AI response 2 */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-400">
                    AI
                  </div>
                  <div className="bg-slate-800/70 backdrop-blur-md p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm text-slate-200">
                      Your 'Summer Collection' campaign on Amazon has the highest ROAS at 4.8x, followed by 'Brand Awareness' on Google at 3.2x.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Chat input */}
              <div className="p-4 border-t border-slate-800/70">
                <div className="flex items-center gap-2 relative">
                  <input 
                    type="text" 
                    placeholder="Ask about your campaigns..."
                    className="w-full py-2 px-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button className="absolute right-3 flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600 text-white">
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 