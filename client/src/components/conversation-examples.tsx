import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "./ui/glass-card";
import { Avatar } from "./ui/avatar";
import { BarChart3, MessageSquare, TrendingUp } from "lucide-react";

export function ConversationExamples() {
  return (
    <div className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">How Adspirer Works</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See how our conversational interface transforms complex advertising data into actionable insights
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <ConversationCard
          title="Campaign Performance Analysis"
          icon={<MessageSquare className="h-6 w-6 text-primary" />}
          conversation={[
            {
              role: "user",
              content: "How is my Summer Sale campaign performing?"
            },
            {
              role: "assistant",
              content: "Your Summer Sale campaign has seen a 28% increase in ROAS over the past 2 weeks. Top performing ad sets are 'Beach Essentials' and 'Outdoor Living'.",
              chart: "https://placehold.co/600x200/3498DB/FFF?text=Summer+Campaign+Performance"
            }
          ]}
        />

        <ConversationCard
          title="Opportunity Identification"
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          conversation={[
            {
              role: "user",
              content: "Where should I focus to improve performance on Walmart?"
            },
            {
              role: "assistant",
              content: "Based on your data, increasing investment in your 'Kitchen Appliances' category on Walmart could yield a 30% ROAS improvement. Your competitors are underinvesting in this category.",
              chart: "https://placehold.co/600x200/3498DB/FFF?text=Retail+Opportunity+Analysis" 
            }
          ]}
        />

        <ConversationCard
          title="Budget Optimization"
          icon={<BarChart3 className="h-6 w-6 text-primary" />}
          conversation={[
            {
              role: "user",
              content: "How should I reallocate my budget for better performance?"
            },
            {
              role: "assistant",
              content: "I recommend shifting 15% of your Amazon budget to Instacart and 10% to Walmart. This could increase your overall ROAS by 22% based on current channel performance.",
              chart: "https://placehold.co/600x200/3498DB/FFF?text=Budget+Optimization"
            }
          ]}
        />
      </div>
    </div>
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
  chart?: string;
};

type ConversationCardProps = {
  title: string;
  icon: React.ReactNode;
  conversation: Message[];
};

function ConversationCard({ title, icon, conversation }: ConversationCardProps) {
  return (
    <GlassCard className="overflow-hidden">
      <GlassCardHeader className="flex flex-row items-center gap-2 border-b border-white/10 bg-white/5">
        <div className="bg-primary/10 rounded-lg p-3 mr-2">
          {icon}
        </div>
        <GlassCardTitle>{title}</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="p-0">
        <div className="space-y-4 p-4">
          {conversation.map((message, index) => (
            <div 
              key={index} 
              className={`flex gap-3 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <div className="bg-primary/20 text-primary w-full h-full flex items-center justify-center text-xs font-semibold">AI</div>
                </Avatar>
              )}
              <div className={`max-w-[80%] ${message.role === "assistant" ? "bg-primary/10" : "bg-white/10"} p-3 rounded-lg`}>
                <p className="text-sm">{message.content}</p>
                {message.chart && (
                  <div className="mt-3 bg-background/50 p-2 rounded">
                    <img 
                      src={message.chart} 
                      alt="Chart visualization"
                      className="rounded w-full h-auto max-h-32 object-contain"
                    />
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 border-2 border-white/20">
                  <div className="bg-secondary/20 text-secondary w-full h-full flex items-center justify-center text-xs font-semibold">You</div>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
} 