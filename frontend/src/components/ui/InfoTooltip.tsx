import React, { useState, useRef, useEffect } from "react";
import { Info, Question } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  title: string;
  whatIsIt: string;
  whyItMatters: string;
  healthyValues?: Array<{ label: string, desc: string, status?: "success" | "warning" | "critical" | "neutral" }>;
  howToImprove?: string[];
  align?: "left" | "center" | "right";
  icon?: "info" | "help";
}

export function InfoTooltip({ 
  title, 
  whatIsIt, 
  whyItMatters, 
  healthyValues, 
  howToImprove,
  align = "center",
  icon = "info"
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle Alignment
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0"
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case "success": return "bg-success/20 text-success";
      case "warning": return "bg-warning/20 text-warning";
      case "critical": return "bg-critical/20 text-critical";
      default: return "bg-surface-3 text-text-primary";
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-1.5 p-0.5 rounded-full text-text-tertiary hover:text-accent hover:bg-accent-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label={`Learn more about ${title}`}
      >
        {icon === "info" ? <Info className="w-3.5 h-3.5" /> : <Question className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[100] top-full mt-2 w-80 sm:w-96 bg-surface-1 border border-border-strong rounded-2xl shadow-floating overflow-hidden text-left pointer-events-auto",
              alignClasses[align]
            )}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            {/* Header */}
            <div className="bg-surface-2 px-5 py-3 border-b border-border-subtle">
              <h4 className="font-display font-semibold text-text-primary text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-accent" /> {title}
              </h4>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5 max-h-[400px] overflow-y-auto">
              
              <section>
                <h5 className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5">What is this?</h5>
                <p className="text-sm text-text-primary leading-relaxed">{whatIsIt}</p>
              </section>

              <section>
                <h5 className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5">Why it matters</h5>
                <p className="text-sm text-text-secondary leading-relaxed bg-surface-2 p-3 rounded-xl border border-border-base">
                  {whyItMatters}
                </p>
              </section>

              {healthyValues && healthyValues.length > 0 && (
                <section>
                  <h5 className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5">Healthy Values</h5>
                  <div className="space-y-2">
                    {healthyValues.map((val, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap", getStatusColor(val.status))}>
                          {val.label}
                        </span>
                        <span className="text-text-secondary">{val.desc}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {howToImprove && howToImprove.length > 0 && (
                <section>
                  <h5 className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-1.5">How to improve</h5>
                  <ul className="space-y-1.5">
                    {howToImprove.map((item, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
