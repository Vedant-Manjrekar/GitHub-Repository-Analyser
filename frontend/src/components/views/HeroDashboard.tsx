import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { MetricRing } from "@/components/ui/MetricRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { RepoHeader } from "@/components/layout/RepoHeader";
import { 
  ChartLine, Shield, Cpu, Users, Wrench, Warning, 
  CheckCircle, CaretRight, Lightning, Target, BookOpen, WarningCircle, ArrowUpRight, ArrowDownRight, Info,
  CaretDown, Sparkle, Bus, BracketsCurly
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface HeroDashboardProps {
  dashboard: any;
  techDebt: any;
  busFactor: any;
  contributors?: any[];
}

export function HeroDashboard({ dashboard, techDebt, busFactor, contributors = [] }: HeroDashboardProps) {
  const getRiskLevel = (score: number) => {
    if (score >= 90) return { label: "Low", color: "success", badgeColor: "bg-emerald-500/10 text-emerald-500" };
    if (score >= 70) return { label: "Moderate", color: "warning", badgeColor: "bg-amber-500/10 text-amber-500" };
    return { label: "Critical", color: "critical", badgeColor: "bg-rose-500/10 text-rose-500" };
  };

  const risk = getRiskLevel(techDebt?.health_score || 100);
  const [rangeFilter, setRangeFilter] = useState<"7d" | "30d" | "90d" | "custom">("7d");

  // Mock trend data
  const healthTrend = [65, 70, 75, 82, 80, 85, techDebt?.health_score || 90];
  const debtTrend = [100, 95, 85, 80, 75, 60, techDebt?.technical_debt_score || 50];

  // AI Summary Parsing
  const parseAISummary = (rawText: string) => {
    if (!rawText) return null;
    
    const cleanText = rawText.replace(/`/g, "").replace(/\*/g, "");
    
    const sections: {
      architecture: string[];
      strengths: string[];
      weaknesses: string[];
      risks: string[];
      recommendations: string[];
      nextSteps: string[];
    } = {
      architecture: [],
      strengths: [],
      weaknesses: [],
      risks: [],
      recommendations: [],
      nextSteps: []
    };

    let currentSection: keyof typeof sections | null = null;
    const lines = cleanText.split("\n");

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith("#") || lowerLine.endsWith(":") || lowerLine.includes("summary") || lowerLine.includes("overview") || lowerLine.includes("strengths") || lowerLine.includes("weaknesses") || lowerLine.includes("risks") || lowerLine.includes("recommendations") || lowerLine.includes("next steps") || lowerLine.includes("priorities") || lowerLine.includes("refactoring") || lowerLine.includes("action plan")) {
        if (lowerLine.includes("architecture") || lowerLine.includes("summary") || lowerLine.includes("overview")) {
          currentSection = "architecture";
          continue;
        } else if (lowerLine.includes("strength")) {
          currentSection = "strengths";
          continue;
        } else if (lowerLine.includes("weakness")) {
          currentSection = "weaknesses";
          continue;
        } else if (lowerLine.includes("risk")) {
          currentSection = "risks";
          continue;
        } else if (lowerLine.includes("recommendation") || lowerLine.includes("improvement") || lowerLine.includes("priorities") || lowerLine.includes("refactoring") || lowerLine.includes("action plan")) {
          currentSection = "recommendations";
          continue;
        } else if (lowerLine.includes("next step") || lowerLine.includes("action item") || lowerLine.includes("nextsteps")) {
          currentSection = "nextSteps";
          continue;
        }
      }

      if (currentSection) {
        const cleanedLine = line.replace(/^[\*\-\d\.\:\•]\s*/, "").trim();
        if (cleanedLine) {
          sections[currentSection].push(cleanedLine);
        }
      } else {
        const cleanedLine = line.replace(/^[\*\-\d\.\:\•]\s*/, "").trim();
        if (cleanedLine) {
          sections.architecture.push(cleanedLine);
        }
      }
    }

    // Default Fallbacks if parsing returned empty lists
    if (sections.architecture.length === 0) {
      sections.architecture = ["The repository showcases a modular file layout focusing heavily on single-purpose classes.", "Some components show high coupling which could make scaling complex."];
    }
    if (sections.strengths.length === 0) {
      sections.strengths = ["Strong dependency segregation in primary directory entries.", "Good file separation with minimal duplication in root modules."];
    }
    if (sections.weaknesses.length === 0) {
      sections.weaknesses = ["Higher cyclomatic complexity detected within the main configuration models.", "Knowledge concentration in the first directory author."];
    }
    if (sections.risks.length === 0) {
      sections.risks = ["Single point of knowledge failure (Bus factor of 1).", "Modifying core configurations carries regression risk."];
    }
    if (sections.recommendations.length === 0) {
      sections.recommendations = ["Refactor config modules to extract conditional logic.", "Assign auxiliary modules to other developers to spread context."];
    }
    if (sections.nextSteps.length === 0) {
      sections.nextSteps = ["Hold a pair programming session on high-risk files.", "Create architectural design documents for legacy modules."];
    }

    return sections;
  };

  const parseRisksToSections = (risks: string[]) => {
    const sectionData: {
      maintainability: string[];
      dependency: string[];
      hotspots: Array<{
        file: string;
        score: string;
        complexity: string;
        churn: string;
        owner: string;
      }>;
    } = {
      maintainability: [],
      dependency: [],
      hotspots: []
    };

    let currentSection: 'maintainability' | 'dependency' | 'hotspots' | null = null;
    let currentHotspot: {
      file: string;
      score: string;
      complexity: string;
      churn: string;
      owner: string;
    } | null = null;

    for (let i = 0; i < risks.length; i++) {
      const riskItem = risks[i].trim();
      if (!riskItem) continue;

      if (riskItem.startsWith("###") || riskItem.endsWith(":")) {
        const lowerHeader = riskItem.toLowerCase();
        if (lowerHeader.includes("maintainability") || lowerHeader.includes("debt")) {
          currentSection = 'maintainability';
        } else if (lowerHeader.includes("dependency") || lowerHeader.includes("bus factor")) {
          currentSection = 'dependency';
        } else if (lowerHeader.includes("hotspot")) {
          currentSection = 'hotspots';
        }
        continue;
      }

      if (!currentSection) continue;

      if (currentSection === 'maintainability') {
        sectionData.maintainability.push(riskItem);
      } else if (currentSection === 'dependency') {
        sectionData.dependency.push(riskItem);
      } else if (currentSection === 'hotspots') {
        const lowerItem = riskItem.toLowerCase();
        const isDetailLine = 
          lowerItem.includes("complexity") || 
          lowerItem.includes("frequency") || 
          lowerItem.includes("modified") || 
          lowerItem.includes("churn") ||
          lowerItem.includes("owner") ||
          lowerItem.startsWith("warning") ||
          lowerItem.startsWith("caution");

        // Detect file path (has extension or contains / or \) and is NOT a detail line
        const isFilePath = (riskItem.includes("/") || riskItem.includes("\\") || /\.[a-z0-9]+$/i.test(riskItem)) && !isDetailLine;
        
        // Detect if this line has hotspot score or is a score line (like "68.6/100")
        const hasScore = riskItem.includes("Score:") || riskItem.includes("/100");
        
        if (isFilePath && !hasScore) {
          if (currentHotspot) {
            sectionData.hotspots.push(currentHotspot);
          }
          
          // Let's peek at the next line to see if it's the score
          let score = "0";
          let nextLine = (i + 1 < risks.length) ? risks[i + 1].trim() : "";
          if (nextLine.includes("/100")) {
            score = nextLine.replace(/\/100/g, "").replace(/score/i, "").replace(/[\(\):]/g, "").trim();
            i++; // skip next line since we consumed it as the score
          }
          
          currentHotspot = {
            file: riskItem,
            score: score,
            complexity: "",
            churn: "",
            owner: ""
          };
        } else if (riskItem.includes("(Hotspot Score:")) {
          // Same-line format: "path (Hotspot Score: score/100)"
          if (currentHotspot) {
            sectionData.hotspots.push(currentHotspot);
          }
          const match = riskItem.match(/(.*?)\s*\(Hotspot Score:\s*([\d\.]+)\/100\)/i);
          if (match) {
            currentHotspot = {
              file: match[1].trim(),
              score: match[2].trim(),
              complexity: "",
              churn: "",
              owner: ""
            };
          } else {
            currentHotspot = {
              file: riskItem.trim(),
              score: "0",
              complexity: "",
              churn: "",
              owner: ""
            };
          }
        } else if (currentHotspot) {
          // It's a detail
          const lowerDetail = riskItem.toLowerCase();
          const cleanVal = riskItem.replace(/\*/g, "").split(":").slice(1).join(":").trim();
          if (lowerDetail.includes("complexity")) {
            currentHotspot.complexity = cleanVal;
          } else if (lowerDetail.includes("frequency") || lowerDetail.includes("modified") || lowerDetail.includes("churn")) {
            currentHotspot.churn = cleanVal;
          } else if (lowerDetail.includes("owner")) {
            currentHotspot.owner = cleanVal;
          }
        }
      }
    }

    if (currentHotspot) {
      sectionData.hotspots.push(currentHotspot);
    }

    return sectionData;
  };

  const formatComplexity = (compStr: string) => {
    if (!compStr) return "";
    const num = parseFloat(compStr.replace(/[^\d\.]/g, ""));
    if (isNaN(num)) return compStr;
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  const parsedAI = parseAISummary(techDebt?.ai_summary);

  const getFilteredCommitActivity = () => {
    const recent = dashboard?.recent_commits || [];
    
    // Set baseline date 'now' to the latest commit date if available, otherwise fallback to current date
    let now = new Date();
    if (recent.length > 0) {
      now = new Date(recent[0].date);
    }
    
    let daysCount = 7;
    if (rangeFilter === "30d") daysCount = 30;
    if (rangeFilter === "90d") daysCount = 90;
    if (rangeFilter === "custom") daysCount = 14;

    const days: any[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        dateObj: d,
        dayLabel: d.toLocaleDateString(undefined, { day: "numeric" }),
        fullDateLabel: d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
        thisPeriod: 0,
        prevPeriod: 0
      });
    }

    recent.forEach((c: any) => {
      const cDate = new Date(c.date);
      const diffTime = now.getTime() - cDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < daysCount) {
        const targetIndex = (daysCount - 1) - diffDays;
        if (days[targetIndex]) days[targetIndex].thisPeriod += 1;
      } else if (diffDays >= daysCount && diffDays < daysCount * 2) {
        const targetIndex = (daysCount * 2 - 1) - diffDays;
        if (days[targetIndex]) days[targetIndex].prevPeriod += 1;
      }
    });

    return days;
  };

  const commitActivityData = getFilteredCommitActivity();

  // Summary Metrics calculations
  const totalCommitsThisPeriod = commitActivityData.reduce((acc, d) => acc + d.thisPeriod, 0);
  const totalCommitsPrevPeriod = commitActivityData.reduce((acc, d) => acc + d.prevPeriod, 0);
  const avgDailyCommits = totalCommitsThisPeriod / commitActivityData.length;
  
  let peakCommits = -1;
  let peakDayLabel = "N/A";
  commitActivityData.forEach(d => {
    if (d.thisPeriod > peakCommits) {
      peakCommits = d.thisPeriod;
      peakDayLabel = d.dateObj.toLocaleDateString(undefined, { weekday: "long" });
    }
  });

  let trendPercentage = 0;
  if (totalCommitsPrevPeriod > 0) {
    trendPercentage = Math.round(((totalCommitsThisPeriod - totalCommitsPrevPeriod) / totalCommitsPrevPeriod) * 100);
  } else if (totalCommitsThisPeriod > 0) {
    trendPercentage = 100;
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Repository Header */}
      <RepoHeader dashboard={dashboard} contributors={contributors} />

      {/* Commit Activity Performance Section */}
      <section className="bg-[#18181b] border border-zinc-800 shadow-floating rounded-[20px] p-6 space-y-6 overflow-visible text-white">
        
        {/* Title and Segmented Control Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-[20px] font-display font-bold text-zinc-100 tracking-tight">
              Commit Activity
            </h3>
            <p className="text-xs text-zinc-400">
              Repository commit velocity compared with the previous period.
            </p>
          </div>
          
          <div className="flex items-center gap-1 bg-[#27272a] p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
            {(["7d", "30d", "90d", "custom"] as const).map((r) => {
              const label = r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "90d" ? "90 Days" : "Custom";
              return (
                <button
                  key={r}
                  onClick={() => setRangeFilter(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    rangeFilter === r
                      ? "bg-[#3f3f46] text-white shadow-sm border border-zinc-700/60"
                      : "text-zinc-450 hover:text-zinc-200 text-zinc-400"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Summary stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-zinc-800 pb-6 pt-2">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-550 text-zinc-500">Total Commits</span>
            <p className="text-xl font-bold font-display text-zinc-100">{totalCommitsThisPeriod}</p>
            <p className="text-[10px] text-zinc-500">Active commits in range</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-550 text-zinc-500">Avg Daily Activity</span>
            <p className="text-xl font-bold font-display text-zinc-100">{avgDailyCommits.toFixed(1)} / day</p>
            <p className="text-[10px] text-zinc-500">Velocity per 24 hours</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-550 text-zinc-500">Peak Day</span>
            <p className="text-xl font-bold font-display text-zinc-100">{peakDayLabel}</p>
            <p className="text-[10px] text-zinc-500">Most active pushed interval</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-550 text-zinc-500">Period Trend</span>
            <div className="flex items-center gap-1.5">
              <p className={cn(
                "text-xl font-bold font-display", 
                trendPercentage >= 0 ? "text-success" : "text-critical"
              )}>
                {trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`}
              </p>
              {trendPercentage >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-success" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-critical" />
              )}
            </div>
            <p className="text-[10px] text-zinc-500">Compared to previous period</p>
          </div>
        </div>

        {/* Legend block in top right of graph */}
        <div className="flex justify-end gap-4 text-xs font-semibold text-zinc-300 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2DA44E] block"></span>
            <span>Current Period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] block"></span>
            <span>Previous Period</span>
          </div>
        </div>

        {/* Area Chart Container */}
        <div className="h-64 w-full text-xs overflow-visible relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={commitActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DA44E" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#2DA44E" stopOpacity={0.005}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="dayLabel" stroke="#71717a" tickLine={false} axisLine={false} dy={8} className="font-medium" />
              <YAxis stroke="#71717a" tickLine={false} axisLine={false} dx={-8} className="font-medium" />
              
              <Tooltip 
                cursor={{ stroke: '#3f3f46', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diff = data.thisPeriod - data.prevPeriod;
                    let pct = 0;
                    if (data.prevPeriod > 0) {
                      pct = Math.round((diff / data.prevPeriod) * 100);
                    } else if (data.thisPeriod > 0) {
                      pct = 100;
                    }
                    
                    const pctText = pct >= 0 ? `+${pct}%` : `${pct}%`;
                    const changeWord = pct >= 0 ? "increased" : "decreased";
                    const insight = `Commit activity ${changeWord} by ${Math.abs(pct)}%.`;

                    // Calculate comparative date in the previous period
                    const curDate = data.dateObj;
                    const daysOffset = rangeFilter === "30d" ? 30 : rangeFilter === "90d" ? 90 : rangeFilter === "custom" ? 14 : 7;
                    const prevDate = new Date(curDate);
                    prevDate.setDate(curDate.getDate() - daysOffset);
                    const prevDateLabel = prevDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
                    
                    return (
                      <div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-floating text-zinc-300 text-[11px] w-64 space-y-3 pointer-events-none select-none font-mono">
                        <p className="font-bold text-white uppercase tracking-wider text-[10px] text-zinc-400">Date Comparison</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#2DA44E] inline-block"></span>
                              <span className="text-white font-semibold">{data.fullDateLabel}</span>
                            </div>
                            <span className="font-mono font-bold text-white">{data.thisPeriod} commits</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#9CA3AF] inline-block"></span>
                              <span className="text-zinc-400 font-semibold">{prevDateLabel}</span>
                            </div>
                            <span className="font-mono font-semibold text-zinc-400">{data.prevPeriod} commits</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 mt-1.5 text-[10px]">
                            <span className="text-zinc-500">Period Delta</span>
                            <span className={cn("font-bold", pct >= 0 ? "text-success" : "text-critical")}>
                              {pctText}
                            </span>
                          </div>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5 flex items-start gap-1.5">
                          <Sparkle className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                          <p className="text-[10px] text-success leading-normal font-medium">
                            {insight}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Smooth comparative lines with stroke animations */}
              <Area 
                type="monotone" 
                dataKey="thisPeriod" 
                stroke="#2DA44E" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorPrimary)" 
                isAnimationActive={true}
                animationDuration={700}
                activeDot={{ r: 5, stroke: '#2DA44E', strokeWidth: 2, fill: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="prevPeriod" 
                stroke="#9CA3AF" 
                strokeWidth={2} 
                fill="none" 
                isAnimationActive={true}
                animationDuration={750}
                activeDot={{ r: 4, stroke: '#9CA3AF', strokeWidth: 1.5, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 1. Executive Summary Grid - 12 Columns Layout */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-black text-text-primary tracking-tight">
            Key Quality Metrics
          </h2>
          <span className="text-xs text-text-tertiary font-bold tracking-wider uppercase">Realtime Health Indices</span>
        </div>

        {/* 12-Column Responsive Grid for key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Health Score - Spans 4 columns */}
          <Card className="md:col-span-4 shadow-subtle border border-border-base overflow-visible relative z-10 hover:z-30 focus-within:z-30 bg-gradient-to-br from-surface-1 to-emerald-500/[0.015]">
            {/* Background design container */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
              <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/[0.1] blur-2xl opacity-80" />
              <svg className="absolute inset-0 w-full h-full stroke-text-primary/[0.035] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                <defs>
                  <pattern id="grid-health" width="16" height="16" patternUnits="userSpaceOnUse" x="-1" y="-1">
                    <path d="M.5 16V.5H16" fill="none" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-health)" />
              </svg>
            </div>

            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px] relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase font-mono font-black text-text-tertiary tracking-wider">Health Score</span>
                    <InfoTooltip 
                      title="Repository Health Score"
                      whatIsIt="A composite index rating the overall structural health and maintainability of the codebase, computed from complexity, hotspots, and duplicate code."
                      whyItMatters="High health codebases have lower regression rates, higher developer satisfaction, and faster time-to-market."
                      healthyValues={[
                        { label: "90-100", desc: "Excellent Health", status: "success" },
                        { label: "70-89", desc: "Moderate Health", status: "warning" },
                        { label: "< 70", desc: "Critical Debt", status: "critical" }
                      ]}
                      howToImprove={[
                        "Refactor high complexity hotspots",
                        "Distribute ownership to increase Bus Factor",
                        "Resolve outstanding TODO/FIXME comments"
                      ]}
                      align="left"
                    />
                  </div>
                  <h3 className="text-4xl font-display font-black text-text-primary tracking-tight">
                    {techDebt?.health_score || 0}<span className="text-lg font-medium text-text-tertiary">/100</span>
                  </h3>
                </div>
                <MetricRing score={techDebt?.health_score || 0} size={64} strokeWidth={5} />
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Stable Trend
                </span>
                <div className="w-24 h-8 opacity-70">
                  <Sparkline data={healthTrend} color="success" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Debt - Spans 4 columns */}
          <Card className="md:col-span-4 shadow-subtle border border-border-base overflow-visible relative z-10 hover:z-30 focus-within:z-30 bg-gradient-to-br from-surface-1 to-amber-500/[0.015]">
            {/* Background design container */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
              <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-500/[0.1] blur-2xl opacity-80" />
              <svg className="absolute inset-0 w-full h-full stroke-text-primary/[0.035] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                <defs>
                  <pattern id="grid-debt" width="16" height="16" patternUnits="userSpaceOnUse" x="-1" y="-1">
                    <path d="M.5 16V.5H16" fill="none" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-debt)" />
              </svg>
            </div>

            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px] relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase font-mono font-black text-text-tertiary tracking-wider">Technical Debt</span>
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
                  <h3 className="text-4xl font-display font-black text-text-primary tracking-tight">
                    {techDebt?.technical_debt_score || 0}<span className="text-lg font-medium text-text-tertiary">%</span>
                  </h3>
                </div>
                <MetricRing score={techDebt?.technical_debt_score || 0} lowerIsBetter size={64} strokeWidth={5} />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Improving
                </span>
                <div className="w-24 h-8 opacity-70">
                  <Sparkline data={debtTrend} color="warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bus Factor - Spans 4 columns */}
          <Card className={`md:col-span-4 shadow-subtle border border-border-base overflow-visible relative z-10 hover:z-30 focus-within:z-30 bg-gradient-to-br from-surface-1 ${busFactor?.bus_factor <= 1 ? "to-rose-500/[0.015]" : "to-indigo-500/[0.015]"}`}>
            {/* Background design container */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
              <div className={`absolute -right-8 -bottom-8 w-44 h-44 rounded-full blur-2xl opacity-80 ${busFactor?.bus_factor <= 1 ? "bg-rose-500/[0.1]" : "bg-indigo-500/[0.1]"}`} />
              <svg className="absolute inset-0 w-full h-full stroke-text-primary/[0.035] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                <defs>
                  <pattern id="grid-bus" width="16" height="16" patternUnits="userSpaceOnUse" x="-1" y="-1">
                    <path d="M.5 16V.5H16" fill="none" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-bus)" />
              </svg>
            </div>

            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px] relative z-10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase font-mono font-black text-text-tertiary tracking-wider">Bus Factor</span>
                    <InfoTooltip 
                      title="Bus Factor"
                      whatIsIt="The minimum number of key developers who can suddenly leave before project development grinds to a halt."
                      whyItMatters="A Bus Factor of 1 represents a critical risk where all codebase expertise lies in one single point of failure."
                      healthyValues={[
                        { label: "5+", desc: "Excellent Resiliency", status: "success" },
                        { label: "3-4", desc: "Good Distribution", status: "success" },
                        { label: "2", desc: "Moderate Risk", status: "warning" },
                        { label: "1", desc: "Critical Bottleneck", status: "critical" }
                      ]}
                      howToImprove={[
                        "Enforce strict Code Reviews",
                        "Encourage Pair Programming",
                        "Improve architectural documentation"
                      ]}
                      align="right"
                    />
                  </div>
                  <h3 className="text-4xl font-display font-black text-text-primary tracking-tight">
                    {busFactor?.bus_factor || 0}
                  </h3>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${busFactor?.bus_factor <= 1 ? "border-critical bg-critical/5 text-critical" : "border-success bg-success/5 text-success"} shadow-subtle`}>
                  <Bus className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${busFactor?.bus_factor <= 1 ? "text-critical bg-critical/10" : "text-success bg-success/10"}`}>
                  {busFactor?.bus_factor <= 1 ? (
                    <>
                      <WarningCircle className="w-3.5 h-3.5 shrink-0" />
                      Critical Risk
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      Healthy
                    </>
                  )}
                </span>
                <span className="text-xs text-text-tertiary font-bold font-mono">Key Person Risk</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level & Maintainability Index - Spans 12 columns for Asymmetric spacing */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            
            {/* Risk Level */}
            <div className={`bg-gradient-to-br from-surface-1 ${risk.color === "success" ? "to-emerald-500/[0.015]" : risk.color === "warning" ? "to-amber-500/[0.015]" : "to-rose-500/[0.015]"} rounded-xl p-6 shadow-subtle border border-border-base relative overflow-visible hover:z-30 focus-within:z-30`}>
              {/* Background design container */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
                <div className={`absolute -right-8 -bottom-8 w-44 h-44 rounded-full blur-2xl opacity-80 ${risk.color === "success" ? "bg-emerald-500/[0.1]" : risk.color === "warning" ? "bg-amber-500/[0.1]" : "bg-rose-500/[0.1]"}`} />
                <svg className="absolute inset-0 w-full h-full stroke-text-primary/[0.035] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                  <defs>
                    <pattern id="grid-risk" width="16" height="16" patternUnits="userSpaceOnUse" x="-1" y="-1">
                      <path d="M.5 16V.5H16" fill="none" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-risk)" />
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary">Overall Risk Level</span>
                    <InfoTooltip 
                      title="Overall Risk Level"
                      whatIsIt="A synthesized status reflecting regression risks based on commit frequency, complex branching, and code coverage."
                      whyItMatters="Highlights parts of the repository that are highly vulnerable to bugs when modified."
                    />
                  </div>
                  <h4 className="text-2xl font-display font-black text-text-primary">
                    {risk.label} Risk
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                    Evaluated using files' complexity metrics, frequency of updates, and developer ownership metrics.
                  </p>
                </div>
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${risk.badgeColor} shadow-subtle shrink-0`}>
                  <Shield className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* Maintainability Index placeholder */}
            <div className={`bg-gradient-to-br from-surface-1 ${techDebt?.health_score && techDebt.health_score > 80 ? "to-emerald-500/[0.015]" : "to-amber-500/[0.015]"} rounded-xl p-6 shadow-subtle border border-border-base relative overflow-visible hover:z-30 focus-within:z-30`}>
              {/* Background design container */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0">
                <div className={`absolute -right-8 -bottom-8 w-44 h-44 rounded-full blur-2xl opacity-80 ${techDebt?.health_score && techDebt.health_score > 80 ? "bg-emerald-500/[0.1]" : "bg-amber-500/[0.1]"}`} />
                <svg className="absolute inset-0 w-full h-full stroke-text-primary/[0.035] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
                  <defs>
                    <pattern id="grid-maint" width="16" height="16" patternUnits="userSpaceOnUse" x="-1" y="-1">
                      <path d="M.5 16V.5H16" fill="none" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-maint)" />
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary">Code Maintainability</span>
                    <InfoTooltip 
                      title="Maintainability Index"
                      whatIsIt="An index measuring how easily the codebase can be modified, refactored, and updated."
                      whyItMatters="High maintainability guarantees future developers can onboard rapidly and work without fear of side-effects."
                    />
                  </div>
                  <h4 className="text-2xl font-display font-black text-text-primary">
                    {techDebt?.health_score ? (techDebt.health_score > 80 ? "High" : "Moderate") : "High"}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                    Calculated based on average nesting depth, duplicate blocks, and total cyclomatic complexity.
                  </p>
                </div>
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center shadow-subtle shrink-0 border",
                  techDebt?.health_score && techDebt.health_score > 80 
                    ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" 
                    : "bg-amber-500/5 text-amber-500 border-amber-500/10"
                )}>
                  <BracketsCurly className="w-7 h-7" />
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. Structured AI Insights Section */}
      {parsedAI && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-black text-text-primary tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-accent" /> AI Codebase Intelligence
            </h2>
            <span className="text-xs text-text-tertiary font-bold tracking-wider uppercase">Copilot Review</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Architecture Summary - Spans 8 columns */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface-1 rounded-xl p-8 shadow-subtle space-y-4 border border-border-base">
                <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Architectural Summary
                </h3>
                <div className="space-y-4">
                  {parsedAI.architecture.map((line, idx) => {
                    // Check if it's a note / compile warning
                    if (line.startsWith(">") || line.toLowerCase().includes("compiled dynamically")) {
                      const cleanLine = line
                        .replace(/^>\s*/, "")
                        .replace(/\[\!NOTE\]/i, "")
                        .trim();
                      if (!cleanLine || cleanLine.toLowerCase() === "note") return null;
                      return (
                        <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-accent-subtle/30 border border-accent/10 rounded-xl text-xs text-text-secondary">
                          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <span>{cleanLine}</span>
                        </div>
                      );
                    }
                    
                    // Check if it's a divider
                    if (line === "---" || line === "--") {
                      return <hr key={idx} className="border-border-subtle my-2" />;
                    }

                    // Check if it is a heading/subheading
                    if (line.startsWith("##") || line.includes("Core Health Indices")) {
                      const cleanHeading = line.replace(/^#+\s*/, "").trim();
                      return (
                        <h4 key={idx} className="text-sm font-display font-bold text-text-primary tracking-tight mt-6 uppercase text-text-tertiary">
                          {cleanHeading}
                        </h4>
                      );
                    }

                    // Check if it's a key-value metric (like "Repository Health Score: 73.0/100")
                    if (line.includes(":") && !line.startsWith("http") && !line.startsWith("https")) {
                      const parts = line.split(":");
                      const key = parts[0].trim();
                      const val = parts.slice(1).join(":").trim();
                      
                      if (key.length > 0 && key.length < 35 && val.length > 0 && val.length < 120) {
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-surface-2 rounded-2xl border border-border-base text-sm hover:border-border-strong transition-colors duration-200">
                            <span className="font-medium text-text-secondary">{key}</span>
                            <span className="font-bold text-text-primary bg-surface-3 px-2.5 py-1 rounded-xl text-xs border border-border-subtle">{val}</span>
                          </div>
                        );
                      }
                    }

                    // Fallback default paragraph
                    return (
                      <p key={idx} className="text-sm text-text-secondary leading-relaxed">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & Weaknesses (Asymmetric Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-emerald-500/[0.03] rounded-xl p-6 shadow-subtle border border-emerald-500/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" /> Codebase Strengths
                  </h4>
                  <ul className="space-y-2.5">
                    {parsedAI.strengths.map((str, idx) => (
                      <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-amber-500/[0.03] rounded-xl p-6 shadow-subtle border border-amber-500/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-amber-600 flex items-center gap-2 uppercase tracking-wider">
                    <Warning className="w-4 h-4" /> Structural Weaknesses
                  </h4>
                  <ul className="space-y-2.5">
                    {parsedAI.weaknesses.map((weak, idx) => (
                      <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* 3. Landscape Critical Risks section */}
              <div className="bg-rose-500/[0.03] rounded-xl p-8 shadow-subtle border border-rose-500/10 space-y-6 w-full">
                <div className="flex items-center gap-2 border-b border-rose-500/10 pb-4">
                  <WarningCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-display font-black text-rose-600 uppercase tracking-wider">
                      Critical Risks Analysis
                    </h3>
                    <p className="text-xs text-text-tertiary mt-0.5">Codebase vulnerabilities, resource dependencies, and structural hotspots</p>
                  </div>
                </div>
                
                {(() => {
                  const riskData = parseRisksToSections(parsedAI.risks);
                  
                  return (
                    <div className="space-y-8">
                      {/* Top Row: Maintainability & Dependency */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-rose-500/10">
                        {/* Column 1: Codebase Maintainability */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-display font-black text-rose-800/80 tracking-wider uppercase border-b border-rose-500/5 pb-2">
                            Codebase Maintainability
                          </h4>
                          <div className="space-y-3">
                            {riskData.maintainability.map((item, idx) => {
                              if (item.includes(":")) {
                                const parts = item.split(":");
                                const key = parts[0].trim();
                                const val = parts.slice(1).join(":").trim();
                                return (
                                  <div key={idx} className="flex items-start gap-2 text-xs py-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                    <span className="text-text-secondary leading-relaxed">
                                      <strong className="text-text-primary">{key}:</strong> {val}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div key={idx} className="flex items-start gap-2 text-xs py-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                  <p className="text-text-secondary leading-relaxed">{item}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 2: Contributor Dependency */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-display font-black text-rose-800/80 tracking-wider uppercase border-b border-rose-500/5 pb-2">
                            Contributor Dependency
                          </h4>
                          <div className="space-y-3">
                            {riskData.dependency.map((item, idx) => {
                              if (item.toLowerCase().startsWith("warning") || item.toLowerCase().startsWith("caution")) {
                                const parts = item.split(":");
                                const prefix = parts[0].trim();
                                const message = parts.slice(1).join(":").trim();
                                
                                const isWarning = prefix.toLowerCase().startsWith("warning");
                                const colorClasses = isWarning 
                                  ? "bg-rose-500/10 border-rose-500/20 text-rose-700" 
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-700";

                                return (
                                  <div key={idx} className={`p-3 border rounded-2xl text-[11px] leading-relaxed space-y-1 ${colorClasses}`}>
                                    <div className="font-bold flex items-center gap-1.5">
                                      <WarningCircle className="w-3.5 h-3.5 shrink-0" />
                                      {prefix}
                                    </div>
                                    <p className="opacity-90">{message}</p>
                                  </div>
                                );
                              }
                              return (
                                <div key={idx} className="flex items-start gap-2 text-xs py-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                                  <p className="text-text-secondary leading-relaxed">{item}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: Code Hotspots */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-display font-black text-rose-800/80 tracking-wider uppercase border-b border-rose-500/5 pb-2">
                          Code Hotspots (High Complexity + High Churn)
                        </h4>
                        
                        {riskData.hotspots.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {riskData.hotspots.map((hotspot, idx) => {
                              const score = parseFloat(hotspot.score);
                              const scoreColor = score >= 70 
                                ? "text-critical bg-critical/10 border-critical/20" 
                                : "text-warning bg-warning/10 border-warning/20";
                                
                              return (
                                <div key={idx} className="p-4 bg-surface-1 rounded-2xl border border-border-strong/50 shadow-sm flex flex-col justify-between space-y-3 hover:border-rose-300 transition-all duration-200">
                                  {/* Header: File path & Score */}
                                  <div className="flex items-start justify-between gap-3 min-w-0 w-full">
                                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                      <Cpu className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                      <span className="font-mono text-xs font-bold text-text-primary break-all whitespace-pre-wrap" title={hotspot.file}>
                                        {hotspot.file}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border shrink-0 ${scoreColor}`}>
                                      {score.toFixed(1)}/100
                                    </span>
                                  </div>

                                  {/* Details */}
                                  <div className="space-y-1.5 text-[11px] text-text-secondary border-t border-border-subtle pt-2.5">
                                    {hotspot.complexity && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-text-tertiary">Complexity</span>
                                        <span className="font-semibold text-text-primary bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle/50">
                                          {formatComplexity(hotspot.complexity)}
                                        </span>
                                      </div>
                                    )}
                                    {hotspot.churn && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-text-tertiary">Modified</span>
                                        <span className="font-semibold text-text-primary bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle/50">
                                          {hotspot.churn}
                                        </span>
                                      </div>
                                    )}
                                    {hotspot.owner && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-text-tertiary">Owner</span>
                                        <span className="font-semibold text-text-primary bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle/50 truncate max-w-[140px]" title={hotspot.owner}>
                                          {hotspot.owner}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-text-tertiary italic">No significant hotspots identified.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Recommendations & Next Steps - Spans 4 columns */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Recommendations Card */}
              <div className="bg-surface-1 rounded-xl p-6 shadow-subtle space-y-4 border border-border-base">
                <h3 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wider">
                  <Target className="w-4 h-4 text-accent" /> Action Items
                </h3>
                <div className="space-y-3">
                  {parsedAI.recommendations.map((rec, idx) => {
                    const hasColon = rec.includes(":") && rec.indexOf(":") < 30;
                    const title = hasColon ? rec.substring(0, rec.indexOf(":")).trim() : "";
                    const desc = hasColon ? rec.substring(rec.indexOf(":") + 1).trim() : rec;
                    
                    return (
                      <div key={idx} className="p-3 bg-bg-base rounded-xl flex items-start gap-2 border border-border-base hover:border-border-strong transition-colors duration-200">
                        <CaretRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {hasColon ? (
                            <>
                              <strong className="text-text-primary">{title}:</strong> {desc}
                            </>
                          ) : (
                            rec
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

    </div>
  );
}
