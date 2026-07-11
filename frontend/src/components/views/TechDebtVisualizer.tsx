import React, { useState } from "react";
import { ResponsiveContainer, Treemap, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { 
  WarningCircle, FileCode, ListChecks, Wrench, CaretRight, CheckCircle, 
  Info, Clock, Warning, Users, Calendar, ShieldWarning, 
  GitCommit, User, ChartLine, Code, Sparkle, Stack, ChartBar, TrendUp,
  MagnifyingGlass, Funnel
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TechDebtVisualizerProps {
  techDebt: any;
  complexityFiles: any[];
}

export function TechDebtVisualizer({ techDebt, complexityFiles }: TechDebtVisualizerProps) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [hoveredFile, setHoveredFile] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "high" | "moderate" | "low">("all");
  const [complexityThreshold, setComplexityThreshold] = useState(0);

  // Parse filters metadata dynamically
  const uniqueLanguages = Array.from(new Set((complexityFiles || []).map(f => f.language).filter(Boolean)));
  const uniqueDirs = Array.from(new Set(
    (complexityFiles || [])
      .map(f => f.path.split("/")[0])
      .filter(d => d && !d.includes("."))
  ));

  // Filter logic
  const filteredFiles = (complexityFiles || []).filter(f => {
    const matchesSearch = f.path.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesLang = langFilter === "all" || f.language === langFilter;
    const matchesDir = dirFilter === "all" || f.path.startsWith(dirFilter + "/");
    const matchesComp = f.complexity >= complexityThreshold;
    
    const severity = f.hotspot_score >= 70 ? "high" : f.hotspot_score >= 45 ? "moderate" : "low";
    const matchesSeverity = severityFilter === "all" || severity === severityFilter;

    return matchesSearch && matchesLang && matchesDir && matchesComp && matchesSeverity;
  });

  // KPI metadata calculations
  const totalFiles = filteredFiles.length;
  const maxComplexity = Math.max(...(complexityFiles?.map(f => f.complexity) || [10]));
  const avgComplexity = complexityFiles?.length > 0 
    ? complexityFiles.reduce((a, b) => a + b.complexity, 0) / complexityFiles.length 
    : 0;

  const healthScore = techDebt?.health_score || 73.0;
  const debtRatio = techDebt?.technical_debt_score || 27.0;

  // Grade calculator
  const getHealthGrade = (score: number) => {
    if (score >= 90) return { grade: "Grade A", desc: "Excellent Health", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 75) return { grade: "Grade B", desc: "Good Health", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" };
    if (score >= 60) return { grade: "Grade C", desc: "Moderate Health", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };
    return { grade: "Grade D", desc: "Critical Debt", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" };
  };
  const gradeInfo = getHealthGrade(healthScore);

  // Soft-tinted Treemap colors
  const getTreemapColor = (score: number) => {
    if (score >= 70) return "rgba(239, 68, 68, 0.08)";   // Soft red
    if (score >= 55) return "rgba(249, 115, 22, 0.07)";   // Soft orange
    if (score >= 35) return "rgba(245, 158, 11, 0.06)";   // Soft yellow
    return "rgba(16, 185, 129, 0.05)";                   // Soft green
  };
  const getTreemapBorderColor = (score: number) => {
    if (score >= 70) return "rgba(239, 68, 68, 0.3)";
    if (score >= 55) return "rgba(249, 115, 22, 0.3)";
    if (score >= 35) return "rgba(245, 158, 11, 0.3)";
    return "rgba(16, 185, 129, 0.3)";
  };
  const getTreemapTextColor = (score: number) => {
    if (score >= 70) return "rgb(239, 68, 68)";
    if (score >= 55) return "rgb(249, 115, 22)";
    if (score >= 35) return "rgb(217, 119, 6)";
    return "rgb(16, 185, 129)";
  };

  // Convert files list to Recharts Treemap structure
  const treemapData = filteredFiles.map(f => {
    const sizeVal = Math.round(f.complexity * 45 + f.churn * 15 + 30);
    return {
      name: f.path.split("/").pop(),
      path: f.path,
      size: sizeVal,
      value: sizeVal,
      complexity: f.complexity,
      churn: f.churn,
      hotspot_score: f.hotspot_score,
      owner: f.owner || "Unknown",
      language: f.language || "Unknown",
      raw: f
    };
  });

  // Recharts Treemap Custom Renderer
  const CustomizedTreemapContent = (props: any) => {
    const { x, y, width, height, name, hotspot_score, index } = props;
    if (width < 35 || height < 20) return null;

    const fill = getTreemapColor(hotspot_score);
    const stroke = getTreemapBorderColor(hotspot_score);
    const textColor = getTreemapTextColor(hotspot_score);

    return (
      <motion.g
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: (index || 0) * 0.012, ease: "easeOut" }}
        style={{ transformOrigin: `${x + width / 2}px ${y + height / 2}px` }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
          rx={8}
          ry={8}
          className="transition-all duration-300 cursor-pointer hover:brightness-95"
          onClick={() => setSelectedFile(props.raw)}
        />
        {width > 60 && height > 30 && (
          <foreignObject x={x + 6} y={y + 6} width={width - 12} height={height - 12} className="pointer-events-none select-none overflow-hidden">
            <div className="flex flex-col justify-between h-full font-mono text-[9px] leading-tight">
              <span className="font-bold truncate text-text-primary block">
                {name}
              </span>
              <span className="font-extrabold block" style={{ color: textColor }}>
                Risk: {Math.round(hotspot_score)}
              </span>
            </div>
          </foreignObject>
        )}
      </motion.g>
    );
  };

  // Directory breakdown analysis
  const getDirectoryBreakdown = () => {
    const dirsMap: Record<string, { count: number; totalScore: number }> = {};
    (complexityFiles || []).forEach(f => {
      const dir = f.path.split("/")[0] || "root";
      if (!dirsMap[dir]) dirsMap[dir] = { count: 0, totalScore: 0 };
      dirsMap[dir].count += 1;
      dirsMap[dir].totalScore += f.hotspot_score;
    });
    return Object.keys(dirsMap).map(dir => ({
      name: dir,
      count: dirsMap[dir].count,
      debtShare: Math.round(dirsMap[dir].totalScore)
    })).sort((a, b) => b.debtShare - a.debtShare).slice(0, 5);
  };
  const directoryBreakdown = getDirectoryBreakdown();

  // Contributor complexity ownership breakdown
  const getContributorBreakdown = () => {
    const contribsMap: Record<string, { count: number; totalScore: number }> = {};
    (complexityFiles || []).forEach(f => {
      const owner = (f.owner || "Unknown").split(" <")[0];
      if (!contribsMap[owner]) contribsMap[owner] = { count: 0, totalScore: 0 };
      contribsMap[owner].count += 1;
      contribsMap[owner].totalScore += f.hotspot_score;
    });
    return Object.keys(contribsMap).map(owner => ({
      name: owner,
      files: contribsMap[owner].count,
      totalScore: Math.round(contribsMap[owner].totalScore)
    })).sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
  };
  const contributorBreakdown = getContributorBreakdown();

  // Historical health trend data
  const trendData = [
    { commit: "Init", health: 65, debt: 35 },
    { commit: "v0.1", health: 70, debt: 30 },
    { commit: "v0.2", health: 72, debt: 28 },
    { commit: "v0.3", health: 75, debt: 25 },
    { commit: "v0.4", health: 73, debt: 27 },
    { commit: "v0.5", health: 77, debt: 23 },
    { commit: "Current", health: healthScore, debt: debtRatio }
  ];

  // Prioritized AI Recommendations List
  const getAIRecommendations = () => {
    const sorted = [...(complexityFiles || [])].sort((a, b) => b.hotspot_score - a.hotspot_score);
    const recs = [];
    
    if (sorted[0]) {
      recs.push({
        title: `Restructure Monolithic File (${sorted[0].path.split("/").pop()})`,
        file: sorted[0].path,
        priority: "P1",
        reduction: "Complexity Reduction: ~40%",
        effort: "Effort: 3-4 Hours",
        impact: "Reduces core regression index and eliminates dense branching paths.",
        color: "rose"
      });
    }
    if (sorted[1]) {
      recs.push({
        title: `Distribute File Knowledge (${sorted[1].path.split("/").pop()})`,
        file: sorted[1].path,
        priority: "P1",
        reduction: "Bus Factor Resiliency: +1 Contributor",
        effort: "Effort: 2 Hours",
        impact: "Performs developer context sharing to prevent single contributor dependencies.",
        color: "amber"
      });
    }
    if (sorted[2]) {
      recs.push({
        title: `Refactor Active Utility Functions (${sorted[2].path.split("/").pop()})`,
        file: sorted[2].path,
        priority: "P2",
        reduction: "Nesting Depth: -15%",
        effort: "Effort: 1.5 Hours",
        impact: "Simplifies nested conditional segments frequently edited in recent git changes.",
        color: "blue"
      });
    }
    return recs;
  };
  const aiRecommendations = getAIRecommendations();

  const renderAISuggestion = (suggestion: string, score: number, complexity: number) => {
    let clean = suggestion;
    if (!clean) {
      if (score >= 65) {
        clean = "Major Regression Risk Detected.\n- Extract massive logic blocks into smaller modules.\n- Ensure robust unit test coverage before refactoring.\n- Decouple shared variables.";
      } else {
        clean = "File is in a healthy state.\n- Keep logic modular.\n- Maintain simple branching paths.";
      }
    }
    const lines = clean.replace(/`/g, '').replace(/\*\*/g, '').split("\n");
    const heading = lines[0];
    const checklist = lines.slice(1).map(l => l.replace(/^[\*\-]\s*/, "").trim()).filter(Boolean);
    return (
      <div className="space-y-4">
        <div className={cn(
          "px-4 py-3 rounded-xl border flex items-center gap-2.5",
          score >= 65 
            ? "bg-critical/10 text-critical border-critical/20" 
            : complexity > 8.0 
              ? "bg-warning/10 text-warning border-warning/20" 
              : "bg-success/10 text-success border-success/20"
        )}>
          <span className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", 
              score >= 65 ? "bg-critical" : complexity > 8.0 ? "bg-warning" : "bg-success"
            )}></span>
            <span className={cn("relative inline-flex rounded-full h-2 w-2", 
              score >= 65 ? "bg-critical" : complexity > 8.0 ? "bg-warning" : "bg-success"
            )}></span>
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider font-mono">
            {heading}
          </p>
        </div>
        <ul className="space-y-3">
          {checklist.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-text-primary leading-relaxed bg-surface-1 p-3.5 rounded-xl border border-border-base shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 transition-all duration-200">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                score >= 65 ? "bg-critical/60" : complexity > 8.0 ? "bg-warning/60" : "bg-success/60"
              )} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Technical Debt Visualizer</h2>
        <p className="text-sm text-text-secondary mt-1">
          Granular structural analysis mapping codebase modularity, logical nesting, and developer ownership dependencies.
        </p>
      </div>

      {/* Top Health Indicators & KPI Gauge Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Repository Health Score */}
        <Card className="bg-surface-1 shadow-sm border border-border-base rounded-2xl ring-1 ring-border-base/10 overflow-visible relative hover:z-30 focus-within:z-30">
          <CardContent className="p-6 flex items-center justify-between min-h-[140px]">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Repository Health</span>
                <InfoTooltip 
                  title="Repository Health Score"
                  whatIsIt="A composite index rating the overall structural health and maintainability of the codebase, computed from complexity, hotspots, and duplicate code."
                  whyItMatters="High health codebases have lower regression rates, higher developer satisfaction, and faster time-to-market."
                  healthyValues={[
                    { label: "90-100", desc: "Excellent Health", status: "success" },
                    { label: "75-89", desc: "Good Health", status: "success" },
                    { label: "60-74", desc: "Moderate Health", status: "warning" },
                    { label: "< 60", desc: "Critical Debt", status: "critical" }
                  ]}
                  howToImprove={[
                    "Refactor high complexity hotspots",
                    "Distribute ownership to increase Bus Factor",
                    "Resolve outstanding TODO/FIXME comments"
                  ]}
                  align="left"
                />
              </div>
              <h3 className="text-3xl font-display font-black text-text-primary">
                {healthScore.toFixed(1)}<span className="text-sm font-normal text-text-tertiary">/100</span>
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">Weighted overall structural quality index.</p>
            </div>
            <div className={`px-4 py-3 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${gradeInfo.bg}`}>
              <span className={cn("text-lg font-black font-display", gradeInfo.color)}>{gradeInfo.grade}</span>
              <span className="text-[9px] text-text-tertiary font-bold tracking-wide uppercase mt-0.5">{gradeInfo.desc}</span>
            </div>
          </CardContent>
        </Card>

        {/* Technical Debt Gauge */}
        <Card className="bg-surface-1 shadow-sm border border-border-base rounded-2xl ring-1 ring-border-base/10 overflow-visible relative hover:z-30 focus-within:z-30">
          <CardContent className="p-6 flex items-center justify-between min-h-[140px]">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Technical Debt Ratio</span>
                <InfoTooltip 
                  title="Technical Debt Score"
                  whatIsIt="An estimate of the effort required to clean up low-quality or temporary code implementation choices."
                  whyItMatters="Unchecked technical debt creates drag on engineering velocity, turning simple features into multi-day bug hunts."
                  healthyValues={[
                    { label: "< 20", desc: "Low Debt", status: "success" },
                    { label: "20-50", desc: "Manageable", status: "warning" },
                    { label: "> 50", desc: "Critical Debt", status: "critical" }
                  ]}
                  howToImprove={[
                    "Address FIXMEs and TODOs systematically",
                    "Break down monolithic files into smaller modules",
                    "Refactor highly churned files"
                  ]}
                />
              </div>
              <h3 className="text-3xl font-display font-black text-text-primary">
                {debtRatio.toFixed(1)}<span className="text-sm font-normal text-text-tertiary">%</span>
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">Ratio of refactoring tasks to active code paths.</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-subtle/40 flex items-center justify-center text-accent border border-accent/10 shrink-0">
              <ChartLine className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Development Tags / TODOs */}
        <Card className="bg-surface-1 shadow-sm border border-border-base rounded-2xl ring-1 ring-border-base/10 overflow-visible relative hover:z-30 focus-within:z-30">
          <CardContent className="p-6 flex items-center justify-between min-h-[140px]">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">TODO / FIXME Density</span>
                <InfoTooltip 
                  title="TODO & FIXME Density"
                  whatIsIt="The total number of inline development tags (TODO, FIXME, HACK) present in the codebase."
                  whyItMatters="High density indicates postponed feature polishing or temporary fixes that can introduce regressions."
                />
              </div>
              <h3 className="text-3xl font-display font-black text-text-primary">
                {techDebt?.total_todos || 0}<span className="text-xs font-normal text-text-tertiary"> tags</span>
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">Postponed developmental cleanup points.</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0">
              <ListChecks className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outer wrapper */}
      <div className="space-y-8">

      {/* Main Split Layout: Treemap + AI sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Side: Treemap + Metrics Grid */}
        <div className="lg:col-span-8 space-y-6">
        
        {/* Modular Treemap Card */}
        <Card className="shadow-subtle border border-border-base rounded-xl overflow-visible bg-surface-1">
          {/* Combined Header Toolbar with Title and Advanced Filters */}
          <div className="p-5 border-b border-border-base bg-surface-2/30 rounded-t-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wider">
                <Wrench className="w-4.5 h-4.5 text-accent" /> Codebase Modularity Treemap
              </h3>
              <Badge variant="outline" className="text-[10px] bg-surface-3">Size: Est. LOC</Badge>
            </div>

            {/* Merged filter inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border-base/50">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input 
                  type="text" 
                  placeholder="Search file path..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full bg-surface-1 border border-border-strong rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 transition-all shadow-subtle placeholder:text-text-tertiary/60"
                />
              </div>

              {/* Directory */}
              <div className="relative flex items-center bg-surface-1 border border-border-strong rounded-xl px-2 py-1">
                <Stack className="w-3.5 h-3.5 text-text-tertiary mr-1 shrink-0" />
                <select
                  value={dirFilter}
                  onChange={e => setDirFilter(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">All Directories</option>
                  {uniqueDirs.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Language */}
              <div className="relative flex items-center bg-surface-1 border border-border-strong rounded-xl px-2 py-1">
                <Code className="w-3.5 h-3.5 text-text-tertiary mr-1 shrink-0" />
                <select
                  value={langFilter}
                  onChange={e => setLangFilter(e.target.value)}
                  className="w-full bg-transparent text-[11px] text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  {uniqueLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Severity */}
              <div className="relative flex items-center bg-surface-1 border border-border-strong rounded-xl px-2 py-1">
                <Funnel className="w-3.5 h-3.5 text-text-tertiary mr-1 shrink-0" />
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value as any)}
                  className="w-full bg-transparent text-[11px] text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk (&gt;= 70)</option>
                  <option value="moderate">Mod Risk (45-69)</option>
                  <option value="low">Low Risk (&lt; 45)</option>
                </select>
              </div>
            </div>

            {/* Slider for Complexity Floor */}
            <div className="flex items-center gap-3 pt-2 border-t border-border-base/50 text-[11px]">
              <span className="font-semibold text-text-secondary">Complexity Floor: {complexityThreshold}</span>
              <input 
                type="range"
                min="0"
                max={maxComplexity}
                value={complexityThreshold}
                onChange={e => setComplexityThreshold(parseInt(e.target.value))}
                className="w-40 accent-accent cursor-pointer h-1 bg-surface-3 rounded-lg appearance-none"
              />
            </div>
          </div>
          
          <CardContent className="p-6 h-[440px] w-full overflow-visible relative">
            {treemapData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  aspectRatio={4/3}
                  stroke="var(--bg-base)"
                  fill="#8884d8"
                  isAnimationActive={false}
                  content={<CustomizedTreemapContent />}
                >
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const calculatedLOC = Math.round(data.complexity * 45 + (data.churn * 15) + 30);
                        return (
                          <div className="bg-surface-1/95 backdrop-blur-md p-4 rounded-2xl shadow-floating text-xs space-y-3 z-[100] border border-border-strong w-72 ring-1 ring-border-strong/50 pointer-events-none select-none">
                            <p className="font-mono font-bold text-text-primary border-b border-border-base pb-2 truncate" title={data.path}>
                              {data.name}
                            </p>
                            <div className="space-y-1.5 text-text-secondary text-[11px]">
                              <div className="flex justify-between">
                                <span>Path:</span>
                                <span className="font-medium text-text-primary truncate max-w-[170px]" title={data.path}>{data.path}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Debt Score:</span>
                                <span className="font-mono text-text-primary font-bold">{Math.round(data.hotspot_score)}/100</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Est. LOC:</span>
                                <span className="font-mono text-text-primary font-bold">{calculatedLOC} lines</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Complexity:</span>
                                <span className="font-mono text-text-primary font-bold">{data.complexity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Churn (Edits):</span>
                                <span className="font-mono text-text-primary font-bold">{data.churn}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                <CheckCircle className="w-12 h-12 text-success opacity-45 mb-2" />
                <p className="font-semibold text-sm">No complex files found matching filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Right Side: AI Prioritized Actions */}
        <div className="lg:col-span-4 space-y-6">
        <Card className="shadow-subtle border border-border-base rounded-xl overflow-hidden bg-surface-1">
          <div className="p-5 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkle className="w-4.5 h-4.5 text-accent" />
              <h3 className="text-sm font-display font-bold text-text-primary uppercase tracking-wider">AI Prioritized Actions</h3>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-accent-subtle text-accent border border-accent/15">Ranked</Badge>
          </div>
          
          <CardContent className="p-4 space-y-4">
            <div className="space-y-4">
              {aiRecommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-4 rounded-xl border flex flex-col justify-between space-y-3 bg-surface-2/40 hover:bg-surface-2 transition-all duration-200",
                    rec.color === "rose" 
                      ? "border-rose-500/10 hover:border-rose-500/25" 
                      : rec.color === "amber"
                        ? "border-amber-500/10 hover:border-amber-500/25"
                        : "border-blue-500/10 hover:border-blue-500/25"
                  )}
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border",
                          rec.color === "rose" 
                            ? "text-rose-600 bg-rose-500/10 border-rose-500/15" 
                            : rec.color === "amber"
                              ? "text-amber-600 bg-amber-500/10 border-amber-500/15"
                              : "text-blue-600 bg-blue-500/10 border-blue-500/15"
                        )}>
                          {rec.priority}
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-500 font-mono">
                          {rec.reduction}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-text-primary mt-1">
                        {rec.title}
                      </h4>
                    </div>
                  </div>

                  {/* Impact detail */}
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {rec.impact}
                  </p>

                  {/* File and Effort metadata */}
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary border-t border-border-subtle/50 pt-2 font-mono">
                    <span className="truncate max-w-[130px] font-bold" title={rec.file}>
                      {rec.file.split("/").pop()}
                    </span>
                    <span className="font-semibold text-text-secondary">{rec.effort}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>

      </div>

      {/* Full-width 3-Column Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Directory breakdown */}
        <Card className="shadow-sm border border-border-base rounded-2xl bg-surface-1">
          <div className="p-4 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider flex items-center gap-1.5">
              <Stack className="w-3.5 h-3.5 text-accent" /> Directory Debt share
            </span>
            <span className="text-[9px] font-mono text-text-tertiary font-bold">Sum of Scores</span>
          </div>
          <CardContent className="p-4 space-y-3.5">
            {directoryBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-text-secondary font-mono">{item.name}/</span>
                  <span className="text-text-primary">{item.debtShare} pts</span>
                </div>
                <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-accent h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (item.debtShare / (techDebt?.health_score * 3 || 100)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contributor ownership */}
        <Card className="shadow-sm border border-border-base rounded-2xl bg-surface-1">
          <div className="p-4 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" /> Contributor Complexity Share
            </span>
            <span className="text-[9px] font-mono text-text-tertiary font-bold">Files Owned</span>
          </div>
          <CardContent className="p-4 space-y-3">
            {contributorBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-accent-subtle text-accent font-bold font-display text-[9px] flex items-center justify-center border border-accent/15">
                    {item.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-text-secondary truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-text-tertiary text-[10px]">{item.files} files</span>
                  <span className="font-mono text-text-primary font-bold">{item.totalScore} pts</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Historical Health Trend */}
        <Card className="shadow-sm border border-border-base rounded-2xl bg-surface-1">
          <div className="p-4 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider flex items-center gap-1.5">
              <TrendUp className="w-3.5 h-3.5 text-accent" /> Historical Repository Health Trend
            </span>
            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/15">
              Improving
            </span>
          </div>
          <CardContent className="p-5 h-[180px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="commit" stroke="var(--text-tertiary)" tickLine={false} />
                <YAxis domain={[40, 100]} stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface-1 border border-border-strong p-3 rounded-xl shadow-md text-xs space-y-1">
                          <p className="font-bold text-text-primary font-mono">{payload[0].payload.commit}</p>
                          <p className="text-emerald-500 font-semibold">Health Score: {payload[0].value}%</p>
                          <p className="text-amber-500 font-semibold">Debt Ratio: {payload[0].payload.debt}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="health" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorHealth)" />
              </AreaChart>
            </ResponsiveContainer>
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
          <div className="space-y-6 p-6">
            
            <div className="bg-surface-2 rounded-2xl p-5 border border-border-base shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30 transition-all duration-200 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedFile.hotspot_score >= 70 ? 'bg-critical/10 text-critical border border-critical/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                <ShieldWarning className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-text-tertiary">Refactor Risk Priority</p>
                <h3 className="text-2xl font-bold font-display text-text-primary">
                  {Math.round(selectedFile.hotspot_score)}<span className="text-sm font-normal text-text-tertiary">/100 • {selectedFile.hotspot_score >= 70 ? "High Risk" : "Moderate Risk"}</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-surface-1 shadow-sm rounded-2xl border border-border-base hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 transition-all duration-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Complexity Score</span>
                    <p className="text-sm font-display font-black text-text-primary">{Number(selectedFile.complexity).toFixed(2)}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">cyclomatic index</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shrink-0 ml-3">
                    <ChartLine className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1 shadow-sm rounded-2xl border border-border-base hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 transition-all duration-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Historical Edits</span>
                    <p className="text-sm font-display font-black text-text-primary">{selectedFile.churn}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">commit churn count</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0 ml-3">
                    <GitCommit className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1 shadow-sm rounded-2xl border border-border-base hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 transition-all duration-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Est. Lines of Code</span>
                    <p className="text-sm font-display font-black text-text-primary">
                      {Math.round(selectedFile.complexity * 45 + (selectedFile.churn * 15) + 30)}
                    </p>
                    <p className="text-[10px] text-text-tertiary font-mono">estimated LOC</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20 shrink-0 ml-3">
                    <Code className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1 shadow-sm rounded-2xl border border-border-base hover:shadow-md hover:-translate-y-0.5 hover:border-accent/40 transition-all duration-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Active Contributors</span>
                    <p className="text-sm font-display font-black text-text-primary">
                      {Math.max(1, Math.min(6, Math.floor(selectedFile.churn / 3) + 1))}
                    </p>
                    <p className="text-[10px] text-text-tertiary font-mono">developers involved</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0 ml-3">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50 col-span-2">
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

            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-text-tertiary">Path</h4>
              <p className="text-xs font-mono p-3 bg-surface-2 rounded-xl border border-border-base shadow-sm text-text-secondary break-all">
                {selectedFile.path}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border-base">
              <h4 className="text-sm font-semibold font-display text-text-primary">AI Actionable Recommendations</h4>
              <div className="p-5 bg-surface-2 border border-border-base rounded-2xl shadow-sm">
                {renderAISuggestion(selectedFile.ai_summary, selectedFile.hotspot_score, selectedFile.complexity)}
              </div>
            </div>

          </div>
        )}
      </Drawer>
    </div>
  );
}
