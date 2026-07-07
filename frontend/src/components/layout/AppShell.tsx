import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopCommandBar } from "./TopCommandBar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  repoName?: string;
  onBackToWorkspace: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onTabChange, repoName, onBackToWorkspace, children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-bg-base font-sans selection:bg-accent-subtle selection:text-accent overflow-hidden">
      {/* Sidebar - fixed left */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex" 
      />

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300", isCollapsed ? "lg:pl-20" : "lg:pl-64")}>
        {/* Top Command Bar */}
        <TopCommandBar repoName={repoName} onBackToWorkspace={onBackToWorkspace} />

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-12 bg-bg-base">
          <div className="max-w-[1400px] mx-auto w-full pb-16">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
