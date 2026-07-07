import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AlertCircle, FileDigit, ListTodo, Wrench, ChevronRight, CheckCircle2, Info, Clock, AlertTriangle } from "lucide-react";

interface TechDebtVisualizerProps {
  techDebt: any;
  complexityFiles: any[];
}

export function TechDebtVisualizer({ techDebt, complexityFiles }: TechDebtVisualizerProps) {
  const [selectedIssueIdx, setSelectedIssueIdx] = useState<number | null>(null);

  const maxComplexity = Math.max(...(complexityFiles?.map(f => f.complexity) || [10]));
  const avgComplexity = complexityFiles?.length > 0 
    ? Math.round(complexityFiles.reduce((a, b) => a + b.complexity, 0) / complexityFiles.length * 100) / 100 
    : 0;

  // Visual Mocked Issues for structured actionable lists based on the analysed codebase
  const mockActionableIssues = [
    {
      title: "Monolithic Controller Restructuring",
      type: "Complexity Bottleneck",
      severity: "High",
      priority: "P1",
      cleanupEffort: "2-3 Hours",
      files: complexityFiles?.slice(0, 1).map(f => f.path.split("/").pop()) || ["app/controller.py"],
      fullPath: complexityFiles?.slice(0, 1).map(f => f.path) || ["app/controller.py"],
      recommendation: "Extract helper functions, isolate nested conditionals into separate route files, and decouple dependencies."
    },
    {
      title: "Resolve Outstanding inline TODOs",
      type: "Documented Technical Debt",
      severity: "Medium",
      priority: "P2",
      cleanupEffort: "1 Hour",
      files: ["Multiple Modules"],
      fullPath: ["Check TODO list under codebase explorer"],
      recommendation: "Ensure legacy inline FIXME blocks are mapped into actual Jira tickets to avoid context loss."
    },
    {
      title: "Key Developer File Knowledge Transfer",
      type: "Bus Factor Bottleneck",
      severity: "High",
      priority: "P1",
      cleanupEffort: "4-5 Hours",
      files: complexityFiles?.slice(1, 2).map(f => f.path.split("/").pop()) || ["app/config.py"],
      fullPath: complexityFiles?.slice(1, 2).map(f => f.path) || ["app/config.py"],
      recommendation: "Enforce review checklists for other engineers on these complex files to distribute codebase understanding."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div>
        <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Technical Debt Visualizer</h2>
        <p className="text-sm text-text-secondary mt-1">
          A granular view of refactoring backlog, code quality debt, and complex code modules.
        </p>
      </div>

      {/* Debt Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* TODO Density */}
        <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base/50 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between text-warning">
            <ListTodo className="w-5 h-5" />
            <InfoTooltip 
              title="TODO & FIXME Density"
              whatIsIt="The total number of inline development tags (TODO, FIXME, HACK) present in the codebase."
              whyItMatters="High density indicates postponed feature polishing or temporary fixes that can introduce regressions."
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary">TODO/FIXME Comments</p>
            <p className="text-3xl font-bold font-display text-text-primary">{techDebt?.total_todos || 0}</p>
          </div>
        </div>

        {/* Complex Files Count */}
        <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base/50 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between text-critical">
            <FileDigit className="w-5 h-5" />
            <InfoTooltip 
              title="Complex Modules"
              whatIsIt="The number of file entries that exceed the standard threshold of cyclomatic complexity (10)."
              whyItMatters="Complex logic is difficult to trace, hard to write unit tests for, and has a higher bug rate."
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary">Complexity Backlog (CC &gt; 10)</p>
            <p className="text-3xl font-bold font-display text-text-primary">{techDebt?.complex_files_count || 0}</p>
          </div>
        </div>

        {/* Average File Complexity */}
        <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base/50 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between text-accent">
            <AlertCircle className="w-5 h-5" />
            <InfoTooltip 
              title="Average Complexity"
              whatIsIt="The average logical branching score of the most complex files in the codebase."
              whyItMatters="A high average suggests that even simple updates might require extensive debugging."
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary">Average File Complexity</p>
            <p className="text-3xl font-bold font-display text-text-primary">{avgComplexity}</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Complexity Heatmap - Spans 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base/50 space-y-4">
            <div className="flex items-center justify-between border-b border-border-base pb-3">
              <h3 className="text-base font-display font-bold text-text-primary flex items-center gap-2">
                <Wrench className="w-4 h-4 text-accent" /> Complexity Distribution Heatmap
              </h3>
              <Badge variant="outline" className="rounded-lg bg-bg-base">Top Backlog Files</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {complexityFiles && complexityFiles.length > 0 ? (
                complexityFiles.slice(0, 9).map((f: any, idx: number) => {
                  const intensity = f.complexity / maxComplexity;
                  const isCritical = f.complexity > 20;
                  
                  return (
                    <div 
                      key={f.id || idx}
                      className="p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between min-h-[110px]"
                      style={{
                        backgroundColor: isCritical ? `rgba(239, 68, 68, ${0.05 + (intensity * 0.15)})` : `rgba(245, 158, 11, ${0.03 + (intensity * 0.12)})`,
                        borderColor: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-lg font-black ${isCritical ? 'bg-critical text-white' : 'bg-warning/20 text-warning'}`}>
                          CC {f.complexity}
                        </span>
                        <span className="text-[10px] text-text-secondary font-bold">{f.churn} edits</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-text-primary truncate" title={f.path}>
                          {f.path.split("/").pop()}
                        </p>
                        <p className="text-[10px] text-text-tertiary truncate font-mono">
                          {f.path}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-text-tertiary">
                  <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <p className="font-semibold text-sm mb-1 text-text-primary">All Modules Clear</p>
                  <p className="text-xs">No complex files found in the current branch.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actionable Tech Debt Backlog Sidebar - Spans 4 Columns */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base/50 space-y-4">
            <h3 className="text-base font-display font-bold text-text-primary flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" /> Actionable Cleanup Tasks
            </h3>
            
            <div className="space-y-3">
              {mockActionableIssues.map((issue, idx) => {
                const isOpen = selectedIssueIdx === idx;
                return (
                  <div key={idx} className="border border-border-base rounded-2xl overflow-hidden transition-all duration-200">
                    <button 
                      onClick={() => setSelectedIssueIdx(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 bg-surface-1 hover:bg-bg-base text-left transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono font-bold text-text-tertiary uppercase tracking-wider">{issue.type}</span>
                        <h4 className="text-xs font-bold text-text-primary">{issue.title}</h4>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                    
                    {isOpen && (
                      <div className="p-4 bg-bg-base/50 border-t border-border-base space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-text-secondary">
                          <div>
                            <span className="text-text-tertiary block font-mono text-[9px] uppercase font-bold">Severity</span>
                            <span className={`font-semibold ${issue.severity === "High" ? "text-critical" : "text-warning"}`}>{issue.severity}</span>
                          </div>
                          <div>
                            <span className="text-text-tertiary block font-mono text-[9px] uppercase font-bold">Effort</span>
                            <span className="font-semibold text-text-primary">{issue.cleanupEffort}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-text-tertiary block font-mono text-[9px] uppercase font-bold mb-1">Recommendation</span>
                          <p className="text-text-secondary leading-relaxed">{issue.recommendation}</p>
                        </div>
                        <div>
                          <span className="text-text-tertiary block font-mono text-[9px] uppercase font-bold mb-1">Impacted Files</span>
                          <span className="font-mono text-text-primary font-bold text-[10px] break-all bg-surface-2 p-1.5 rounded-lg block">
                            {issue.files.join(", ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
