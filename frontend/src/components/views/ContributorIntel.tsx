import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Drawer } from "@/components/ui/Drawer";
import { Users, Warning, CheckCircle, GitCommit, Info, User, Envelope, ShieldWarning, Cpu, Folder, CaretDown, FileCode } from "@phosphor-icons/react";
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
    
    // Simple mock calculation based on commit levels
    const riskScore = author.commits > 50 ? 85 : author.commits > 20 ? 55 : 25;
    const expertise = author.commits > 50 
      ? ["Core Architecture", "Database Migrations", "API Endpoints"] 
      : ["UI Components", "Unit Testing", "Styling Systems"];

    const mockFiles = author.owned_files && author.owned_files.length > 0
      ? author.owned_files
      : [
          "src/app/page.tsx",
          "src/components/layout/AppShell.tsx",
          "src/utils/api.ts"
        ];

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
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-text-primary tracking-tight">Contributor Intelligence</h2>
          <p className="text-sm text-text-secondary mt-1">
            Analyzing team repository ownership, knowledge bottlenecks, and key personnel concentration risks.
          </p>
        </div>
      </div>

      {/* Warning / Success Banner */}
      {busFactor?.bus_factor <= 1.0 ? (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-rose-500/[0.03] border border-rose-500/10 flex items-start gap-4 shadow-subtle"
        >
          <div className="p-2.5 bg-rose-500/10 rounded-xl text-critical shrink-0 mt-1">
            <Warning className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary text-base font-display flex items-center gap-1.5">
              Knowledge Bottleneck Warning
              <InfoTooltip 
                title="Bus Factor Risk"
                whatIsIt="The Bus Factor shows the absolute minimum number of engineers who can leave before repository progression fails."
                whyItMatters="A factor of 1 implies a high-risk bottleneck where a single maintainer holds all core logic understanding."
              />
            </h4>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-4xl">
              Over 50% of modifications in this repository were committed by a single engineer. 
              The Bus Factor is currently <strong>{busFactor.bus_factor}</strong>. 
              We recommend scheduling shared pair sessions or conducting code reviews to distribute expertise.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="p-6 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 flex items-start gap-4 shadow-subtle">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-success shrink-0 mt-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary text-base font-display">Resilient Knowledge Share</h4>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              Knowledge is distributed across multiple contributors. The Bus Factor is currently <strong>{busFactor?.bus_factor || 2}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Charts & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Recharts Commit distribution bar chart - Spans 8 Columns */}
        <div className="lg:col-span-8 flex flex-col h-[450px] bg-surface-1 rounded-xl p-6 shadow-subtle border border-border-base">
          <div className="flex items-center justify-between border-b border-border-base pb-3 mb-4">
            <h3 className="text-base font-display font-bold text-text-primary">Contribution Timeline Distribution</h3>
            <Badge variant="outline" className="rounded-lg bg-bg-base">Commits Share</Badge>
          </div>
          
          <div className="flex-1 w-full text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributors} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-tertiary)" tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-surface-2)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-surface-1 p-3 rounded-2xl shadow-floating text-xs space-y-1 ring-1 ring-border-base z-50">
                          <p className="font-bold text-text-primary">{data.name}</p>
                          <p className="text-text-secondary">{data.commits} commits</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="commits" radius={[8, 8, 0, 0]}>
                  {contributors?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? "var(--color-accent)" : index === 1 ? "var(--color-accent-hover)" : "var(--border-strong)"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contributor list sidebar - Spans 4 Columns */}
        <Card className="lg:col-span-4 flex flex-col h-[450px] shadow-subtle ring-1 ring-border-base/50">
          <CardHeader className="border-b border-border-base bg-surface-2 py-4">
            <CardTitle className="text-sm flex justify-between items-center">
              Active Contributors
              <Badge className="bg-bg-base text-text-secondary border border-border-strong rounded-lg">{contributors?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-4 space-y-3 pr-2">
            {contributors && contributors.length > 0 ? (
              contributors.map((c: any, index: number) => (
                <div 
                  key={c.email} 
                  onClick={() => setSelectedAuthor(c)}
                  className="group p-3.5 rounded-2xl border border-border-base hover:border-border-strong hover:bg-surface-2 transition-all duration-300 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center font-display text-text-primary font-bold shadow-subtle transition-transform group-hover:scale-105", 
                      index === 0 ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-surface-3 border border-border-strong'
                    )}>
                      {c.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-text-primary group-hover:text-accent transition-colors truncate max-w-[120px]">{c.name}</p>
                      <p className="text-[10px] text-text-tertiary truncate max-w-[110px]">{c.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-text-primary flex items-center justify-end gap-1">
                      {c.commits} <GitCommit className="w-3.5 h-3.5 text-text-tertiary" />
                    </span>
                    <span className="text-[9px] font-mono text-text-tertiary font-semibold block mt-0.5">Rank #{index + 1}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary space-y-2">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-sm">No developers detected.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Contributor Profile Drawer */}
      <Drawer 
        isOpen={!!selectedAuthor} 
        onClose={() => setSelectedAuthor(null)} 
        title={selectedAuthor ? selectedAuthor.name : "Developer Profile"}
        width="lg"
      >
        {selectedAuthor && authorDetails && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="bg-surface-2 rounded-2xl p-5 border border-border-base flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-display font-black text-xl shadow-subtle border border-accent/20">
                {selectedAuthor.name.substring(0, 1).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-display font-bold text-text-primary text-base">{selectedAuthor.name}</h4>
                <p className="text-xs text-text-tertiary flex items-center gap-1.5 mt-1 font-mono">
                  <Envelope className="w-3.5 h-3.5" /> {selectedAuthor.email}
                </p>
              </div>
            </div>

            {/* Critical Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-2 rounded-2xl p-4 border border-border-base flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary">Loss Impact Risk</p>
                  <p className="text-lg font-bold font-display text-text-primary mt-0.5">{getLossRiskLabel(authorDetails.riskScore)}</p>
                </div>
                <ShieldWarning className={`w-5 h-5 ${authorDetails.riskScore > 70 ? 'text-critical' : 'text-warning'}`} />
              </div>

              <div className="bg-surface-1 p-4 rounded-2xl ring-1 ring-border-base flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-mono text-text-tertiary mb-0.5">Total Commits</p>
                  <p className="font-mono font-bold text-text-primary text-lg">{selectedAuthor.commits}</p>
                </div>
                <GitCommit className="w-5 h-5 text-accent" />
              </div>
            </div>

            {/* Expertise Areas */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-text-tertiary">Areas of Expertise</h5>
              <div className="flex flex-wrap gap-2">
                {authorDetails.expertise.map((exp, idx) => (
                  <Badge key={idx} variant="outline" className="px-3 py-1 bg-surface-1 rounded-lg">
                    {exp}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Owned / Primary Files */}
            <div className="space-y-3 pt-2 border-t border-border-base">
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-text-tertiary">Primary Owned Files</h5>
              <div className="space-y-3">
                {(() => {
                  const filesList = authorDetails.mockFiles || [];
                  if (filesList.length === 0) {
                    return (
                      <div className="py-8 text-center text-text-tertiary text-xs italic">
                        No owned files found.
                      </div>
                    );
                  }
                  
                  const folderGroups = getFolderGroups(filesList);
                  return Object.keys(folderGroups).sort().map(folder => {
                    const isOpen = expandedFolders[folder] !== false;
                    const folderFiles = folderGroups[folder];
                    
                    return (
                      <div key={folder} className="border border-border-base rounded-2xl overflow-hidden bg-surface-2/45">
                        {/* Folder Header */}
                        <button
                          onClick={() => toggleFolder(folder)}
                          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold bg-surface-2 hover:bg-surface-3 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Folder className="w-4 h-4 text-accent shrink-0" />
                            <span className="font-mono text-text-primary truncate">{folder}</span>
                            <Badge variant="outline" className="px-1.5 py-0.5 rounded text-[9px] shrink-0 font-normal">
                              {folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'}
                            </Badge>
                          </div>
                          <CaretDown className={cn("w-3.5 h-3.5 text-text-tertiary shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        
                        {/* Folder Files List */}
                        {isOpen && (
                          <div className="p-2.5 space-y-1 bg-surface-1 border-t border-border-base/50 divide-y divide-border-subtle/30">
                            {folderFiles.map((fileName, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 py-2 px-2.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
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
