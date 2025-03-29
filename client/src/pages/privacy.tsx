import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { GlassBackground } from "@/components/glass-background";
import { GlassPanel } from "@/components/ui/glass-panel";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger
} from "@/components/ui/accordion";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <GlassBackground />
      
      <div className="container mx-auto px-4 py-12">
        <Button variant="glass" asChild className="mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <GlassPanel className="p-6 mb-8">
            <p className="text-muted-foreground">
              Last updated: March 15, 2025
            </p>
          </GlassPanel>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="bg-white/10 backdrop-blur-md rounded-lg px-6 py-4 border border-white/20">
                <h2 className="text-xl font-semibold">Information We Collect</h2>
              </AccordionTrigger>
              <AccordionContent className="bg-white/5 backdrop-blur-sm mt-1 px-6 py-4 rounded-lg border border-white/10">
                <p className="text-muted-foreground mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Account information (name, email, company details)</li>
                  <li>• Authentication tokens for advertising platforms</li>
                  <li>• Campaign and performance data</li>
                  <li>• Usage data and analytics</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-none">
              <AccordionTrigger className="bg-white/10 backdrop-blur-md rounded-lg px-6 py-4 border border-white/20">
                <h2 className="text-xl font-semibold">How We Use Your Information</h2>
              </AccordionTrigger>
              <AccordionContent className="bg-white/5 backdrop-blur-sm mt-1 px-6 py-4 rounded-lg border border-white/10">
                <p className="text-muted-foreground mb-4">
                  We use the collected information to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Provide and improve our services</li>
                  <li>• Process your advertising data</li>
                  <li>• Send important notifications</li>
                  <li>• Analyze and optimize platform performance</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-none">
              <AccordionTrigger className="bg-white/10 backdrop-blur-md rounded-lg px-6 py-4 border border-white/20">
                <h2 className="text-xl font-semibold">Data Security</h2>
              </AccordionTrigger>
              <AccordionContent className="bg-white/5 backdrop-blur-sm mt-1 px-6 py-4 rounded-lg border border-white/10">
                <p className="text-muted-foreground mb-4">
                  We implement appropriate security measures to protect your information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Encryption of sensitive data</li>
                  <li>• Regular security audits</li>
                  <li>• Access controls and monitoring</li>
                  <li>• Secure data storage and transmission</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <GlassPanel className="p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-6">
              If you have any questions about our Privacy Policy, please contact us:
            </p>
            <Button variant="glass" asChild>
              <Link href="/">Contact Support</Link>
            </Button>
          </GlassPanel>
        </div>
      </div>
      
      <footer className="border-t border-white/10 py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Adspirer. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
