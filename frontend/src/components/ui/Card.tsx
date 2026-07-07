import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  elevation?: "none" | "subtle" | "elevated" | "floating";
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = "subtle", interactive = false, children, ...props }, ref) => {
    
    const shadows = {
      none: "",
      subtle: "shadow-subtle",
      elevated: "shadow-elevated",
      floating: "shadow-floating"
    };

    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -3 } : {}}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={cn(
          "bg-surface-1 rounded-[20px] overflow-hidden",
          shadows[elevation],
          interactive && "cursor-pointer hover:shadow-elevated hover:bg-white transition-all duration-300",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-5 flex items-center justify-between", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-base font-display font-bold text-text-primary tracking-tight", className)} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 pb-6 pt-0", className)} {...props}>
    {children}
  </div>
);
