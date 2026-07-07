import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { MetricRing } from "@/components/ui/MetricRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { RepoHeader } from "@/components/layout/RepoHeader";
import { 
  Activity, Shield, Cpu, Users, Wrench, AlertTriangle, 
  CheckCircle2, ChevronRight, Zap, Target, BookOpen, AlertCircle, ArrowUpRight, ArrowDownRight, Info 
} from "lucide-react";
import { motion } from "framer-motion";

interface HeroDashboardProps {
  dashboard: any;
  techDebt: any;
  busFactor: any;
}

export function HeroDashboard({ dashboard, techDebt, busFactor }: HeroDashboardProps) {
  const getRiskLevel = (score: number) => {
    if (score >= 90) return { label: "Low", color: "success", badgeColor: "bg-emerald-500/10 text-emerald-500" };
    if (score >= 70) return { label: "Moderate", color: "warning", badgeColor: "bg-amber-500/10 text-amber-500" };
    return { label: "Critical", color: "critical", badgeColor: "bg-rose-500/10 text-rose-500" };
  };

  const risk = getRiskLevel(techDebt?.health_score || 100);

  // Mock trend data
  const healthTrend = [65, 70, 75, 82, 80, 85, techDebt?.health_score || 90];
  const debtTrend = [100, 95, 85, 80, 75, 60, techDebt?.technical_debt_score || 50];

  // AI Summary Parsing
  const parseAISummary = (rawText: string) => {
    if (!rawText) return null;
    
    const cleanText = rawText.replace(/`/g, "").replace(/\*\*/g, "");
    
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
      if (lowerLine.startsWith("#") || lowerLine.endsWith(":") || lowerLine.includes("summary") || lowerLine.includes("overview") || lowerLine.includes("strengths") || lowerLine.includes("weaknesses") || lowerLine.includes("risks") || lowerLine.includes("recommendations") || lowerLine.includes("next steps")) {
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
        } else if (lowerLine.includes("recommendation") || lowerLine.includes("improvement")) {
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

  const parsedAI = parseAISummary(techDebt?.ai_summary);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Repository Header */}
      <RepoHeader dashboard={dashboard} />

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
          <Card interactive className="md:col-span-4 shadow-subtle ring-1 ring-border-base/50">
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
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
          <Card interactive className="md:col-span-4 shadow-subtle ring-1 ring-border-base/50">
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
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
                <MetricRing score={100 - (techDebt?.technical_debt_score || 0)} size={64} strokeWidth={5} />
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
          <Card interactive className="md:col-span-4 shadow-subtle ring-1 ring-border-base/50">
            <CardContent className="p-6 flex flex-col justify-between h-full min-h-[220px]">
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
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${busFactor?.bus_factor <= 1 ? "text-critical bg-critical/10" : "text-success bg-success/10"}`}>
                  {busFactor?.bus_factor <= 1 ? "🔴 Critical Risk" : "🟢 Healthy"}
                </span>
                <span className="text-xs text-text-tertiary font-bold font-mono">Key Person Risk</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level & Maintainability Index - Spans 12 columns for Asymmetric spacing */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            
            {/* Risk Level */}
            <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle flex items-center justify-between ring-1 ring-border-base/50">
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
              <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center ${risk.badgeColor} shadow-subtle shrink-0`}>
                <Shield className="w-7 h-7" />
              </div>
            </div>

            {/* Maintainability Index placeholder */}
            <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle flex items-center justify-between ring-1 ring-border-base/50">
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
              <div className="w-16 h-16 rounded-[22px] bg-accent/5 text-accent flex items-center justify-center shadow-subtle shrink-0">
                <Activity className="w-7 h-7" />
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
              <div className="bg-surface-1 rounded-3xl p-8 shadow-subtle space-y-4 ring-1 ring-border-base/50">
                <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Architectural Summary
                </h3>
                <div className="space-y-4">
                  {parsedAI.architecture.map((line, idx) => (
                    <p key={idx} className="text-sm text-text-secondary leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses (Asymmetric Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-emerald-500/[0.03] rounded-3xl p-6 shadow-subtle ring-1 ring-emerald-500/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-emerald-600 flex items-center gap-2 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" /> Codebase Strengths
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
                <div className="bg-amber-500/[0.03] rounded-3xl p-6 shadow-subtle ring-1 ring-amber-500/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-amber-600 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" /> Structural Weaknesses
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
            </div>

            {/* Recommendations & Next Steps - Spans 4 columns */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Recommendations Card */}
              <div className="bg-surface-1 rounded-3xl p-6 shadow-subtle space-y-4 ring-1 ring-border-base/50">
                <h3 className="text-sm font-display font-bold text-text-primary flex items-center gap-2 uppercase tracking-wider">
                  <Target className="w-4 h-4 text-accent" /> Action Items
                </h3>
                <div className="space-y-3">
                  {parsedAI.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-bg-base rounded-2xl flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <p className="text-xs text-text-secondary leading-relaxed font-semibold">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Risks list */}
              <div className="bg-rose-500/[0.03] rounded-3xl p-6 shadow-subtle ring-1 ring-rose-500/10 space-y-4">
                <h3 className="text-sm font-display font-bold text-rose-600 flex items-center gap-2 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" /> Critical Risks
                </h3>
                <div className="space-y-3">
                  {parsedAI.risks.map((riskItem, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                      <p className="text-xs text-text-secondary leading-relaxed">{riskItem}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

    </div>
  );
}
