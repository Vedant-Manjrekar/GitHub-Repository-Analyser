import React from "react";
import { 
  ChartLine, ShieldWarning, Cpu, Users, FolderSimple, Gear, 
  CaretUpDown, MagnifyingGlass, Question, CaretLeft, CheckCircle 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

const navItems = [
  { id: "overview", label: "Executive Summary", icon: ChartLine },
  { id: "contributors", label: "Contributor Intel", icon: Users },
  { id: "divider1", isDivider: true },
  { id: "hotspots", label: "Risk Insights", icon: ShieldWarning },
  { id: "debt", label: "Technical Debt", icon: Cpu },
  { id: "explorer", label: "Repository Explorer", icon: FolderSimple },
];

export function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse, className }: SidebarProps) {
  return (
    <aside className={cn(
      "bg-white border-r border-[#E9ECEF] flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 shadow-sm",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      
      {/* Top Profile Card Container */}
      <div className={cn("p-4 border-b border-[#E9ECEF]", isCollapsed && "p-3 flex justify-center")}>
        <div className={cn(
          "relative rounded-xl border border-[#E9ECEF] bg-white p-2 flex items-center justify-between transition-all duration-300",
          isCollapsed ? "justify-center border-none p-0 bg-transparent" : "gap-3"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Profile Avatar Card representation */}
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#FFB085] flex items-center justify-center shrink-0 border border-black/5 shadow-sm">
                <svg viewBox="0 0 32 32" className="w-8 h-8 mt-1.5">
                  <circle cx="16" cy="13" r="6" fill="#FAD0C4" />
                  <path d="M10 29c0-3.5 3.5-5.5 6-5.5s6 2 6 5.5" fill="#FAD0C4" />
                  <path d="M9 11c0-2.5 3-3.5 7-3.5s7 1 7 3.5c0 0.5-0.5 1-1.5 1h-11C9 12 9 11.5 9 11z" fill="#E05A47" />
                </svg>
              </div>
              {/* Tiny Logo Badge */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-black border border-white flex items-center justify-center text-[7px] font-bold text-white shadow-subtle shrink-0">
                <span className="scale-90">AG</span>
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">Vedant Manjrekar</p>
                <p className="text-[10px] text-[#8E959E] font-mono truncate">vedant@riverstone.com</p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <CaretUpDown className="w-3.5 h-3.5 text-[#8E959E] shrink-0" />
          )}
        </div>
      </div>

      {/* Navigation List Container */}
      <div className={cn("flex-1 p-4 overflow-y-auto custom-scrollbar", isCollapsed && "p-3")}>
        
        {/* Search Mockup */}
        <div className={cn("relative mb-6", isCollapsed && "flex justify-center")}>
          {isCollapsed ? (
            <button className="w-9 h-9 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] hover:bg-[#E9ECEF]/55 flex items-center justify-center text-[#6C757D] hover:text-text-primary transition-colors cursor-pointer shadow-subtle">
              <MagnifyingGlass className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative w-full">
              <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E959E]" />
              <input
                type="text"
                readOnly
                placeholder="Search"
                className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] text-xs font-medium text-[#6C757D] placeholder-[#8E959E] focus:outline-none cursor-pointer hover:bg-[#E9ECEF]/30 transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold bg-white border border-[#E9ECEF] px-1.5 py-0.5 rounded text-[#8E959E] shadow-subtle">K</kbd>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            if (item.isDivider) {
              return <div key={item.id} className="border-t border-dashed border-[#E9ECEF] my-4 mx-2" />;
            }

            const isActive = activeTab === item.id;
            const Icon = item.icon;
            if (!Icon) return null;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id!)}
                className={cn(
                  "w-full flex items-center rounded-xl transition-all duration-150 group cursor-pointer relative",
                  isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 justify-start gap-3.5",
                  isActive 
                    ? "bg-[#212529] text-white shadow-subtle border border-[#212529]" 
                    : "text-[#6C757D] hover:text-text-primary hover:bg-[#F8F9FA] border border-transparent"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-white" : "text-[#8E959E] group-hover:text-[#495057]")} />
                
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-left">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Support / Options */}
      <div className={cn("p-4 border-t border-[#E9ECEF] bg-[#F8F9FA]/40 space-y-1", isCollapsed && "p-3 flex flex-col items-center")}>
        {/* Support Link */}
        <button className={cn(
          "w-full flex items-center rounded-xl text-xs font-semibold text-[#6C757D] hover:text-text-primary hover:bg-[#F8F9FA] transition-colors cursor-pointer",
          isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
        )}>
          <Question className="w-4.5 h-4.5 text-[#8E959E] shrink-0" />
          {!isCollapsed && <span className="text-[#6C757D] hover:text-[#495057]">Support / Help</span>}
        </button>

        {/* Workspace Settings Link */}
        <button className={cn(
          "w-full flex items-center rounded-xl text-xs font-semibold text-[#6C757D] hover:text-text-primary hover:bg-[#F8F9FA] transition-colors cursor-pointer",
          isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
        )}>
          <Gear className="w-4.5 h-4.5 text-[#8E959E] shrink-0" />
          {!isCollapsed && <span className="text-[#6C757D] hover:text-[#495057]">Settings</span>}
        </button>

        {/* Toggle Collapse Menu Button */}
        <button 
          onClick={onToggleCollapse}
          className={cn(
            "w-full flex items-center rounded-xl text-xs font-semibold text-[#6C757D] hover:text-text-primary hover:bg-[#F8F9FA] transition-colors cursor-pointer border border-transparent",
            isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
          )}
        >
          <CaretLeft className={cn("w-4.5 h-4.5 text-[#8E959E] shrink-0 transition-transform duration-300", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>

    </aside>
  );
}
