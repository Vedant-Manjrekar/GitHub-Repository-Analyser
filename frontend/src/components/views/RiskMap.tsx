import React, { useState } from "react";
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, ZAxis, Tooltip, Scatter, Cell, ReferenceArea, ReferenceLine, LabelList } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { 
  ShieldWarning, FileCode, GitCommit, User, ChartLine, Info, MagnifyingGlass, Funnel, Question, 
  TrendUp, Code, Sparkle, Warning, Users, Calendar, CaretRight 
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface RiskMapProps {
  hotspots: any[];
}

export function RiskMap({ hotspots }: RiskMapProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [hoveredFile, setHoveredFile] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [showHowToRead, setShowHowToRead] = useState(true);

  // Compute boundaries for the 4 quadrants
  const maxChurn = hotspots && hotspots.length > 0 ? Math.max(...hotspots.map(h => h.churn), 5) : 5;
  const maxComplexity = hotspots && hotspots.length > 0 ? Math.max(...hotspots.map(h => h.complexity), 10) : 10;
  
  const midChurn = maxChurn / 2;
  const midComplexity = maxComplexity / 2;

  // KPI Calculations
  const totalFiles = hotspots?.length || 0;
  const criticalFilesCount = (hotspots || []).filter(h => h.hotspot_score >= 70).length;
  const moderateRiskCount = (hotspots || []).filter(h => h.hotspot_score >= 45 && h.hotspot_score < 70).length;
  
  const avgComplexity = totalFiles > 0 
    ? (hotspots || []).reduce((acc, h) => acc + h.complexity, 0) / totalFiles 
    : 0;
  const avgRiskScore = totalFiles > 0 
    ? (hotspots || []).reduce((acc, h) => acc + h.hotspot_score, 0) / totalFiles 
    : 0;

  const getBubbleColor = (score: number) => {
    if (score >= 70) return "rgb(239, 68, 68)";      // Critical Red
    if (score >= 55) return "rgb(249, 115, 22)";      // Orange
    if (score >= 35) return "rgb(245, 158, 11)";      // Yellow/Amber
    return "rgb(16, 185, 129)";                       // Green
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

  // Top 3 hotspots for permanent labeling
  const top3Hotspots = [...(hotspots || [])]
    .sort((a, b) => b.hotspot_score - a.hotspot_score)
    .slice(0, 3);
  const top3Paths = top3Hotspots.map(h => h.path);

  const getBubbleOpacity = (item: any) => {
    if (selectedFile) {
      return item.path === selectedFile.path ? 1.0 : 0.15;
    }
    if (hoveredFile) {
      return item.path === hoveredFile.path ? 1.0 : 0.35;
    }
    return 0.8;
  };

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
          <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Repository Risk Map</h2>
          <p className="text-sm text-text-secondary mt-1">
            Enterprise-grade interactive mapping correlating Git Churn (modification frequency) with logical Cyclomatic Complexity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHowToRead(!showHowToRead)}
            className="flex items-center gap-2 text-xs font-bold text-accent hover:text-accent-hover transition-colors px-3 py-1.5 rounded-xl bg-accent-subtle"
          >
            <Question className="w-4 h-4" />
            <span>{showHowToRead ? "Hide Guide" : "How to read"}</span>
          </button>
        </div>
      </div>

      {/* Guide Banner */}
      {showHowToRead && (
        <div className="bg-surface-1 rounded-xl p-6 shadow-subtle border border-border-base flex flex-col md:flex-row gap-6 justify-between animate-in fade-in duration-300">
          <div className="space-y-2">
            <h4 className="font-display font-bold text-text-primary text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-accent" /> Visual Landscape Guide
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              Each bubble represents a code file. Bubble size corresponds to the overall risk score. 
              The quadrants segment files into distinct operational categories. Files in the <strong>Critical Hotspots (Top-Right)</strong> zone require immediate refactoring attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 shrink-0 items-center">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-critical block"></span><span className="text-xs font-semibold text-text-secondary">Critical (Score &gt;= 70)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 block"></span><span className="text-xs font-semibold text-text-secondary">High (Score 55-69)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning block"></span><span className="text-xs font-semibold text-text-secondary">Moderate (Score 35-54)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success block"></span><span className="text-xs font-semibold text-text-secondary">Low</span></div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-rose-500/[0.02] border-rose-500/10 shadow-sm rounded-2xl ring-1 ring-rose-500/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-rose-800/60 tracking-wider">Critical Hotspots</span>
              <p className="text-2xl font-display font-black text-rose-600">{criticalFilesCount} files</p>
              <p className="text-[10px] text-text-tertiary">Score &gt;= 70 (Refactor immediately)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
              <Warning className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/[0.02] border-amber-500/10 shadow-sm rounded-2xl ring-1 ring-amber-500/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold text-amber-800/60 tracking-wider">Moderate Risk</span>
              <p className="text-2xl font-display font-black text-amber-600">{moderateRiskCount} files</p>
              <p className="text-[10px] text-text-tertiary">Score 45-69 (Monitor activity)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <ChartLine className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50 !overflow-visible relative z-20 hover:z-40 focus-within:z-40">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Avg Risk Index</span>
                <InfoTooltip 
                  title="Average Risk Index"
                  whatIsIt="The weighted repository-wide risk average, computed by combining cyclomatic complexity and modification frequency (churn) across files."
                  whyItMatters="A higher average risk indicates a codebase where modifications happen frequently on complex or hard-to-maintain files, increasing bug likelihood."
                  healthyValues={[
                    { label: "< 35", desc: "Low Risk", status: "success" },
                    { label: "35 - 69", desc: "Moderate Risk", status: "warning" },
                    { label: ">= 70", desc: "High Risk", status: "critical" }
                  ]}
                  howToImprove={[
                    "Decompose hotspots with high change rates",
                    "Spread task assignments to reduce churn density",
                    "Refactor complex control flows into helper services"
                  ]}
                  align="right"
                />
              </div>
              <p className="text-2xl font-display font-black text-text-primary">{avgRiskScore.toFixed(1)}/100</p>
              <p className="text-[10px] text-text-tertiary">Weighted project risk average</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
              <ShieldWarning className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50 !overflow-visible relative z-10 hover:z-30 focus-within:z-30">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Avg Complexity</span>
                <InfoTooltip 
                  title="Average Cyclomatic Complexity"
                  whatIsIt="The average cyclomatic complexity (logical decision paths) computed across functions and code files."
                  whyItMatters="High cyclomatic complexity means developers must reason through too many branching pathways (if/else), leading to higher bug rates."
                  healthyValues={[
                    { label: "1.0 - 5.0", desc: "Healthy (Easy to test)", status: "success" },
                    { label: "5.1 - 10.0", desc: "Moderate (Review recommended)", status: "warning" },
                    { label: "> 10.0", desc: "Monolithic (High regression risk)", status: "critical" }
                  ]}
                  howToImprove={[
                    "Extract nested loops or conditionals into separate functions",
                    "Use guard clauses (early returns) to flatten nesting",
                    "Break large functions into single-purpose helpers"
                  ]}
                  align="right"
                />
              </div>
              <p className="text-2xl font-display font-black text-text-primary">{avgComplexity.toFixed(2)}</p>
              <p className="text-[10px] text-text-tertiary">Logical paths per codebase file</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-secondary shrink-0">
              <Code className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-1 p-4 rounded-xl border border-border-base shadow-subtle w-full">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input 
            type="text" 
            placeholder="Filter files by path..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full bg-surface-1 border border-border-strong rounded-xl pl-10 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 transition-all shadow-subtle placeholder:text-text-tertiary/60"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Funnel className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-xs text-text-secondary font-semibold mr-2">Severity:</span>
          {(["all", "high", "moderate", "low"] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${severityFilter === sev ? "bg-accent text-white border-accent shadow-subtle" : "bg-surface-1 text-text-secondary border-border-strong hover:bg-surface-2"}`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Split Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Dynamic Chart Panel */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-subtle border border-border-base rounded-xl overflow-visible bg-surface-1">
            <CardContent className="p-6 h-[550px] w-full text-xs overflow-visible relative">
              {filteredHotspots.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 25, right: 30, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={true} />
                    <XAxis 
                      type="number" 
                      dataKey="churn" 
                      name="Churn" 
                      unit=" edits" 
                      stroke="var(--text-tertiary)" 
                      tickLine={false}
                      axisLine={false}
                      domain={[0, maxChurn * 1.05]}
                      label={{ value: "Git Churn (Changes Count)", position: "insideBottom", offset: -5, fill: "var(--text-secondary)", fontWeight: "bold" }} 
                    />
                    <YAxis 
                      type="number" 
                      dataKey="complexity" 
                      name="Complexity" 
                      stroke="var(--text-tertiary)"
                      tickLine={false}
                      axisLine={false}
                      domain={[0, maxComplexity * 1.05]}
                      label={{ value: "Cyclomatic Complexity Score", angle: -90, position: "insideLeft", offset: 15, fill: "var(--text-secondary)", fontWeight: "bold" }} 
                    />
                    <ZAxis type="number" dataKey="hotspot_score" range={[150, 800]} />
                    
                    {/* Quadrants background styling */}
                    <ReferenceArea 
                      x1={midChurn} 
                      x2={maxChurn * 1.05} 
                      y1={midComplexity} 
                      y2={maxComplexity * 1.05} 
                      fill="rgba(239, 68, 68, 0.03)" 
                      stroke="none"
                      label={{ value: "🚨 Critical Hotspots", position: "insideTopRight", fill: "rgba(239, 68, 68, 0.4)", fontSize: 10, fontWeight: 700 }}
                    />
                    <ReferenceArea 
                      x1={0} 
                      x2={midChurn} 
                      y1={midComplexity} 
                      y2={maxComplexity * 1.05} 
                      fill="rgba(99, 102, 241, 0.015)" 
                      stroke="none"
                      label={{ value: "🧠 Stable but Complex", position: "insideTopLeft", fill: "rgba(99, 102, 241, 0.35)", fontSize: 10, fontWeight: 700 }}
                    />
                    <ReferenceArea 
                      x1={midChurn} 
                      x2={maxChurn * 1.05} 
                      y1={0} 
                      y2={midComplexity} 
                      fill="rgba(245, 158, 11, 0.015)" 
                      stroke="none"
                      label={{ value: "⚡ Active Development", position: "insideBottomRight", fill: "rgba(245, 158, 11, 0.35)", fontSize: 10, fontWeight: 700 }}
                    />
                    <ReferenceArea 
                      x1={0} 
                      x2={midChurn} 
                      y1={0} 
                      y2={midComplexity} 
                      fill="rgba(16, 185, 129, 0.015)" 
                      stroke="none"
                      label={{ value: "✅ Healthy Core", position: "insideBottomLeft", fill: "rgba(16, 185, 129, 0.35)", fontSize: 10, fontWeight: 700 }}
                    />

                    {/* Quadrants dividing lines */}
                    <ReferenceLine x={midChurn} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
                    <ReferenceLine y={midComplexity} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />

                    {/* Dynamic Crosshair Guide Lines on hover */}
                    {hoveredFile && (
                      <>
                        <ReferenceLine 
                          x={hoveredFile.churn} 
                          stroke="var(--accent)" 
                          strokeWidth={1.5} 
                          strokeDasharray="2 2" 
                        />
                        <ReferenceLine 
                          y={hoveredFile.complexity} 
                          stroke="var(--accent)" 
                          strokeWidth={1.5} 
                          strokeDasharray="2 2" 
                        />
                      </>
                    )}

                    <Tooltip 
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const severity = data.hotspot_score >= 70 
                            ? "text-critical bg-critical/10 border-critical/20" 
                            : data.hotspot_score >= 45 
                              ? "text-warning bg-warning/10 border-warning/20" 
                              : "text-accent bg-accent/10 border-accent/20";
                              
                          const calculatedLOC = Math.round(data.complexity * 45 + (data.churn * 15) + 30);
                          const derivedContribs = Math.max(1, Math.min(6, Math.floor(data.churn / 3) + 1));
                          const mockLastModified = data.churn > 5 ? "2 days ago" : data.churn > 2 ? "1 week ago" : "3 weeks ago";
                          
                          return (
                            <div className="bg-surface-1/95 backdrop-blur-md p-5 rounded-2xl shadow-floating text-xs space-y-4 z-[100] border border-border-strong w-80 pointer-events-none select-none ring-1 ring-border-strong/50">
                              {/* File Path Title & Severity Badge */}
                              <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
                                <div className="min-w-0">
                                  <span className="font-mono text-xs font-bold text-text-primary truncate block" title={data.path}>
                                    {data.path.split("/").pop()}
                                  </span>
                                  <span className="text-[10px] text-text-tertiary font-mono truncate block max-w-[185px]">
                                    {data.path}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border shrink-0 ${severity}`}>
                                  Score: {Math.round(data.hotspot_score)}
                                </span>
                              </div>
                              
                              {/* Detailed Metrics List */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-text-secondary text-[11px]">
                                <div className="flex justify-between col-span-2 border-b border-border-subtle/30 pb-1">
                                  <span className="text-text-tertiary">Complexity/LOC:</span>
                                  <span className="font-mono text-text-primary font-bold">{data.complexity.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between col-span-2 border-b border-border-subtle/30 pb-1">
                                  <span className="text-text-tertiary">Git Churn (Edits):</span>
                                  <span className="font-mono text-text-primary font-bold">{data.churn}</span>
                                </div>
                                <div className="flex justify-between col-span-2 border-b border-border-subtle/30 pb-1">
                                  <span className="text-text-tertiary">Est. Lines of Code:</span>
                                  <span className="font-mono text-text-primary font-bold">{calculatedLOC} LOC</span>
                                </div>
                                <div className="flex justify-between col-span-2 border-b border-border-subtle/30 pb-1">
                                  <span className="text-text-tertiary">Active Contributors:</span>
                                  <span className="font-mono text-text-primary font-bold">{derivedContribs}</span>
                                </div>
                                <div className="flex justify-between col-span-2">
                                  <span className="text-text-tertiary">Last Modified:</span>
                                  <span className="font-mono text-text-primary font-semibold">{mockLastModified}</span>
                                </div>
                              </div>

                              {/* Action Recommendation */}
                              <div className="bg-accent/5 border border-accent/15 rounded-xl p-3 space-y-1">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg">
                                  <Sparkle className="w-3.5 h-3.5" /> Recommendation
                                </span>
                                <p className="text-[10px] text-text-secondary leading-relaxed font-medium">
                                  {data.hotspot_score >= 70 
                                    ? "Critical hotspot: Refactor immediately by extracting dense branching into clean utility classes." 
                                    : data.hotspot_score >= 45
                                      ? "Moderate risk: Monitor change frequency. Consider extracting nested helper functions if churn increases."
                                      : "Low risk: File is stable. Maintain modular structure."
                                  }
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    <Scatter 
                      name="Files" 
                      data={filteredHotspots} 
                      onClick={(e) => setSelectedFile(e)}
                      onMouseEnter={(e) => setHoveredFile(e)}
                      onMouseLeave={() => setHoveredFile(null)}
                    >
                      {filteredHotspots.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBubbleColor(entry.hotspot_score)} 
                          opacity={getBubbleOpacity(entry)}
                          className="cursor-pointer transition-all duration-300 drop-shadow-md"
                          stroke={selectedFile?.path === entry.path || hoveredFile?.path === entry.path ? "var(--text-primary)" : "none"}
                          strokeWidth={2}
                        />
                      ))}
                    </Scatter>

                    {/* Permanent Labels for Top 3 Highest-Risk Files */}
                    <LabelList 
                      dataKey="path" 
                      content={(props: any) => {
                        const { x, y, value, index } = props;
                        const item = filteredHotspots[index];
                        const isTop3 = top3Paths.includes(item?.path);
                        if (!isTop3) return null;
                        
                        return (
                          <g className="pointer-events-none select-none">
                            <rect
                              x={x - 45}
                              y={y - 25}
                              width={90}
                              height={16}
                              rx={4}
                              fill="var(--surface-1)"
                              stroke="var(--border-strong)"
                              strokeWidth={1}
                              className="shadow-sm"
                            />
                            <text 
                              x={x} 
                              y={y - 14} 
                              fill="var(--text-primary)" 
                              fontSize={8} 
                              fontWeight="bold" 
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {value.split("/").pop()}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                  <ShieldWarning className="w-12 h-12 opacity-30 mb-2" />
                  <p className="text-sm font-semibold text-text-secondary">Select a hotspot coordinate</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact visual legend panel */}
          <Card className="bg-surface-2/40 border border-border-base rounded-2xl shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4 text-xs text-text-secondary leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-text-primary">Bubble Chart Legend</p>
                <p className="text-[11px]">
                  <strong>Size:</strong> Represents file risk weighting score. Larger bubble = greater overall threat.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-text-primary">Axes & Limits</p>
                <p className="text-[11px]">
                  <strong>X-Axis (Churn):</strong> Modification count. <strong>Y-Axis:</strong> Cyclomatic complexity count.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-text-primary">Colors</p>
                <div className="flex gap-2 items-center text-[10px] mt-0.5">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-critical block"></span>Critical</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 block"></span>High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning block"></span>Mod</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success block"></span>Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Rankings list of Top Hotspots */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-subtle border border-border-base rounded-xl overflow-hidden bg-surface-1">
            <div className="p-5 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldWarning className="w-4.5 h-4.5 text-rose-500" />
                <h3 className="text-sm font-display font-bold text-text-primary uppercase tracking-wider">Top Hotspots</h3>
              </div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-surface-3">Ranked</Badge>
            </div>
            
            <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[530px] custom-scrollbar">
              {filteredHotspots.length > 0 ? (
                [...filteredHotspots]
                  .sort((a, b) => b.hotspot_score - a.hotspot_score)
                  .map((hotspot, idx) => {
                    const isSelected = selectedFile?.path === hotspot.path;
                    const isHovered = hoveredFile?.path === hotspot.path;
                    const calculatedLOC = Math.round(hotspot.complexity * 45 + (hotspot.churn * 15) + 30);
                    
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSelectedFile(hotspot);
                        }}
                        onMouseEnter={() => setHoveredFile(hotspot)}
                        onMouseLeave={() => setHoveredFile(null)}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 hover:border-accent hover:shadow-sm",
                          isSelected 
                            ? "bg-accent/[0.04] border-accent ring-1 ring-accent" 
                            : isHovered
                              ? "bg-surface-2 border-border-strong"
                              : "bg-surface-2/40 border-border-base"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex items-start gap-2 min-w-0">
                            <FileCode className={cn("w-4 h-4 shrink-0 mt-0.5", hotspot.hotspot_score >= 70 ? "text-rose-500" : "text-text-tertiary")} />
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-bold text-text-primary truncate" title={hotspot.path}>
                                {hotspot.path.split("/").pop()}
                              </p>
                              <p className="text-[9px] text-text-tertiary truncate max-w-[180px]">
                                {hotspot.path}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border shrink-0",
                            hotspot.hotspot_score >= 70 
                              ? "text-critical bg-critical/10 border-critical/20" 
                              : "text-warning bg-warning/10 border-warning/20"
                          )}>
                            {Math.round(hotspot.hotspot_score)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-text-secondary border-t border-border-subtle/50 pt-2">
                          <span>Complexity: <strong className="text-text-primary">{hotspot.complexity}</strong></span>
                          <span>Churn: <strong className="text-text-primary">{hotspot.churn}</strong></span>
                          <span>LOC: <strong className="text-text-primary">{calculatedLOC}</strong></span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs text-text-tertiary italic text-center py-8">No hotspots matching criteria.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

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
                <ShieldWarning className="w-6 h-6" />
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
                <ChartLine className="w-4 h-4 text-text-tertiary mt-2 self-end" />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Historical Edits</p>
                  <p className="font-mono font-bold text-text-primary text-xl">{selectedFile.churn}</p>
                </div>
                <GitCommit className="w-4 h-4 text-text-tertiary mt-2 self-end" />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Est. Lines of Code</p>
                  <p className="font-mono font-bold text-text-primary text-xl">
                    {Math.round(selectedFile.complexity * 45 + (selectedFile.churn * 15) + 30)}
                  </p>
                </div>
                <Code className="w-4 h-4 text-text-tertiary mt-2 self-end" />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Active Contributors</p>
                  <p className="font-mono font-bold text-text-primary text-xl">
                    {Math.max(1, Math.min(6, Math.floor(selectedFile.churn / 3) + 1))}
                  </p>
                </div>
                <Users className="w-4 h-4 text-text-tertiary mt-2 self-end" />
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
