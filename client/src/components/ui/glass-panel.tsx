import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "low" | "medium" | "high";
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, intensity = "medium", ...props }, ref) => {
    const intensityStyles = {
      low: "bg-white/5 backdrop-blur-md",
      medium: "bg-white/10 backdrop-blur-xl",
      high: "bg-white/20 backdrop-blur-2xl",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-white/20 shadow-sm",
          intensityStyles[intensity],
          className
        )}
        {...props}
      />
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export { GlassPanel }; 