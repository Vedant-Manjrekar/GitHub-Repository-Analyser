import React, { useState } from "react";
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, ZAxis, Tooltip, Scatter, Cell, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ShieldAlert, FileCode, GitCommit, User, Activity, Info, Search, Filter, HelpCircle } from "lucide-react";

interface RiskMapProps {
  hotspots: any[];
}

export function RiskMap({ hotspots }: RiskMapProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [showHowToRead, setShowHowToRead] = useState(true);

  const getFill = (score: number) => {
    if (score >= 70) return "var(--color-critical)";
    if (score >= 45) return "var(--color-warning)";
    return "var(--color-accent)";
  };

  const getSeverityLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 45) return "Moderate Risk";
    return "Low Risk";
  };

  // Filter hotspots based on search and severity filters
  const filteredHotspots = (hotspots || []).filter(h => {
    const matchesSearch = h.path.toLowerCase().includes(searchFilter.toLowerCase());
    const severity = h.hotspot_score >= 70 ? "high" : h.hotspot_score >= 45 ? "moderate" : "low";
    const matchesSeverity = severityFilter === "all" || severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const renderAISuggestion = (suggestion: string, score: number, complexity: number) => {
    let clean = suggestion;
    if (!clean) {
      if (score >= 65) {
        clean = "Major Regression Risk Detected.\n- This file is modified constantly and exhibits high structural complexity.\n- Extract massive logic blocks into smaller, isolated domain services.\n- Ensure robust unit test coverage before touching existing legacy branches.";
      } else if (complexity > 8.0) {
        clean = "High Complexity Warning.\n- The logic within this file has too many branching paths (if/else chains).\n- Refactor nested conditionals into early returns or separate helper functions.";
      } else {
        clean = "File is in a healthy state.\n- Complexity is manageable and churn is within normal limits.\n- Continue maintaining clean boundaries when making edits.";
      }
    }
    
    const parts = clean.replace(/`/g, '').replace(/\*\*/g, '').split("\n");
    const heading = parts[0];
    const bullets = parts.slice(1).map(p => p.replace(/^[\*\-]\s/, "").trim()).filter(Boolean);

    return (
      <div className="space-y-3">
        <p className={`text-sm leading-relaxed font-bold ${score >= 65 ? 'text-critical' : complexity > 8.0 ? 'text-warning' : 'text-success'}`}>
          {heading}
        </p>
        <ul className="text-xs text-text-secondary space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-border-strong mt-0.5">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header section with description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Risk Landscape Map</h2>
          <p className="text-sm text-text-secondary mt-1">
            Analyzing correlation between file modification frequency (Churn) and structural logical branches (Complexity).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHowToRead(!showHowToRead)}
            className="flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-hover transition-colors px-3 py-1.5 rounded-xl bg-accent-subtle"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showHowToRead ? "Hide Guide" : "How to read"}</span>
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      {showHowToRead && (
        <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle ring-1 ring-border-base flex flex-col md:flex-row gap-6 justify-between animate-in fade-in duration-300">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-text-primary text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" /> Visual Landscape Guide
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              Each point represents a code file. The horizontal position indicates how often it changes. 
              The vertical position indicates its logical complexity. Files in the <strong>upper-right corner (Red zone)</strong> are edited frequently and are very complex—representing your highest refactoring priority.
            </p>
          </div>
          <div className="flex gap-4 shrink-0 items-center">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-critical block"></span><span className="text-xs font-semibold text-text-secondary">High Risk (Score &gt; 70)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning block"></span><span className="text-xs font-semibold text-text-secondary">Moderate (Score 45-69)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent block"></span><span className="text-xs font-semibold text-text-secondary">Low Risk</span></div>
          </div>
        </div>
      )}

      {/* Filters & Control Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-1 p-4 rounded-3xl shadow-subtle ring-1 ring-border-base/50">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input 
            type="text" 
            placeholder="Filter files by path..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full bg-bg-base border-none rounded-2xl pl-10 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-subtle transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs text-text-secondary font-semibold mr-2">Severity:</span>
          {(["all", "high", "moderate", "low"] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${severityFilter === sev ? "bg-accent text-white shadow-subtle" : "bg-bg-base text-text-secondary hover:bg-surface-2"}`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scatter Plot Card - Occupies entire width */}
      <Card className="shadow-subtle ring-1 ring-border-base/50">
        <CardContent className="p-6 h-[550px] w-full text-xs">
          {filteredHotspots.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={false} />
                <XAxis 
                  type="number" 
                  dataKey="churn" 
                  name="Churn" 
                  unit=" edits" 
                  stroke="var(--text-tertiary)" 
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Git Churn (Changes Count)", position: "insideBottom", offset: -5, fill: "var(--text-secondary)", fontWeight: "bold" }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="complexity" 
                  name="Complexity" 
                  stroke="var(--text-tertiary)"
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Cyclomatic Complexity Score", angle: -90, position: "insideLeft", offset: 15, fill: "var(--text-secondary)", fontWeight: "bold" }} 
                />
                <ZAxis type="number" dataKey="hotspot_score" range={[150, 600]} />
                <Tooltip 
                  cursor={{ strokeDasharray: "3 3", stroke: "var(--border-strong)" }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-surface-1 p-4 rounded-2xl shadow-floating text-xs space-y-3 z-50 ring-1 ring-border-base">
                          <p className="font-bold text-text-primary border-b border-border-base pb-2 truncate max-w-[260px]">
                            {data.path.split("/").pop()}
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
                            <span>Risk Score:</span>
                            <span className="font-mono text-text-primary font-bold">{Math.round(data.hotspot_score)}</span>
                            <span>Edits:</span>
                            <span className="font-mono text-text-primary font-bold">{data.churn}</span>
                            <span>Complexity:</span>
                            <span className="font-mono text-text-primary font-bold">{data.complexity}</span>
                          </div>
                          <p className="text-[10px] text-accent font-bold pt-1 border-t border-border-base">Click point to view suggestions</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Files" data={filteredHotspots} onClick={(e) => setSelectedFile(e)}>
                  {filteredHotspots.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getFill(entry.hotspot_score)} 
                      className="cursor-pointer hover:opacity-80 transition-opacity drop-shadow-md"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
              <ShieldAlert className="w-12 h-12 opacity-30 mb-2" />
              <p className="font-semibold text-sm">No hotspots found matching criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side drawer for deep-dive file metrics */}
      <Drawer 
        isOpen={!!selectedFile} 
        onClose={() => setSelectedFile(null)} 
        title={selectedFile ? selectedFile.path.split("/").pop() : "File Details"}
        width="lg"
      >
        {selectedFile && (
          <div className="space-y-6">
            
            <div className="bg-surface-2 rounded-2xl p-5 border border-border-base flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedFile.hotspot_score >= 70 ? 'bg-critical/10 text-critical border border-critical/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-text-tertiary">Refactor Risk Priority</p>
                <h3 className="text-2xl font-bold font-display text-text-primary">
                  {Math.round(selectedFile.hotspot_score)}<span className="text-sm font-normal text-text-tertiary">/100 • {getSeverityLabel(selectedFile.hotspot_score)}</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Complexity Score</p>
                  <p className="font-mono font-bold text-text-primary text-xl">{selectedFile.complexity}</p>
                </div>
                <Activity className="w-4 h-4 text-text-tertiary mt-2 self-end" />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Historical Edits</p>
                  <p className="font-mono font-bold text-text-primary text-xl">{selectedFile.churn}</p>
                </div>
                <GitCommit className="w-4 h-4 text-text-tertiary mt-2 self-end" />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary">Primary Owner</p>
                  <p className="font-semibold text-text-primary text-sm mt-0.5">{selectedFile.owner.split(" <")[0]}</p>
                </div>
                <User className="w-5 h-5 text-text-tertiary" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-text-tertiary">Path</h4>
              <p className="text-xs font-mono p-3 bg-surface-2 rounded-xl text-text-secondary break-all">
                {selectedFile.path}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border-base">
              <h4 className="text-sm font-semibold font-display text-text-primary">AI Actionable Recommendations</h4>
              <div className="p-5 bg-surface-2 border border-border-base rounded-2xl">
                {renderAISuggestion(selectedFile.ai_summary, selectedFile.hotspot_score, selectedFile.complexity)}
              </div>
            </div>

          </div>
        )}
      </Drawer>
    </div>
  );
}
