import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "critical" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors";
  
  const variants = {
    default: "bg-surface-3 text-text-primary",
    success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    critical: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    outline: "border border-border-strong text-text-secondary"
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
