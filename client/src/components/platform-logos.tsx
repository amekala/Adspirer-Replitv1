import { useState } from "react";
import { GlassPanel } from "./ui/glass-panel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type LogoType = {
  name: string;
  logo: string;
  category: "retailer" | "adPlatform";
};

const platformLogos: LogoType[] = [
  // Retailers
  { name: "Amazon", logo: "https://placehold.co/60x60/3498DB/FFF?text=Amazon", category: "retailer" },
  { name: "Walmart", logo: "https://placehold.co/60x60/3498DB/FFF?text=Walmart", category: "retailer" },
  { name: "Target", logo: "https://placehold.co/60x60/3498DB/FFF?text=Target", category: "retailer" },
  { name: "Instacart", logo: "https://placehold.co/60x60/3498DB/FFF?text=Instacart", category: "retailer" },
  { name: "Walgreens", logo: "https://placehold.co/60x60/3498DB/FFF?text=Walgreens", category: "retailer" },
  { name: "Kroger", logo: "https://placehold.co/60x60/3498DB/FFF?text=Kroger", category: "retailer" },
  { name: "Costco", logo: "https://placehold.co/60x60/3498DB/FFF?text=Costco", category: "retailer" },
  { name: "CVS", logo: "https://placehold.co/60x60/3498DB/FFF?text=CVS", category: "retailer" },
  
  // Ad Platforms
  { name: "Meta", logo: "https://placehold.co/60x60/4267B2/FFF?text=Meta", category: "adPlatform" },
  { name: "Google", logo: "https://placehold.co/60x60/DB4437/FFF?text=Google", category: "adPlatform" },
  { name: "Snap", logo: "https://placehold.co/60x60/FFFC00/000?text=Snap", category: "adPlatform" },
];

export function PlatformLogos() {
  return (
    <GlassPanel className="p-8 my-12">
      <h3 className="text-xl font-semibold text-center mb-6">
        Integrated with the platforms that matter
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
        {platformLogos.map((platform) => (
          <LogoItem key={platform.name} platform={platform} />
        ))}
      </div>
    </GlassPanel>
  );
}

function LogoItem({ platform }: { platform: LogoType }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="bg-white/5 backdrop-blur-md p-3 rounded-md border border-white/10 flex items-center justify-center h-[80px] transition-all duration-200 hover:bg-white/10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <img
              src={platform.logo}
              alt={`${platform.name} logo`}
              className="w-[60px] h-[60px] object-contain transition-opacity"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{platform.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 