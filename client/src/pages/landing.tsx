import { Link } from "wouter";
import { useState, useRef } from "react";
import { Menu, Headset } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedBackground } from "@/components/animated-background";
import { AnimatedHero } from "@/components/animated-hero";
import { MarketingCopilotQuestions } from "@/components/marketing-copilot-questions";
import { AnimatedConversations } from "@/components/animated-conversations";
import { AnimatedFeatures } from "@/components/animated-features";
import { DemoRequestForm } from "@/components/demo-request-form";
import { motion } from "framer-motion";
import { AnimatedCard, AnimatedCardContent } from "@/components/ui/animated-card";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const demoFormRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const scrollToDemo = () => {
    demoFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const closeSheet = () => setIsOpen(false);

  return (
    <ThemeProvider>
      <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <AnimatedBackground />
        
        {/* Navigation */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/70 dark:border-slate-800/70 bg-black/10 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              Adspirer
            </h1>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center space-x-6">
                <Link href="/about" className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                  About Us
                </Link>
                <Link href="/privacy" className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                  Privacy
                </Link>
                <button 
                  onClick={scrollToDemo} 
                  className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Contact Us
                </button>
                {isLoading ? (
                  <div className="h-9 w-9 rounded-md bg-slate-800/50 animate-pulse"></div>
                ) : user ? (
                  <AnimatedButton asChild gradient="primary">
                    <Link href="/chat">Go to Chat</Link>
                  </AnimatedButton>
                ) : (
                  <AnimatedButton asChild gradient="primary">
                    <Link href="/auth">Get Started</Link>
                  </AnimatedButton>
                )}
              </div>

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <AnimatedButton variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </AnimatedButton>
                </SheetTrigger>
                <SheetContent side="right" className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50">
                  <SheetHeader>
                    <SheetTitle className="text-left text-slate-900 dark:text-white">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-8">
                    <Link href="/" onClick={closeSheet} className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                      Home
                    </Link>
                    <Link href="/about" onClick={closeSheet} className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                      About Us
                    </Link>
                    <Link href="/privacy" onClick={closeSheet} className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                      Privacy
                    </Link>
                    <button 
                      onClick={() => {
                        scrollToDemo();
                        closeSheet();
                      }} 
                      className="text-left text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                    >
                      Contact Us
                    </button>
                    {user ? (
                      <Link href="/chat" onClick={closeSheet} className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                        Go to Chat
                      </Link>
                    ) : (
                      <Link href="/auth" onClick={closeSheet} className="text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                        Get Started
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="pt-24">
          {/* Hero Section */}
          <section className="container mx-auto px-4">
            <AnimatedHero scrollToDemo={scrollToDemo} />
          </section>
          
          {/* Marketing Copilot Questions */}
          <section className="container mx-auto px-4">
            <MarketingCopilotQuestions />
          </section>
          
          {/* Conversation Examples */}
          <section className="container mx-auto px-4">
            <AnimatedConversations />
          </section>
          
          {/* Features Grid */}
          <section className="container mx-auto px-4">
            <AnimatedFeatures />
          </section>
          
          {/* How It Works Section */}
          <section className="container mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Meet Your Marketing Copilot
              </motion.h2>
              <motion.p
                className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Your trusted companion for smarter marketing decisions, always by your side
              </motion.p>
            </div>
            
            <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8">
              {[
                {
                  step: 1,
                  title: "Connect Your Platforms",
                  description: "Your copilot seamlessly integrates with all your advertising accounts",
                  delay: 0.1
                },
                {
                  step: 2,
                  title: "Chat with Your Copilot",
                  description: "Simply ask for what you need in everyday language - no jargon required",
                  delay: 0.2
                },
                {
                  step: 3,
                  title: "Get Instant Insights",
                  description: "Your copilot analyzes your data and presents meaningful visualizations",
                  delay: 0.3
                },
                {
                  step: 4,
                  title: "Grow with Guidance",
                  description: "Your copilot suggests personalized improvements to boost your results",
                  delay: 0.4
                }
              ].map((item) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: item.delay }}
                  className="text-center"
                >
                  <div className="inline-flex h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 items-center justify-center mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                    <span className="text-lg font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </section>
          
          {/* Demo Request Form */}
          <section ref={demoFormRef} className="container mx-auto px-4 py-20 scroll-mt-24">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Ready to Meet Your Marketing Copilot?
              </motion.h2>
              <motion.p
                className="text-lg md:text-xl text-slate-600 dark:text-slate-400"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Get in touch with our team to schedule a personalized demo
              </motion.p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <AnimatedCard variant="gradient" className="overflow-hidden">
                  <DemoRequestForm />
                </AnimatedCard>
              </motion.div>

              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <AnimatedCard variant="outline" hoverEffect="border">
                    <AnimatedCardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Why Request a Demo?</h3>
                      <ul className="space-y-3 text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>Experience how your marketing copilot works with your actual data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>See how you can boost your ROAS by up to 30% with copilot guidance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>Find opportunities your marketing copilot can uncover in minutes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>Learn how to get the most from your new marketing assistant</span>
                        </li>
                      </ul>
                    </AnimatedCardContent>
                  </AnimatedCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <AnimatedCard variant="outline" hoverEffect="border">
                    <AnimatedCardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Already a Customer?</h3>
                      <p className="text-slate-700 dark:text-slate-300 mb-4">
                        Already working with your copilot? Our team is ready to help you get even more from your marketing assistant.
                      </p>
                      <AnimatedButton variant="outline" gradient="accent" className="w-full">
                        <Headset className="mr-2 h-4 w-4" />
                        Contact Support
                      </AnimatedButton>
                    </AnimatedCardContent>
                  </AnimatedCard>
                </motion.div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-200/70 dark:border-slate-800/70 py-12 mt-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 md:mb-0">
                © {new Date().getFullYear()} Adspirer. All rights reserved.
              </p>
              <div className="flex gap-6">
                <Link href="/about" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/privacy" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Privacy
                </Link>
                <button 
                  onClick={scrollToDemo}
                  className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}