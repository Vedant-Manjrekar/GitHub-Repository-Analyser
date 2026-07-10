import React, { useEffect } from "react";
import { 
  Check, X, ShieldCheck, GitBranch, Users, ShieldWarning, 
  Cpu, FolderSimple, Sparkle, LockSimple, SignIn, UserPlus
} from "@phosphor-icons/react";

interface AuthLockProps {
  onLoginClick: () => void;
  onClose: () => void;
  featureName: string;
  featureDesc: string;
}

export function AuthLock({ onLoginClick, onClose, featureName, featureDesc }: AuthLockProps) {
  
  // Disable body scroll when the auth lock modal is mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const comparisonRows = [
    { icon: <GitBranch className="w-4 h-4 text-amber-500" />, label: "Executive Summary & Repo Health", free: true, pro: true },
    { icon: <Users className="w-4 h-4 text-sky-500" />, label: "Contributor Intel & Ranks", free: false, pro: true },
    { icon: <ShieldWarning className="w-4 h-4 text-rose-500" />, label: "Risk Insights & Churn Maps", free: false, pro: true },
    { icon: <Cpu className="w-4 h-4 text-violet-500" />, label: "Technical Debt Modularity Treemap", free: false, pro: true },
    { icon: <FolderSimple className="w-4 h-4 text-emerald-500" />, label: "Interactive Repository Explorer", free: false, pro: true },
    { icon: <Sparkle className="w-4 h-4 text-indigo-500" />, label: "AI Code Copilot Suggestions", free: false, pro: true },
  ];

  return (
    /* Fixed Modal Overlay - Centers the container globally and locks scrolling */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/50 backdrop-blur-[4px] overflow-y-auto">
      <div className="bg-white rounded-3xl overflow-hidden shadow-floating border border-border-strong w-full max-w-4xl flex flex-col md:flex-row h-full max-h-[520px] animate-in zoom-in-95 duration-300">
        
        {/* Left Pane (Dark View) */}
        <div className="w-full md:w-[48%] bg-neutral-900 text-white p-6 flex flex-col justify-between shrink-0">
          <div>
            {/* Table Column Titles */}
            <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase pb-3 border-b border-neutral-800">
              <span>Core Features</span>
              <div className="flex gap-6 pr-2">
                <span className="w-8 text-center">Free</span>
                <span className="w-8 text-center">Pro</span>
              </div>
            </div>

            {/* Table Feature Rows */}
            <div className="space-y-2 mt-3">
              {comparisonRows.map((row, idx) => (
                <div key={idx} className="bg-neutral-800/40 border border-neutral-800/30 rounded-xl p-3 flex items-center justify-between text-xs transition-all hover:bg-neutral-800/60">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      {row.icon}
                    </div>
                    <span className="font-semibold text-neutral-200 truncate">{row.label}</span>
                  </div>
                  <div className="flex gap-6 shrink-0">
                    {/* Free Column Indicator */}
                    <div className="w-8 flex items-center justify-center">
                      {row.free ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3" weight="bold" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" weight="bold" />
                        </div>
                      )}
                    </div>

                    {/* Pro Column Indicator */}
                    <div className="w-8 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        <Check className="w-3 h-3" weight="bold" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Tagline */}
          <div className="pt-4 border-t border-neutral-800 mt-4 flex items-center gap-2 text-[10px] font-mono text-neutral-400">
            <LockSimple className="w-3.5 h-3.5 text-accent" />
            <span>SECURED PLATFORM ACCESS</span>
          </div>
        </div>

        {/* Right Pane (Light View) */}
        <div className="w-full md:w-[52%] bg-neutral-50 p-6 flex flex-col justify-between text-neutral-900 relative">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-neutral-200 transition-colors cursor-pointer z-20"
            title="Return to homepage"
          >
            <X className="w-4.5 h-4.5 text-neutral-500 hover:text-neutral-900" />
          </button>

          {/* Header Lock Logo & Text */}
          <div className="flex flex-col items-center text-center mt-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-lg mb-4">
              <LockSimple className="w-6 h-6" weight="bold" />
            </div>
            <h3 className="font-display font-black text-lg text-neutral-900 tracking-tight uppercase">
              {featureName}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed px-2">
              {featureDesc}
            </p>
          </div>

          {/* Plan Options Selector replaced with direct Signin/Login Call to Actions */}
          <div className="space-y-3 my-6">
            <div 
              onClick={onLoginClick}
              className="group rounded-2xl p-4 border border-neutral-200 bg-white hover:border-accent hover:bg-accent/[0.01] transition-all cursor-pointer flex items-center gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all">
                <SignIn className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-neutral-900 block">Sign In to Account</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Use existing email credentials to access dashboard</span>
              </div>
            </div>

            <div 
              onClick={onLoginClick}
              className="group rounded-2xl p-4 border border-neutral-200 bg-white hover:border-accent hover:bg-accent/[0.01] transition-all cursor-pointer flex items-center gap-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/20 group-hover:bg-violet-500 group-hover:text-white transition-all">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-neutral-900 block">Register / Create Account</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Register a free developer account to unlock full features</span>
              </div>
            </div>
          </div>

          {/* Actions & Footer Trust indicators */}
          <div className="space-y-4">
            <button 
              onClick={onLoginClick}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer text-center block"
            >
              Get Started
            </button>

            <div className="text-center pb-2">
              <p className="text-[9px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Authentication validates access tokens and enables historical Git branch monitoring reports.
              </p>

              {/* Secure Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[8px] font-bold uppercase tracking-wider mt-3">
                <ShieldCheck className="w-3 h-3" /> SECURE AUTH ACCESS
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
