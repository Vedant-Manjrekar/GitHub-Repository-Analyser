import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-2xl font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-accent-subtle disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      // Vibrant gradient for primary action, typical of Stripe
      primary: "bg-gradient-to-b from-accent-hover to-accent text-white shadow-elevated hover:shadow-floating hover:from-accent hover:to-accent-hover",
      // Soft secondary button
      secondary: "bg-surface-2 text-text-primary hover:bg-surface-3 hover:shadow-subtle",
      outline: "border-2 border-border-base text-text-primary hover:border-border-strong hover:bg-surface-1",
      ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
      danger: "bg-critical text-white shadow-elevated hover:bg-red-600"
    };
    
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-5 text-sm",
      lg: "h-14 px-8 text-base"
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
