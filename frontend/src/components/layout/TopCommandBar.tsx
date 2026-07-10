import React, { useState, useEffect } from "react";
import { MagnifyingGlass, Bell, ArrowLeft, SignIn, Sun, Moon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TopCommandBarProps {
  repoName?: string;
  onBackToWorkspace: () => void;
  className?: string;
  user: { name: string; email: string } | null;
  onLoginClick: () => void;
}

export function TopCommandBar({ repoName, onBackToWorkspace, className, user, onLoginClick }: TopCommandBarProps) {
  const [isDark, setIsDark] = useState(false);

  // Sync theme with HTML class and localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className={cn("h-16 bg-surface-1 border-b border-border-base flex items-center justify-between px-8 sticky top-0 z-20", className)}>
      <div className="flex items-center gap-4">
        {repoName && (
          <button 
            onClick={onBackToWorkspace}
            className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all duration-200 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Select Repository</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Cmd+K input */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-strong bg-bg-base hover:bg-surface-2 text-text-tertiary hover:text-text-secondary transition-all text-xs font-medium w-48 sm:w-64 justify-between group cursor-pointer">
          <div className="flex items-center gap-2">
            <MagnifyingGlass className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            <span>Search anything...</span>
          </div>
          <kbd className="text-[9px] font-mono bg-surface-3 px-1.5 py-0.5 rounded text-text-tertiary font-bold shadow-subtle">⌘K</kbd>
        </button>

        {/* Theme Toggler */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors relative cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse-slow"></span>
        </button>

        {!user && (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            <SignIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
