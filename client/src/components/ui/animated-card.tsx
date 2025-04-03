import React, { useState, ReactNode } from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  variant?: "default" | "gradient" | "outline" | "glass";
  hoverEffect?: "lift" | "glow" | "border" | "none";
  isInteractive?: boolean;
  gradientBorder?: boolean;
  children?: ReactNode;
}

const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    className, 
    children, 
    variant = "default", 
    hoverEffect = "lift",
    isInteractive = true,
    gradientBorder = false,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    
    // Base card styles based on variant
    const variantStyles = {
      default: "bg-slate-900/50 backdrop-blur-md border border-slate-800",
      gradient: "bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/30",
      outline: "bg-transparent backdrop-blur-sm border border-slate-700/50",
      glass: "bg-white/[0.01] backdrop-blur-md border border-white/[0.05]"
    };
    
    // Motion variants for different hover effects
    const motionVariants: Record<string, Variants> = {
      lift: {
        initial: { y: 0 },
        hover: { y: -8, transition: { duration: 0.3, ease: "easeOut" } }
      },
      glow: {
        initial: { boxShadow: "0 0 0 rgba(139, 92, 246, 0)" },
        hover: { boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)", transition: { duration: 0.3 } }
      },
      border: {
        initial: { borderColor: "rgba(255, 255, 255, 0.05)" },
        hover: { borderColor: "rgba(139, 92, 246, 0.5)", transition: { duration: 0.3 } }
      },
      none: {
        initial: {},
        hover: {}
      }
    };
    
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden relative",
          variantStyles[variant],
          isInteractive ? "cursor-pointer" : "",
          className
        )}
        initial={hoverEffect !== "none" ? "initial" : undefined}
        animate={isHovered && hoverEffect !== "none" ? "hover" : "initial"}
        variants={motionVariants[hoverEffect]}
        onMouseEnter={() => isInteractive && setIsHovered(true)}
        onMouseLeave={() => isInteractive && setIsHovered(false)}
        {...props}
      >
        {/* Gradient border effect */}
        {gradientBorder && (
          <motion.div 
            className="absolute inset-0 rounded-xl p-[1px] z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          </motion.div>
        )}
        
        {/* Card content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

interface AnimatedCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const AnimatedCardHeader = React.forwardRef<HTMLDivElement, AnimatedCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);

AnimatedCardHeader.displayName = "AnimatedCardHeader";

interface AnimatedCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AnimatedCardTitle = React.forwardRef<HTMLHeadingElement, AnimatedCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-semibold tracking-tight text-white",
        className
      )}
      {...props}
    />
  )
);

AnimatedCardTitle.displayName = "AnimatedCardTitle";

interface AnimatedCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AnimatedCardDescription = React.forwardRef<HTMLParagraphElement, AnimatedCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-slate-300", className)}
      {...props}
    />
  )
);

AnimatedCardDescription.displayName = "AnimatedCardDescription";

interface AnimatedCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const AnimatedCardContent = React.forwardRef<HTMLDivElement, AnimatedCardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
);

AnimatedCardContent.displayName = "AnimatedCardContent";

interface AnimatedCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const AnimatedCardFooter = React.forwardRef<HTMLDivElement, AnimatedCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);

AnimatedCardFooter.displayName = "AnimatedCardFooter";

export {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedCardFooter
}; 