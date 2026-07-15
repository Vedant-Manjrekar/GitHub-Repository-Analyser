import React from "react";
import { 
  ChartLine, ShieldWarning, Cpu, Users, FolderSimple, Gear, 
  CaretUpDown, MagnifyingGlass, Question, CaretLeft 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
  user: { name: string; email: string; role?: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

const navItems = [
  { id: "overview", label: "Executive Summary", icon: ChartLine },
  { id: "contributors", label: "Contributor Intel", icon: Users },
  { id: "divider1", isDivider: true },
  { id: "hotspots", label: "Risk Insights", icon: ShieldWarning },
  { id: "debt", label: "Technical Debt", icon: Cpu },
  { id: "explorer", label: "Repository Explorer", icon: FolderSimple },
];

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  isCollapsed, 
  onToggleCollapse, 
  className,
  user,
  onLoginClick,
  onLogout
}: SidebarProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);

  const getInitials = (n: string) => {
    return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <aside className={cn(
      "bg-surface-1 border-r border-border-base flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-300 shadow-sm",
      isCollapsed ? "w-20" : "w-64",
      className
    )}>
      
      {/* Top Profile Card Container */}
      <div className={cn("p-4 border-b border-border-base relative", isCollapsed && "p-3 flex justify-center")}>
        <div 
          onClick={user ? () => setShowDropdown(!showDropdown) : onLoginClick}
          className={cn(
            "relative rounded-xl border border-border-base bg-surface-1 p-2 flex items-center justify-between transition-all duration-300 cursor-pointer hover:bg-surface-2",
            isCollapsed ? "justify-center border-none p-0 bg-transparent" : "gap-3"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              {/* Profile Avatar Card representation */}
              {user ? (
                <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-display font-bold text-sm border border-accent/25 shrink-0 select-none shadow-sm">
                  {getInitials(user.name)}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center text-text-tertiary border border-border-strong shrink-0 select-none shadow-sm">
                  G
                </div>
              )}
              {/* Tiny Logo Badge */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-black border border-white flex items-center justify-center text-[7px] font-bold text-white shadow-subtle shrink-0">
                <span className="scale-90">AG</span>
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">
                  {user ? user.name : "Guest Account"}
                </p>
                <p className="text-[10px] text-text-tertiary font-mono truncate">
                  {user ? user.email : "Click to Login"}
                </p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <CaretUpDown className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          )}
        </div>

        {/* Dropdown menu for logout */}
        {showDropdown && user && !isCollapsed && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-surface-1 border border-border-strong rounded-xl shadow-floating p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onLogout();
                setShowDropdown(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-critical hover:bg-critical/10 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Navigation List Container */}
      <div className={cn("flex-1 p-4 overflow-y-auto custom-scrollbar", isCollapsed && "p-3")}>
        
        {/* Search Mockup */}
        <div className={cn("relative mb-6", isCollapsed && "flex justify-center")}>
          {isCollapsed ? (
            <button className="w-9 h-9 rounded-xl border border-border-base bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer shadow-subtle">
              <MagnifyingGlass className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative w-full">
              <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                readOnly
                placeholder="Search"
                className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-border-base bg-surface-2 text-xs font-medium text-text-secondary placeholder-text-tertiary focus:outline-none cursor-pointer hover:bg-surface-3 transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold bg-surface-1 border border-border-base px-1.5 py-0.5 rounded text-text-tertiary shadow-subtle">K</kbd>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            if (item.isDivider) {
              return <div key={item.id} className="border-t border-dashed border-border-base my-4 mx-2" />;
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
                    ? "bg-text-primary text-surface-1 shadow-subtle border border-text-primary" 
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
                )}
              >
                <Icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-surface-1" : "text-text-tertiary group-hover:text-text-secondary")} />
                
                {!isCollapsed && (
                  <span className="text-xs font-semibold text-left">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Support / Options */}
      <div className={cn("p-4 border-t border-border-base bg-surface-2/40 space-y-1", isCollapsed && "p-3 flex flex-col items-center")}>
        {/* Support Link */}
        <button className={cn(
          "w-full flex items-center rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer",
          isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
        )}>
          <Question className="w-4.5 h-4.5 text-text-tertiary shrink-0" />
          {!isCollapsed && <span className="text-text-secondary hover:text-text-primary">Support / Help</span>}
        </button>

        {/* Workspace Settings Link */}
        <button className={cn(
          "w-full flex items-center rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer",
          isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
        )}>
          <Gear className="w-4.5 h-4.5 text-text-tertiary shrink-0" />
          {!isCollapsed && <span className="text-text-secondary hover:text-text-primary">Settings</span>}
        </button>

        {/* Toggle Collapse Menu Button */}
        <button 
          onClick={onToggleCollapse}
          className={cn(
            "w-full flex items-center rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent",
            isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3.5"
          )}
        >
          <CaretLeft className={cn("w-4.5 h-4.5 text-text-tertiary shrink-0 transition-transform duration-300", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>

    </aside>
  );
}
