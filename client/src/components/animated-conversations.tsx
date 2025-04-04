import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { MessageSquare, BarChart3, TrendingUp, User, ArrowRight } from "lucide-react";
import { AnimatedCard, AnimatedCardHeader, AnimatedCardTitle, AnimatedCardContent } from "@/components/ui/animated-card";
import { AnimatedButton } from "@/components/ui/animated-button";

export function AnimatedConversations() {
  return (
    <div className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column - Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Chat with Your Data
            </h2>
            
            <p className="text-slate-300 text-lg mb-6">
              Our conversational interface transforms complex advertising data into actionable insights. 
              Simply ask questions about your campaigns in natural language.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Get performance metrics across all platforms",
                "Discover optimization opportunities in seconds",
                "Understand complex trends through simple conversations",
                "Receive data-driven recommendations"
              ].map((item, index) => (
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
                  <span className="text-slate-300">{item}</span>
                </motion.li>
              ))}
            </ul>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <AnimatedButton asChild gradient="primary" size="lg">
                <Link href="/auth">
                  Try Chat Analytics 
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </AnimatedButton>
            </motion.div>
          </motion.div>
          
          {/* Right column - Chat visualization */}
          <motion.div
            className="order-1 lg:order-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-70" />
              <div className="relative">
                <img 
                  src="/chat-analytics.svg" 
                  alt="AI Chat Interface" 
                  className="w-full h-auto rounded-xl shadow-2xl"
                />
              </div>
              
              {/* Floating badges */}
              <motion.div 
                className="absolute -bottom-6 -left-6 bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-indigo-500/30"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <p className="text-white text-sm font-medium">Real-time data</p>
              </motion.div>
              
              <motion.div 
                className="absolute -top-6 -right-6 bg-violet-600/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-violet-500/30"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <p className="text-white text-sm font-medium">Natural language</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}