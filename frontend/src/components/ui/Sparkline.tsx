import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface SparklineProps {
  data: number[];
  color?: "success" | "warning" | "critical" | "accent";
  className?: string;
}

export function Sparkline({ data, color = "accent", className }: SparklineProps) {
  // Map data to Recharts format
  const chartData = data.map((val, i) => ({ value: val, index: i }));
  
  const colors = {
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    critical: "var(--color-critical)",
    accent: "var(--color-accent)"
  };

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={colors[color]} 
            strokeWidth={2} 
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
