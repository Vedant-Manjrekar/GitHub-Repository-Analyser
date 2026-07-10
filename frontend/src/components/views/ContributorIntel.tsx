import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Drawer } from "@/components/ui/Drawer";
import { Users, Warning, CheckCircle, GitCommit, Info, User, Envelope, ShieldWarning, Cpu, Folder, CaretDown, FileCode, CaretRight } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ContributorIntelProps {
  contributors: any[];
  busFactor: any;
}

const getLossRiskLabel = (score: number) => {
  if (score > 70) return "High";
  if (score > 40) return "Medium";
  return "Low";
};

export function ContributorIntel({ contributors, busFactor }: ContributorIntelProps) {
  const [selectedAuthor, setSelectedAuthor] = useState<any>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const totalContributors = contributors?.length || 0;
  const totalCommits = contributors?.reduce((sum: number, item: any) => sum + item.commits, 0) || 0;
  const sortedContributors = [...(contributors || [])].sort((a, b) => b.commits - a.commits);

  const mostFilesOwner = [...(contributors || [])].sort((a, b) => 
    (b.owned_files?.length || 0) - (a.owned_files?.length || 0)
  )[0];

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const getFolderGroups = (files: string[]) => {
    const groups: Record<string, string[]> = {};
    files.forEach(file => {
      const segments = file.split("/");
      const fileName = segments.pop() || "";
      const folderPath = segments.join("/") || "Root";
      if (!groups[folderPath]) {
        groups[folderPath] = [];
      }
      groups[folderPath].push(fileName);
    });
    return groups;
  };

  // Derive Mocked timelines & owned files for the selection drawer to show rich profiles
  const getAuthorDetails = (author: any) => {
    if (!author) return null;

    const riskScore = author.commits > 50 ? 85 : author.commits > 20 ? 55 : 25;

    // Derive expertise from owned files using path/extension patterns
    const files: string[] = author.owned_files && author.owned_files.length > 0
      ? author.owned_files
      : ["src/app/page.tsx", "src/components/layout/AppShell.tsx", "src/utils/api.ts"];

    const rules: { match: (f: string) => boolean; tag: string }[] = [
      { match: f => /\.(test|spec)\.(ts|tsx|js|jsx|py)$/.test(f),                              tag: "Testing" },
      { match: f => /\.(css|scss|sass|less)$/.test(f) || f.includes("styles"),                  tag: "Styling" },
      { match: f => /migrations?\/|\.sql$/.test(f),                                             tag: "Database" },
      { match: f => /docs?\/|readme|\.md$/i.test(f),                                            tag: "Documentation" },
      { match: f => /(api|routes?|endpoints?|views?)\/.*\.(py|ts|js)$/.test(f),                 tag: "API Endpoints" },
      { match: f => /components\/.*\.(tsx|jsx)$/.test(f),                                       tag: "UI Components" },
      { match: f => /(app|pages?)\/.*\.(tsx|jsx|ts|js)$/.test(f) && !f.includes("component"),   tag: "App Architecture" },
      { match: f => /\.(py)$/.test(f) && /(service|handler|manager|core)/.test(f),              tag: "Backend Logic" },
      { match: f => /config|settings|env|\.toml$|\.yaml$|\.yml$/.test(f),                       tag: "Config & DevOps" },
      { match: f => /(hooks?|context|store|state|redux|zustand)/.test(f),                       tag: "State Management" },
      { match: f => /(utils?|helpers?|lib)\/.+\.(ts|js|py)$/.test(f),                          tag: "Utilities" },
      { match: f => /\.(sh|dockerfile|docker|ci|github\/workflows)/i.test(f),                   tag: "CI / Infra" },
    ];

    const matchedTags = rules
      .filter(rule => files.some(f => rule.match(f)))
      .map(r => r.tag)
      .slice(0, 5);

    const expertise = matchedTags.length > 0 ? matchedTags : ["General Development"];

    const mockFiles = files;

    return {
      riskScore,
      expertise,
      mockFiles,
      commitTimeline: [
        { month: "Jan", commits: Math.round(author.commits * 0.1) },
        { month: "Feb", commits: Math.round(author.commits * 0.25) },
        { month: "Mar", commits: Math.round(author.commits * 0.3) },
        { month: "Apr", commits: Math.round(author.commits * 0.35) },
      ]
    };
  };

  const authorDetails = getAuthorDetails(selectedAuthor);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Hidden SVG Filter for Coarse Metallic Texture */}
      <svg className="absolute w-0 h-0 pointer-events-none select-none opacity-0" aria-hidden="true">
        <filter id="metal-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.12 0" />
        </filter>
      </svg>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Contributor Intelligence</h2>
          <p className="text-sm text-text-secondary mt-1">
            Analyzing team repository ownership, knowledge bottlenecks, and key personnel concentration risks.
          </p>
        </div>
      </div>

      {/* 1. Top Contributors Podium */}
      {sortedContributors.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="text-center max-w-md mx-auto mb-2 relative">
            <h3 className="text-xl font-display font-black text-text-primary tracking-tight uppercase">Top Contributors</h3>
            <p className="text-xs text-text-tertiary mt-1">Key developers ranked by commit volume and file ownership scope</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4 pb-2">
            
            {/* 2nd Place Contributor */}
            {sortedContributors.length > 1 ? (
              (() => {
                const c = sortedContributors[1];
                const share = totalCommits > 0 ? ((c.commits / totalCommits) * 100).toFixed(1) : "0.0";
                return (
                  <Card className="order-2 md:order-1 bg-surface-1 shadow-subtle rounded-3xl border border-border-base relative overflow-hidden z-10 hover:z-30 focus-within:z-30 md:scale-95 hover:scale-[0.98] transition-all duration-200 min-h-[320px] flex flex-col justify-between self-center">
                    <CardContent className="p-5 flex flex-col items-center justify-between h-full flex-1">
                      
                      {/* Avatar with Concentric Circles (Scaled Down) */}
                      <div className="relative w-full flex flex-col items-center pt-2">
                        {/* Background Concentric Circles */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center pointer-events-none select-none z-0">
                          <div className="absolute w-22 h-22 rounded-full border border-border-base/[0.25]" />
                          <div className="absolute w-30 h-30 rounded-full border border-border-base/[0.15]" />
                          <div className="absolute w-38 h-38 rounded-full border border-border-base/[0.08]" />
                          <svg className="absolute inset-0 w-full h-full stroke-slate-300/[0.25] stroke-[1] fill-none" style={{ animation: "spin 40s linear infinite" }} viewBox="0 0 100 100">
                            <path d="M 50,2 A 48,48 0 0,1 98,50" strokeDasharray="3 3" />
                            <path d="M 2,50 A 48,48 0 0,1 50,98" strokeWidth="0.5" />
                          </svg>
                        </div>
                        
                        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center z-10">
                          {/* Lustrous Metallic Silver Avatar ring with coarse noise filter */}
                          <div 
                            className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#94A3B8] via-[#F8FAFC] via-[#CBD5E1] via-[#FFFFFF] to-[#94A3B8] p-[2.5px] shadow-subtle relative overflow-hidden"
                          >
                            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                            <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-black text-xl text-[#334155] relative z-10">
                              {c.name.substring(0, 1).toUpperCase()}
                            </div>
                          </div>
                          {/* Top-Right Status Dot with Silver Gradient */}
                          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-gradient-to-tr from-[#94A3B8] to-[#FFFFFF] rounded-full border-[2px] border-white dark:border-zinc-900 z-20 shadow-sm" />
                          {/* Bottom-Right Rank Badge */}
                          <span className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-[#94A3B8] to-[#475569] text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md border border-white z-20 shadow-sm">#2</span>
                        </div>
                      </div>
                      
                      {/* Name & Title */}
                      <div className="text-center mt-3 z-10 relative space-y-1">
                        <h4 className="font-bold text-sm text-text-primary truncate max-w-[150px]" title={c.name}>{c.name}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-[#94A3B8]/10 via-[#F8FAFC]/25 to-[#94A3B8]/10 text-[#475569] border border-[#94A3B8]/30 select-none">
                          Core Collaborator
                        </span>
                      </div>

                      {/* Git Stats */}
                      <div className="flex items-center justify-between w-full my-4 px-2.5 py-2 bg-surface-2/45 rounded-2xl border border-border-base/30 z-10 relative">
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.commits}</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Commits</p>
                        </div>
                        <div className="h-4 w-px bg-border-base/50" />
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.owned_files?.length || 0}</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Files</p>
                        </div>
                        <div className="h-4 w-px bg-border-base/50" />
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{share}%</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Share</p>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 w-full mt-1 z-10 relative">
                        <button 
                          onClick={() => setSelectedAuthor(c)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#94A3B8] via-[#F8FAFC] to-[#94A3B8] hover:brightness-105 border border-[#CBD5E1]/40 rounded-full text-[9px] font-black uppercase tracking-wider text-[#1E293B] transition-all shadow-md flex-1 cursor-pointer select-none relative overflow-hidden"
                        >
                          <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                          <User className="w-3.5 h-3.5 text-[#1E293B]/80 relative z-10" />
                          <span className="relative z-10">Profile</span>
                        </button>
                        
                        <a 
                          href={`mailto:${c.email}`}
                          className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                          title="Email contributor"
                        >
                          <Envelope className="w-3.5 h-3.5 text-text-tertiary" />
                        </a>
                        
                        <button 
                          onClick={() => setSelectedAuthor(c)}
                          className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                          title="View owned files"
                        >
                          <FileCode className="w-3.5 h-3.5 text-text-tertiary" />
                        </button>
                      </div>
                      
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <div className="order-2 md:order-1 h-1 md:block hidden"></div>
            )}

            {/* 1st Place Contributor */}
            {(() => {
              const c = sortedContributors[0];
              const share = totalCommits > 0 ? ((c.commits / totalCommits) * 100).toFixed(1) : "0.0";
              return (
                <Card className="order-1 md:order-2 md:scale-105 bg-surface-1 shadow-elevated rounded-3xl border border-amber-500/25 relative overflow-hidden z-20 hover:scale-[1.07] transition-transform duration-200 min-h-[370px] flex flex-col justify-between">
                  <CardContent className="p-6 flex flex-col items-center justify-between h-full flex-1">
                    
                    {/* Avatar with Concentric Circles */}
                    <div className="relative w-full flex flex-col items-center pt-4">
                      {/* Background Concentric Circles */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 flex items-center justify-center pointer-events-none select-none z-0">
                        <div className="absolute w-28 h-28 rounded-full border border-amber-500/[0.25]" />
                        <div className="absolute w-36 h-36 rounded-full border border-amber-500/[0.15]" />
                        <div className="absolute w-44 h-44 rounded-full border border-amber-500/[0.08]" />
                        <svg className="absolute inset-0 w-full h-full stroke-[#B38728]/[0.25] stroke-[1] fill-none" style={{ animation: "spin 40s linear infinite" }} viewBox="0 0 100 100">
                          <path d="M 50,2 A 48,48 0 0,1 98,50" strokeDasharray="3 3" />
                          <path d="M 2,50 A 48,48 0 0,1 50,98" strokeWidth="0.5" />
                        </svg>
                      </div>
                      
                      <div className="relative w-20 h-20 shrink-0 flex items-center justify-center z-10">
                        {/* Lustrous Metallic Gold Avatar ring with coarse noise filter */}
                        <div 
                          className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] via-[#B38728] via-[#FBF5B7] to-[#AA771C] p-[3px] shadow-subtle relative overflow-hidden"
                        >
                          <div className="absolute inset-0 pointer-events-none opacity-45 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                          <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-black text-2xl text-[#7A5712] relative z-10">
                            {c.name.substring(0, 1).toUpperCase()}
                          </div>
                        </div>
                        {/* Top-Right Status Dot with Gold Gradient */}
                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-gradient-to-tr from-[#B38728] to-[#FCF6BA] rounded-full border-[2.5px] border-white dark:border-zinc-900 z-20 shadow-sm" />
                        {/* Bottom-Right Rank Badge */}
                        <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#BF953F] to-[#AA771C] text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md border border-white z-20 shadow-sm">#1</span>
                      </div>
                    </div>
                    
                    {/* Name & Title */}
                    <div className="text-center mt-4 z-10 relative space-y-1.5">
                      <h4 className="font-bold text-base text-text-primary truncate max-w-[190px] flex items-center justify-center gap-1" title={c.name}>
                        {c.name}
                        <CheckCircle className="w-4 h-4 text-[#B38728] shrink-0" weight="fill" />
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-[#BF953F]/10 via-[#FBF5B7]/20 to-[#B38728]/10 text-[#8A640F] border border-[#B38728]/35 select-none">
                        Lead Maintainer
                      </span>
                    </div>

                    {/* Git Stats */}
                    <div className="flex items-center justify-between w-full my-5 px-3 py-2.5 bg-surface-2/45 rounded-2xl border border-border-base/30 z-10 relative">
                      <div className="flex-1 text-center">
                        <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.commits}</p>
                        <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Commits</p>
                      </div>
                      <div className="h-5 w-px bg-border-base/50" />
                      <div className="flex-1 text-center">
                        <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.owned_files?.length || 0}</p>
                        <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Files</p>
                      </div>
                      <div className="h-5 w-px bg-border-base/50" />
                      <div className="flex-1 text-center">
                        <p className="font-mono font-black text-xs text-text-primary leading-tight">{share}%</p>
                        <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Share</p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2.5 w-full mt-1 z-10 relative">
                      <button 
                        onClick={() => setSelectedAuthor(c)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] hover:brightness-105 border border-[#AA771C]/40 rounded-full text-[10px] font-black uppercase tracking-wider text-[#4C3306] transition-all shadow-md flex-1 cursor-pointer select-none relative overflow-hidden"
                      >
                        <div className="absolute inset-0 pointer-events-none opacity-45 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                        <User className="w-3.5 h-3.5 text-[#4C3306]/85 relative z-10" />
                        <span className="relative z-10">Profile</span>
                      </button>
                      
                      <a 
                        href={`mailto:${c.email}`}
                        className="w-9 h-9 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                        title="Email contributor"
                      >
                        <Envelope className="w-4 h-4 text-text-tertiary" />
                      </a>
                      
                      <button 
                        onClick={() => setSelectedAuthor(c)}
                        className="w-9 h-9 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                        title="View owned files"
                      >
                        <FileCode className="w-4 h-4 text-text-tertiary" />
                      </button>
                    </div>
                    
                  </CardContent>
                </Card>
              );
            })()}

            {/* 3rd Place Contributor */}
            {sortedContributors.length > 2 ? (
              (() => {
                const c = sortedContributors[2];
                const share = totalCommits > 0 ? ((c.commits / totalCommits) * 100).toFixed(1) : "0.0";
                return (
                  <Card className="order-3 md:order-3 bg-surface-1 shadow-subtle rounded-3xl border border-border-base relative overflow-hidden z-10 hover:z-30 focus-within:z-30 md:scale-95 hover:scale-[0.98] transition-all duration-200 min-h-[320px] flex flex-col justify-between self-center">
                    <CardContent className="p-5 flex flex-col items-center justify-between h-full flex-1">
                      
                      {/* Avatar with Concentric Circles (Scaled Down) */}
                      <div className="relative w-full flex flex-col items-center pt-2">
                        {/* Background Concentric Circles */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center pointer-events-none select-none z-0">
                          <div className="absolute w-22 h-22 rounded-full border border-border-base/[0.25]" />
                          <div className="absolute w-30 h-30 rounded-full border border-border-base/[0.15]" />
                          <div className="absolute w-38 h-38 rounded-full border border-border-base/[0.08]" />
                          <svg className="absolute inset-0 w-full h-full stroke-[#995C00]/[0.25] stroke-[1] fill-none" style={{ animation: "spin 40s linear infinite" }} viewBox="0 0 100 100">
                            <path d="M 50,2 A 48,48 0 0,1 98,50" strokeDasharray="3 3" />
                            <path d="M 2,50 A 48,48 0 0,1 50,98" strokeWidth="0.5" />
                          </svg>
                        </div>
                        
                        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center z-10">
                          {/* Lustrous Metallic Bronze Avatar ring with coarse noise filter */}
                          <div 
                            className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#804A00] via-[#FFB85C] via-[#995C00] via-[#FFE0B2] to-[#663300] p-[2.5px] shadow-subtle relative overflow-hidden"
                          >
                            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                            <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-black text-xl text-[#804A00] relative z-10">
                              {c.name.substring(0, 1).toUpperCase()}
                            </div>
                          </div>
                          {/* Top-Right Status Dot with Bronze Gradient */}
                          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-gradient-to-tr from-[#995C00] to-[#FFE0B2] rounded-full border-[2.5px] border-white dark:border-zinc-900 z-20 shadow-sm" />
                          {/* Bottom-Right Rank Badge */}
                          <span className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-[#804A00] to-[#663300] text-[8px] font-bold text-white px-1.5 py-0.5 rounded-md border border-white z-20 shadow-sm">#3</span>
                        </div>
                      </div>
                      
                      {/* Name & Title */}
                      <div className="text-center mt-3 z-10 relative space-y-1">
                        <h4 className="font-bold text-sm text-text-primary truncate max-w-[150px]" title={c.name}>{c.name}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-[#804A00]/10 via-[#FFE0B2]/20 to-[#995C00]/10 text-[#6E3C00] border border-[#995C00]/30 select-none">
                          Active Contributor
                        </span>
                      </div>

                      {/* Git Stats */}
                      <div className="flex items-center justify-between w-full my-4 px-2.5 py-2 bg-surface-2/45 rounded-2xl border border-border-base/30 z-10 relative">
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.commits}</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Commits</p>
                        </div>
                        <div className="h-4 w-px bg-border-base/50" />
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{c.owned_files?.length || 0}</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Files</p>
                        </div>
                        <div className="h-4 w-px bg-border-base/50" />
                        <div className="flex-1 text-center">
                          <p className="font-mono font-black text-xs text-text-primary leading-tight">{share}%</p>
                          <p className="text-[8px] font-mono text-text-tertiary mt-0.5 uppercase tracking-wider">Share</p>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 w-full mt-1 z-10 relative">
                        <button 
                          onClick={() => setSelectedAuthor(c)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#804A00] via-[#FFB85C] to-[#995C00] hover:brightness-105 border border-[#7C3F00]/40 rounded-full text-[9px] font-black uppercase tracking-wider text-[#402000] transition-all shadow-md flex-1 cursor-pointer select-none relative overflow-hidden"
                        >
                          <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ filter: "url(#metal-noise)" }} />
                          <User className="w-3 h-3 text-[#402000]/80 relative z-10" />
                          <span className="relative z-10">Profile</span>
                        </button>
                        
                        <a 
                          href={`mailto:${c.email}`}
                          className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                          title="Email contributor"
                        >
                          <Envelope className="w-3.5 h-3.5 text-text-tertiary" />
                        </a>
                        
                        <button 
                          onClick={() => setSelectedAuthor(c)}
                          className="w-8 h-8 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-strong rounded-full text-text-secondary transition-all shadow-subtle shrink-0 cursor-pointer"
                          title="View owned files"
                        >
                          <FileCode className="w-3.5 h-3.5 text-text-tertiary" />
                        </button>
                      </div>
                      
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <div className="order-3 md:order-3 h-1 md:block hidden"></div>
            )}
          </div>
        </div>
      )}

      {/* 2. Highlights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Top Committer Card */}
        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Top Committer</span>
              <p className="text-sm font-display font-black text-text-primary truncate" title={sortedContributors[0]?.name || "None"}>{sortedContributors[0]?.name || "None"}</p>
              <p className="text-[10px] text-text-tertiary font-mono">{sortedContributors[0]?.commits || 0} commits total</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0 ml-3">
              <span className="text-base">⚡</span>
            </div>
          </CardContent>
        </Card>

        {/* Broadest Footprint Card */}
        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Broadest Scope</span>
              <p className="text-sm font-display font-black text-text-primary truncate" title={mostFilesOwner?.name || "None"}>{mostFilesOwner?.name || "None"}</p>
              <p className="text-[10px] text-text-tertiary font-mono">{mostFilesOwner?.owned_files?.length || 0} files owned</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shrink-0 ml-3">
              <span className="text-base">📁</span>
            </div>
          </CardContent>
        </Card>

        {/* Concentration Share Card */}
        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Commit Concentration</span>
              <p className="text-base font-display font-black text-text-primary">
                {totalCommits > 0 && sortedContributors.length > 0
                  ? ((sortedContributors[0].commits / totalCommits) * 100).toFixed(0)
                  : "0"}%
              </p>
              <p className="text-[10px] text-text-tertiary truncate">Owned by rank #1 developer</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shrink-0 ml-3">
              <span className="text-base">🔥</span>
            </div>
          </CardContent>
        </Card>

        {/* Resiliency Status Card */}
        <Card className="bg-surface-1 shadow-sm rounded-2xl ring-1 ring-border-base/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Knowledge Resiliency</span>
              <p className={`text-sm font-display font-black ${busFactor?.bus_factor <= 1.0 ? 'text-critical' : 'text-success'}`}>
                {busFactor?.bus_factor <= 1.0 ? "Bottleneck Warning" : "Distributed Share"}
              </p>
              <p className="text-[10px] text-text-tertiary font-mono">Bus Factor = {busFactor?.bus_factor || 1}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ml-3 ${busFactor?.bus_factor <= 1.0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
              <span className="text-base">🛡️</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 3. Contributor Rankings Table */}
      <Card className="shadow-subtle ring-1 ring-border-base/50 overflow-hidden">
        <CardHeader className="border-b border-border-base bg-surface-2 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Team Contributor Rankings</CardTitle>
            <Badge variant="outline" className="rounded-lg bg-bg-base text-text-secondary border-border-strong font-mono">
              {totalContributors} Contributors
            </Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-base bg-surface-2/40 text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider select-none">
                <th className="py-3 px-5 text-center w-16">Rank</th>
                <th className="py-3 px-4">Developer</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Owned Files</th>
                <th className="py-3 px-4 text-center">Commits</th>
                <th className="py-3 px-4 text-center">Share</th>
                <th className="py-3 px-4 text-center">Risk Level</th>
                <th className="py-3 px-5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base/50">
              {sortedContributors.map((c, index) => {
                const share = totalCommits > 0 ? ((c.commits / totalCommits) * 100).toFixed(1) : "0.0";
                
                // Styling details for metallic ranks with lustre
                const rankStyles = 
                  index === 0 ? { border: "border-amber-500/10 bg-amber-500/[0.005]", dot: "bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-[#4C3306] font-black border border-[#AA771C]/50 shadow-sm" } :
                  index === 1 ? { border: "border-slate-300/20 bg-slate-300/[0.002]", dot: "bg-gradient-to-tr from-[#94A3B8] via-[#F8FAFC] to-[#94A3B8] text-[#1E293B] font-black border border-[#CBD5E1]/50 shadow-sm" } :
                  index === 2 ? { border: "border-amber-700/10 bg-amber-700/[0.002]", dot: "bg-gradient-to-tr from-[#804A00] via-[#FFB85C] to-[#995C00] text-[#402000] font-black border border-[#7C3F00]/45 shadow-sm" } :
                  { border: "border-transparent", dot: "bg-surface-3 text-text-secondary font-medium border border-border-strong/50" };
 
                const role = 
                  index === 0 ? "Lead Maintainer" :
                  c.commits > 25 ? "Core Collaborator" : 
                  "Active Contributor";
 
                const risk = c.commits > 50 ? 85 : c.commits > 20 ? 55 : 25;
                const riskLabel = getLossRiskLabel(risk);
                const riskBadge = 
                  riskLabel === "High" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                  riskLabel === "Medium" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
 
                return (
                  <tr 
                    key={c.email}
                    onClick={() => setSelectedAuthor(c)}
                    className={cn(
                      "hover:bg-surface-2 transition-colors cursor-pointer group border-l-2",
                      index === 0 ? "border-l-[#B38728]" :
                      index === 1 ? "border-l-[#94A3B8]" :
                      index === 2 ? "border-l-[#995C00]" :
                      "border-l-transparent",
                      rankStyles.border
                    )}
                  >
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center">
                        <span className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono",
                          rankStyles.dot
                        )}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-surface-3 flex items-center justify-center font-display font-bold text-xs text-text-primary border border-border-strong select-none">
                          {c.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className={cn(
                            "text-xs font-bold text-text-primary transition-colors flex items-center gap-1",
                            index === 0 ? "group-hover:text-[#B38728]" :
                            index === 1 ? "group-hover:text-text-primary" :
                            index === 2 ? "group-hover:text-[#995C00]" :
                            "group-hover:text-accent"
                          )}>
                            {c.name}
                            {index === 0 && <CheckCircle className="w-3.5 h-3.5 text-[#B38728]" weight="fill" />}
                          </p>
                          <p className="text-[10px] text-text-tertiary select-all">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap border select-none",
                        index === 0 ? "bg-gradient-to-r from-[#BF953F]/10 via-[#FBF5B7]/15 to-[#B38728]/10 text-[#8A640F] border-[#B38728]/35" :
                        index === 1 ? "bg-gradient-to-r from-[#94A3B8]/10 via-[#F8FAFC]/15 to-[#94A3B8]/10 text-[#475569] border-[#94A3B8]/30" :
                        index === 2 ? "bg-gradient-to-r from-[#804A00]/10 via-[#FFE0B2]/15 to-[#995C00]/10 text-[#6E3C00] border-[#995C00]/30" :
                        "bg-surface-3 text-text-tertiary border-border-strong/50"
                      )}>
                        {role}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-semibold text-xs text-text-primary">
                      {c.owned_files?.length || 0}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-xs text-text-primary">
                      {c.commits}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-semibold text-xs text-text-secondary">
                      {share}%
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg", riskBadge)}>
                        {riskLabel}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end text-text-tertiary group-hover:text-accent transition-colors">
                        <CaretRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contributor Profile Drawer */}
      <Drawer 
        isOpen={!!selectedAuthor} 
        onClose={() => setSelectedAuthor(null)} 
        title={selectedAuthor ? selectedAuthor.name : "Developer Profile"}
        subtitle={selectedAuthor?.email}
        avatarLetter={selectedAuthor ? selectedAuthor.name.substring(0, 1).toUpperCase() : undefined}
        width="lg"
      >
        {selectedAuthor && authorDetails && (
          <div>
            {/* Contact Info Grid Cards */}
            <div className="px-5 pt-4 pb-2">
              {/* Email — full width */}
              <div className="mb-3 rounded-xl border border-border-strong bg-surface-2 px-4 py-3 flex items-center gap-3 shadow-subtle">
                <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                  <Envelope className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Email</p>
                  <p className="text-xs font-medium text-text-primary truncate mt-0.5">{selectedAuthor.email}</p>
                </div>
              </div>

              {/* 2-col grid for the rest */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: <ShieldWarning className="w-4 h-4" />,
                    label: "Loss Risk",
                    value: getLossRiskLabel(authorDetails.riskScore),
                    color: authorDetails.riskScore > 70 ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : authorDetails.riskScore > 40 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                    valueColor: authorDetails.riskScore > 70 ? "text-rose-400" : authorDetails.riskScore > 40 ? "text-amber-400" : "text-emerald-400",
                  },
                  {
                    icon: <GitCommit className="w-4 h-4" />,
                    label: "Total Commits",
                    value: String(selectedAuthor.commits),
                    color: "text-accent bg-accent/10 border-accent/20",
                    valueColor: "text-text-primary",
                  },
                  {
                    icon: <Cpu className="w-4 h-4" />,
                    label: "Files Owned",
                    value: String(selectedAuthor.owned_files?.length || 0),
                    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                    valueColor: "text-text-primary",
                  },
                  {
                    icon: <Folder className="w-4 h-4" />,
                    label: "Role",
                    value: authorDetails.riskScore > 70 ? "Lead Maintainer" : authorDetails.riskScore > 40 ? "Core Collaborator" : "Active Contributor",
                    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                    valueColor: "text-text-primary",
                  },
                ].map(({ icon, label, value, color, valueColor }, i) => (
                  <div key={i} className="rounded-xl border border-border-strong bg-surface-2 px-3.5 py-3.5 flex flex-col gap-2.5 shadow-subtle">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">{label}</p>
                      <p className={`text-sm font-bold mt-0.5 truncate ${valueColor}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collapsible Accordion Sections */}
            <div className="pt-2 border-t border-border-subtle/40 mt-1 space-y-0">
            {[
              {
                label: "Areas of Expertise",
                content: (
                  <div className="flex flex-wrap gap-2 px-4 pt-3 pb-4">
                    {authorDetails.expertise.map((exp: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="px-3 py-1 bg-surface-1 rounded-lg text-xs">
                        {exp}
                      </Badge>
                    ))}
                  </div>
                ),
              },
              {
                label: "Commit Timeline",
                content: (
                  <div className="px-4 pt-3 pb-4 space-y-2">
                    {authorDetails.commitTimeline.map((entry: { month: string; commits: number }, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-text-tertiary w-8 shrink-0">{entry.month}</span>
                        <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/70 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (entry.commits / (selectedAuthor.commits || 1)) * 100 * 3)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-text-secondary w-6 text-right shrink-0">{entry.commits}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(({ label, content }, i) => {
              const key = `accordion-${i}`;
              const isExpanded = expandedFolders[key] === true;
              return (
                <div key={i} className="px-5 pb-3 last:pb-5">
                  <div className="rounded-xl border border-border-base bg-surface-1 overflow-hidden">
                    <button
                      onClick={() => toggleFolder(key)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-text-primary hover:bg-surface-2/60 transition-colors"
                    >
                      {label}
                      <CaretDown className={cn("w-4 h-4 text-text-tertiary transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border-subtle/50 bg-surface-2/30">
                        {content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Primary Owned Files Section */}
            <div className="px-5 pt-2 pb-5 border-t border-border-subtle/40">
              <h5 className="text-sm font-bold text-text-primary mb-3 pt-3">Primary Owned Files</h5>

              {/* Files list */}
              <div className="space-y-2.5">
                {(() => {
                  const filesList = authorDetails.mockFiles || [];
                  if (filesList.length === 0) {
                    return (
                      <div className="py-6 text-center text-text-tertiary text-xs italic">
                        No owned files found.
                      </div>
                    );
                  }
                  const folderGroups = getFolderGroups(filesList);
                  return Object.keys(folderGroups).sort().map(folder => {
                    const isOpen = expandedFolders[folder] !== false;
                    const folderFiles = folderGroups[folder];
                    return (
                      <div key={folder} className="rounded-xl overflow-hidden border border-border-base bg-surface-2/30">
                        <button
                          onClick={() => toggleFolder(folder)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold bg-surface-2/60 hover:bg-surface-3 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Folder className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="font-mono text-text-primary truncate">{folder}</span>
                            <span className="text-[9px] font-bold bg-surface-3 border border-border-base rounded px-1.5 py-0.5 text-text-tertiary shrink-0">
                              {folderFiles.length}
                            </span>
                          </div>
                          <CaretDown className={cn("w-3.5 h-3.5 text-text-tertiary shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="divide-y divide-border-subtle/30 bg-surface-1">
                            {folderFiles.map((fileName, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 py-2 px-3.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors">
                                <FileCode className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                                <span className="font-mono truncate">{fileName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
}
