import React from "react";
import { cn } from "@/lib/utils";

interface MetricRingProps {
  score: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  lowerIsBetter?: boolean;
}

export function MetricRing({ 
  score, 
  max = 100, 
  size = 64, 
  strokeWidth = 6, 
  className,
  lowerIsBetter = false
}: MetricRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.max(0, Math.min(100, (score / max) * 100));
  const offset = circumference - (percent / 100) * circumference;
  
  // Determine color based on score
  let strokeColor = "text-success";
  const colorPercent = lowerIsBetter ? 100 - percent : percent;
  if (colorPercent < 50) strokeColor = "text-critical";
  else if (colorPercent < 75) strokeColor = "text-warning";
  else strokeColor = "text-success";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Track */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          fill="transparent" 
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3"
        />
        {/* Progress Circle */}
        <circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          fill="transparent" 
          stroke="currentColor" 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", strokeColor)}
        />
      </svg>
      {/* Central Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display font-bold leading-none", size > 80 ? "text-2xl" : "text-sm", strokeColor)}>
          {score}
        </span>
      </div>
    </div>
  );
}
