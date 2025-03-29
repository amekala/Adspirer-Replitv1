import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "text-white",
        secondary: "text-white",
        outline: "bg-transparent border",
        ghost: "bg-transparent hover:bg-white/10",
        link: "bg-transparent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 px-3 rounded-md text-xs",
        lg: "h-12 px-8 rounded-md text-base",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  gradient?: "primary" | "secondary" | "accent" | "none";
  glowEffect?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    gradient = "primary",
    glowEffect = true,
    children,
    ...props 
  }, ref) => {
    // Define gradient backgrounds
    const gradientStyles = {
      primary: "bg-gradient-to-r from-indigo-600 to-violet-600",
      secondary: "bg-gradient-to-r from-indigo-600 to-blue-600",
      accent: "bg-gradient-to-r from-fuchsia-600 to-pink-600",
      none: "",
    };
    
    // Define hover gradient backgrounds
    const hoverGradientStyles = {
      primary: "bg-gradient-to-r from-indigo-500 to-violet-500",
      secondary: "bg-gradient-to-r from-indigo-500 to-blue-500",
      accent: "bg-gradient-to-r from-fuchsia-500 to-pink-500",
      none: "",
    };
    
    // Border gradients
    const borderGradients = {
      primary: "before:bg-gradient-to-r before:from-indigo-400 before:to-violet-400",
      secondary: "before:bg-gradient-to-r before:from-indigo-400 before:to-blue-400",
      accent: "before:bg-gradient-to-r before:from-fuchsia-400 before:to-pink-400",
      none: "",
    };
    
    // Only add gradient if not using outline, ghost, or link variants
    const shouldUseGradient = 
      gradient !== "none" && 
      variant !== "outline" && 
      variant !== "ghost" && 
      variant !== "link";
    
    // Container for the glow effect
    const GlowContainer = ({ children }: { children: React.ReactNode }) => {
      if (!glowEffect || variant === "ghost" || variant === "link") {
        return <>{children}</>;
      }
      
      return (
        <span className="group relative inline-flex">
          {/* Glow effect */}
          <span className={`
            absolute -inset-px rounded-md opacity-0 transition-all duration-300
            group-hover:opacity-100 blur-md
            ${gradientStyles[gradient]}
          `} />
          {children}
        </span>
      );
    };

    const buttonContent = (
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="relative z-10"
      >
        {asChild ? (
          // When using asChild, we pass only one child with all the styling and contents
          React.cloneElement(
            React.Children.only(children as React.ReactElement),
            {
              className: cn(
                buttonVariants({ variant, size }),
                shouldUseGradient ? gradientStyles[gradient] : "",
                variant === "outline" ? `border border-white/20 ${borderGradients[gradient]}` : "",
                "relative overflow-hidden z-10 group",
                className,
                (children as React.ReactElement).props.className || ""
              ),
              style: {
                ...(children as React.ReactElement).props.style,
              },
              ...props
            }
          )
        ) : (
          <button
            className={cn(
              buttonVariants({ variant, size }),
              shouldUseGradient ? gradientStyles[gradient] : "",
              variant === "outline" ? `border border-white/20 ${borderGradients[gradient]}` : "",
              "relative overflow-hidden z-10 group",
              className
            )}
            ref={ref}
            {...props}
          >
            {/* Hover overlay */}
            {shouldUseGradient && (
              <span className={`
                absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity 
                ${hoverGradientStyles[gradient]}
              `} />
            )}
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {children}
            </span>
          </button>
        )}
      </motion.div>
    );
    
    return (
      <GlowContainer>
        {asChild ? (
          <Slot>{buttonContent}</Slot>
        ) : (
          buttonContent
        )}
      </GlowContainer>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton }; 