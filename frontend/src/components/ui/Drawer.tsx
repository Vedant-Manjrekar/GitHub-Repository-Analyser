import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowSquareOut } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  avatarLetter?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

export function Drawer({ isOpen, onClose, title, subtitle, avatarLetter, children, width = "md" }: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl"
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-[100]"
          />
          
          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed inset-y-0 right-0 z-[100] w-full bg-surface-1 border-l border-border-base shadow-floating flex flex-col",
              widths[width]
            )}
          >
            {/* Rich Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border-subtle shrink-0 bg-surface-1">
              <div className="flex items-start justify-between gap-3">
                {/* Avatar + Name + Subtitle */}
                <div className="flex items-center gap-3 min-w-0">
                  {avatarLetter ? (
                    <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center font-display font-black text-xl border border-accent/25 shrink-0 select-none">
                      {avatarLetter}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    {title && (
                      <h2 className="font-display font-bold text-base text-text-primary truncate leading-tight">{title}</h2>
                    )}
                    {subtitle && (
                      <p className="text-xs text-text-tertiary mt-0.5 truncate font-mono">{subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    title="Open in new tab"
                  >
                    <ArrowSquareOut className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-bg-base/50">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
