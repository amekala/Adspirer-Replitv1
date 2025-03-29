import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, BarChart3, TrendingUp, User } from "lucide-react";
import { AnimatedCard, AnimatedCardHeader, AnimatedCardTitle, AnimatedCardContent } from "@/components/ui/animated-card";

type Message = {
  role: "user" | "assistant";
  content: string;
  chart?: string;
};

type Conversation = {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  delay: number;
  messages: Message[];
};

const conversations: Conversation[] = [
  {
    title: "Campaign Performance",
    icon: <MessageSquare className="h-5 w-5 text-indigo-400" />,
    iconBg: "bg-indigo-500/10",
    delay: 0.1,
    messages: [
      {
        role: "user",
        content: "How is my Summer Sale campaign performing?"
      },
      {
        role: "assistant",
        content: "Your Summer Sale campaign has seen a 28% increase in ROAS over the past 2 weeks. Top performing ad sets are 'Beach Essentials' and 'Outdoor Living'.",
        chart: "https://placehold.co/600x200/3498DB/FFF?text=Summer+Campaign+Performance"
      }
    ]
  },
  {
    title: "Opportunity Detection",
    icon: <TrendingUp className="h-5 w-5 text-violet-400" />,
    iconBg: "bg-violet-500/10",
    delay: 0.3,
    messages: [
      {
        role: "user",
        content: "Where should I focus to improve performance on Walmart?"
      },
      {
        role: "assistant",
        content: "Based on your data, increasing investment in your 'Kitchen Appliances' category on Walmart could yield a 30% ROAS improvement. Your competitors are underinvesting in this category.",
        chart: "https://placehold.co/600x200/9333EA/FFF?text=Retail+Opportunity+Analysis" 
      }
    ]
  },
  {
    title: "Budget Optimization",
    icon: <BarChart3 className="h-5 w-5 text-fuchsia-400" />,
    iconBg: "bg-fuchsia-500/10",
    delay: 0.5,
    messages: [
      {
        role: "user",
        content: "How should I reallocate my budget for better performance?"
      },
      {
        role: "assistant",
        content: "I recommend shifting 15% of your Amazon budget to Instacart and 10% to Walmart. This could increase your overall ROAS by 22% based on current channel performance.",
        chart: "https://placehold.co/600x200/DB2777/FFF?text=Budget+Optimization"
      }
    ]
  }
];

export function AnimatedConversations() {
  return (
    <div className="py-20">
      <div className="text-center mb-16">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Chat with Your Data
        </motion.h2>
        <motion.p
          className="text-slate-400 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Our conversational interface transforms complex advertising data into actionable insights
        </motion.p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {conversations.map((convo, index) => (
          <ConversationCard key={index} conversation={convo} />
        ))}
      </div>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
}

function ConversationCard({ conversation }: ConversationCardProps) {
  const { title, icon, iconBg, delay, messages } = conversation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <AnimatedCard
        variant="gradient"
        hoverEffect="lift"
        className="overflow-hidden"
      >
        <AnimatedCardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-slate-800/70">
          <div className={`rounded-lg p-2 mr-2 ${iconBg}`}>
            {icon}
          </div>
          <AnimatedCardTitle>{title}</AnimatedCardTitle>
        </AnimatedCardHeader>
        <AnimatedCardContent className="p-0">
          <div className="p-4 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                    AI
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === "assistant" ? "bg-slate-800/50" : "bg-indigo-500/10"} p-3 rounded-lg`}>
                  <p className="text-sm text-slate-300">{message.content}</p>
                  {message.chart && (
                    <div className="mt-3 bg-slate-900/50 p-2 rounded-md border border-slate-800/70">
                      <img
                        src={message.chart}
                        alt="Chart visualization"
                        className="rounded w-full h-auto max-h-32 object-contain"
                      />
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-violet-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </AnimatedCardContent>
      </AnimatedCard>
    </motion.div>
  );
} 