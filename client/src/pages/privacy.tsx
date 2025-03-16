import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert">
            <p className="text-muted-foreground mb-8">
              Last updated: March 15, 2025
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Information We Collect</h2>
            <p className="text-muted-foreground mb-8">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-8">
              <li>• Account information (name, email, company details)</li>
              <li>• Authentication tokens for advertising platforms</li>
              <li>• Campaign and performance data</li>
              <li>• Usage data and analytics</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-12 mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground mb-8">
              We use the collected information to:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-8">
              <li>• Provide and improve our services</li>
              <li>• Process your advertising data</li>
              <li>• Send important notifications</li>
              <li>• Analyze and optimize platform performance</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Data Security</h2>
            <p className="text-muted-foreground mb-8">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-8">
              <li>• Encryption of sensitive data</li>
              <li>• Regular security audits</li>
              <li>• Access controls and monitoring</li>
              <li>• Secure data storage and transmission</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-12 mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-8">
              If you have any questions about our Privacy Policy, please contact us:
            </p>
            <Button asChild>
              <Link href="/">Contact Support</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
