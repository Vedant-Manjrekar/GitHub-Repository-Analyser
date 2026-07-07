import React from "react";
import { GitBranch, Clock, Database, Calendar, Users2, FileCode, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface RepoHeaderProps {
  dashboard: any;
}

export function RepoHeader({ dashboard }: RepoHeaderProps) {
  const repo = dashboard?.repository || {};
  const stats = [
    { label: "Total Commits", value: dashboard?.total_commits || 0, icon: GitBranch },
    { label: "Total Files", value: dashboard?.total_files || 0, icon: FileCode },
    { label: "Contributors", value: dashboard?.total_contributors || 0, icon: Users2 },
    { label: "Repository Size", value: repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : "1.2 MB", icon: Database }
  ];

  return (
    <section className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8 border-b border-border-strong">
        
        {/* Repo Title & Meta */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[22px] bg-accent/5 flex items-center justify-center font-display text-2xl font-black text-accent shadow-subtle ring-4 ring-accent/5 shrink-0">
            {repo.name ? repo.name.substring(0, 2).toUpperCase() : "GR"}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">
                {repo.name || "Git Repository"}
              </h1>
              <Badge variant="success" className="px-3 py-1 text-[11px] rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success inline" /> Analyzed
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-[11px] rounded-lg bg-surface-1 font-mono">
                <GitBranch className="w-3 h-3 mr-1 text-text-secondary inline" /> main
              </Badge>
            </div>
            <p className="text-sm text-text-secondary font-medium max-w-xl">
              {repo.description || "Comprehensive architectural code reviews, risk analysis, and technical debt visualization for engineering teams."}
            </p>
            <div className="flex items-center gap-3 text-xs text-text-tertiary font-semibold pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Last analyzed: {new Date().toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-accent">
                Language: {repo.language || "TypeScript"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 w-full lg:w-auto">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-surface-1 rounded-2xl p-4 shadow-subtle flex flex-col justify-between min-w-[120px] ring-1 ring-border-base">
              <div className="flex items-center justify-between text-text-tertiary mb-2">
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary mb-0.5">{stat.label}</p>
                <p className="text-lg font-bold font-display text-text-primary">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
