import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { 
  FileCode, MagnifyingGlass, CaretRight, ShieldWarning, GitCommit, User, 
  Wrench, Hash, Folder, Play, CheckSquare, List, Sparkle, Terminal 
} from "@phosphor-icons/react";

interface VSCodeExplorerProps {
  hotspots: any[];
}

export function VSCodeExplorer({ hotspots }: VSCodeExplorerProps) {
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const filteredFiles = hotspots?.filter(f => f.path.toLowerCase().includes(searchFilter.toLowerCase())) || [];

  // Parse suggestion bullet points into clean checklist format
  const parseRefactoringChecklist = (suggestion: string, score: number, complexity: number) => {
    let clean = suggestion;
    if (!clean) {
      if (score >= 65) {
        clean = "Major Regression Risk Detected.\n- Extract massive logic blocks into smaller modules.\n- Ensure robust unit test coverage before refactoring.\n- Decouple shared variables.";
      } else if (complexity > 8.0) {
        clean = "High Complexity Warning.\n- Refactor nested conditionals into early returns.\n- Isolate conditional helper functions.";
      } else {
        clean = "File is in a healthy state.\n- Keep logic modular.\n- Maintain simple branching paths.";
      }
    }

    const lines = clean.replace(/`/g, '').replace(/\*\*/g, '').split("\n");
    const checklist = lines.slice(1).map(l => l.replace(/^[\*\-]\s*/, "").trim()).filter(Boolean);
    if (checklist.length === 0) {
      checklist.push("Review code variables.", "Check import logic.");
    }
    return checklist;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[720px] animate-in fade-in duration-700">
      
      {/* 1. IDE Sidebar: Files catalog list (Width 1/3) */}
      <Card className="lg:w-1/3 flex flex-col h-full bg-surface-1 shadow-subtle ring-1 ring-border-base/50">
        
        {/* IDE Catalog Header */}
        <div className="p-4 border-b border-border-base bg-surface-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-tertiary">Workspace Catalog</span>
            <Badge variant="outline" className="text-[9px] rounded-lg">Git main</Badge>
          </div>
          <div className="relative mb-3">
            <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input 
              type="text" 
              placeholder="Search files by path..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-bg-base border-none rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-subtle transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((f: any) => {
              const segments = f.path.split("/");
              const fileName = segments.pop();
              const folderPath = segments.join("/");
              
              return (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFile(f)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all border ${
                    selectedFile?.id === f.id
                      ? "border-accent/30 bg-accent/8 text-text-primary"
                      : "border-transparent hover:border-border-base hover:bg-surface-2 text-text-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      selectedFile?.id === f.id
                        ? "bg-accent/15 border-accent/30 text-accent"
                        : "bg-surface-3 border-border-strong text-text-tertiary"
                    }`}>
                      <FileCode className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-text-primary block truncate">{fileName}</span>
                      {folderPath && <span className="text-[10px] text-text-tertiary block truncate mt-0.5">{folderPath}</span>}
                    </div>
                  </div>
                  {f.hotspot_score >= 60 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-critical shrink-0 ml-2 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-text-tertiary text-xs">
              No files found matching criteria.
            </div>
          )}
        </div>
      </Card>

      {/* 2. IDE Editor & Metric Split View Pane (Width 2/3) */}
      <Card className="lg:w-2/3 flex flex-col h-full bg-surface-1 shadow-subtle ring-1 ring-border-base/50 overflow-hidden">
        {selectedFile ? (
          <div className="flex flex-col h-full">
            
            {/* Editor Top sticky bar */}
            <div className="px-6 py-4 border-b border-border-base bg-surface-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-mono text-text-secondary overflow-x-auto whitespace-nowrap scrollbar-none">
                <Folder className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                {selectedFile.path.split("/").map((segment: string, i: number, arr: string[]) => (
                  <React.Fragment key={i}>
                    <span className={i === arr.length - 1 ? "text-text-primary font-bold" : ""}>{segment}</span>
                    {i < arr.length - 1 && <CaretRight className="w-3 h-3 text-text-tertiary shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
              
              <Badge variant={selectedFile.hotspot_score >= 60 ? "critical" : "outline"} className="text-[10px] rounded-lg shrink-0">
                Score: {Math.round(selectedFile.hotspot_score)}
              </Badge>
            </div>

            {/* Main pane - scrollable split details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Layout splits: File Metadata and Visual Metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Complexity Card */}
                <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Complexity</span>
                      <p className="text-sm font-display font-black text-text-primary">{Number(selectedFile.complexity).toFixed(2)}</p>
                      <p className="text-[10px] text-text-tertiary font-mono">cyclomatic index</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shrink-0 ml-3">
                      <Hash className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                {/* Churn Card */}
                <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Edits (Churn)</span>
                      <p className="text-sm font-display font-black text-text-primary">{selectedFile.churn}</p>
                      <p className="text-[10px] text-text-tertiary font-mono">commit churn count</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0 ml-3">
                      <GitCommit className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                {/* Primary Author Card */}
                <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Primary Owner</span>
                      <p className="text-sm font-display font-black text-text-primary truncate">{selectedFile.owner.split(" <")[0]}</p>
                      <p className="text-[10px] text-text-tertiary font-mono truncate">{selectedFile.owner.includes("<") ? selectedFile.owner.match(/<(.+)>/)?.[1] ?? "—" : "—"}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0 ml-3">
                      <User className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* IDE Code preview section */}
              <div className="rounded-2xl overflow-hidden shadow-subtle ring-1 ring-border-base/50">
                <div className="h-10 bg-slate-900 px-4 flex items-center justify-between text-xs text-slate-400 font-mono select-none">
                  <span>{selectedFile.path.split("/").pop()} ({selectedFile.path.split(".").pop()})</span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                  </div>
                </div>
                <div className="bg-slate-950 p-5 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto select-all max-h-[360px] overflow-y-auto custom-scrollbar">
                  {selectedFile.content ? (
                    <div className="flex gap-4">
                      {/* Line Numbers */}
                      <div className="text-slate-600 select-none text-right w-8 border-r border-slate-800 pr-2">
                        {selectedFile.content.split("\n").map((_: string, i: number) => (
                          <React.Fragment key={i}>
                            {i + 1}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                      {/* File Content */}
                      <pre className="text-slate-300 whitespace-pre font-mono text-left">
                        {selectedFile.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 italic">
                      No content available for this file.
                    </div>
                  )}
                </div>
              </div>

              {/* AI review recommendations checklist */}
              <div className="pt-6 border-t border-border-base space-y-4">
                <h4 className="font-display font-bold text-text-primary text-xs flex items-center gap-1.5 border-b border-border-subtle pb-2 uppercase tracking-wider">
                  <Sparkle className="w-4 h-4 text-accent animate-pulse-slow" /> AI Code Copilot Suggestions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left checklist */}
                  <div className="bg-surface-2 p-5 rounded-2xl border border-border-base space-y-3">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" /> Refactoring Checklist
                    </h5>
                    <ul className="space-y-2">
                      {parseRefactoringChecklist(selectedFile.ai_summary, selectedFile.hotspot_score, selectedFile.complexity).map((task, index) => (
                        <li key={index} className="text-xs text-text-secondary flex items-start gap-2">
                          <input type="checkbox" className="mt-0.5 rounded text-accent focus:ring-accent" disabled />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right description */}
                  <div className="bg-accent-subtle/50 p-5 rounded-2xl border border-accent/10 space-y-2">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> Recommendation Context
                    </h5>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This module requires active refactoring parameters to simplify dependency trees. Ensure mock tests cover logic configurations properly.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
            <Hash className="w-16 h-16 mb-3 opacity-20" />
            <p className="font-semibold text-sm">Select a file from the explorer</p>
            <p className="text-xs">Explore files, complexities, and AI refactoring advice.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
