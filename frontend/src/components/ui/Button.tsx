import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-subtle disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    
    const variants = {
      primary: "bg-accent hover:bg-accent-hover text-white shadow-subtle border border-accent/10",
      secondary: "bg-surface-2 text-text-primary hover:bg-surface-3 border border-border-base",
      outline: "border border-border-strong text-text-primary hover:bg-surface-2",
      ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
      danger: "bg-critical hover:bg-critical/95 text-white shadow-subtle border border-critical/10"
    };
    
    const sizes = {
      sm: "h-9 px-3.5 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-13 px-7 text-base"
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
