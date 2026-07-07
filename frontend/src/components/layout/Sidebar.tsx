import React from "react";
import { Activity, ShieldAlert, Cpu, Users, FolderTree, Settings, Command, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const navItems = [
  { id: "overview", label: "Executive Summary", icon: Activity },
  { id: "hotspots", label: "Risk Landscape", icon: ShieldAlert },
  { id: "debt", label: "Technical Debt", icon: Cpu },
  { id: "contributors", label: "Contributor Intel", icon: Users },
  { id: "explorer", label: "Repository Explorer", icon: FolderTree },
];

export function Sidebar({ activeTab, onTabChange, className }: SidebarProps) {
  return (
    <aside className={cn("w-64 bg-surface-1 border-r border-border-base flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300", className)}>
      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-6 border-b border-border-base">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shadow-elevated">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-text-primary uppercase">
            Antigravity
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <p className="px-3 mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-text-tertiary">
          Intelligence Layers
        </p>
        
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative group",
                isActive ? "text-accent bg-accent-subtle" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <div className="flex items-center gap-3 z-10">
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary")} />
                <span>{item.label}</span>
              </div>
              
              <ChevronRight className={cn("w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity z-10", isActive ? "text-accent opacity-100" : "text-text-tertiary")} />
              
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-accent-subtle rounded-xl border-l-2 border-accent"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Shortcuts */}
      <div className="p-4 border-t border-border-base bg-bg-base/30 space-y-2">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-text-tertiary" />
            <span>Search Workspace</span>
          </div>
          <kbd className="text-[10px] font-mono bg-surface-3 px-1.5 py-0.5 rounded text-text-tertiary shadow-subtle border border-border-strong">⌘K</kbd>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
          <Settings className="w-3.5 h-3.5 text-text-tertiary" />
          <span>Workspace Settings</span>
        </button>
      </div>
    </aside>
  );
}
