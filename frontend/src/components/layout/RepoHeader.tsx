import React, { useState, useEffect, useRef } from "react";
import { GitBranch, Clock, Database, Calendar, Users, FileCode, CheckCircle, User, CaretDown, ArrowsCounterClockwise } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { getRepositoryBranches, switchRepositoryBranch } from "@/utils/api";
import { cn } from "@/lib/utils";

interface RepoHeaderProps {
  dashboard: any;
  contributors?: any[];
}

const extensionMap: Record<string, string> = {
  ".js": "JavaScript",
  ".jsx": "React (JS)",
  ".ts": "TypeScript",
  ".tsx": "React (TS)",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".java": "Java",
  ".cpp": "C++",
  ".c": "C",
  ".h": "C/C++ Header",
  ".cs": "C#",
  ".php": "PHP",
  ".html": "HTML",
  ".css": "CSS",
  ".sh": "Shell Script",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".json": "JSON",
  ".md": "Markdown",
  ".sql": "SQL",
};

const getFriendlyLanguage = (ext: string) => {
  if (!ext) return "";
  const cleanExt = ext.toLowerCase().trim();
  if (extensionMap[cleanExt]) return extensionMap[cleanExt];
  if (cleanExt.startsWith(".")) {
    return cleanExt.slice(1).toUpperCase();
  }
  return cleanExt.charAt(0).toUpperCase() + cleanExt.slice(1);
};

export function RepoHeader({ dashboard, contributors = [] }: RepoHeaderProps) {
  const repo = dashboard?.repository || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repo?.id) {
      getRepositoryBranches(repo.id)
        .then(data => {
          if (data?.branches) {
            setBranches(data.branches);
          }
        })
        .catch(err => console.error("Error fetching branches:", err));
    }
  }, [repo?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === (repo.branch || "main")) {
      setIsDropdownOpen(false);
      return;
    }
    setIsSwitching(true);
    setIsDropdownOpen(false);
    try {
      await switchRepositoryBranch(repo.id, branchName);
      window.location.search = `?repoId=${repo.id}`;
    } catch (err: any) {
      setIsSwitching(false);
      console.error("Error switching branch:", err);
      alert(`Failed to switch branch: ${err.message || err}`);
    }
  };
  
  // Extract owner from repo_url
  const getOwner = (url?: string) => {
    if (!url) return "";
    const clean = url.replace("git@github.com:", "https://github.com/").replace(/\.git$/, "");
    try {
      const path = new URL(clean).pathname;
      const parts = path.split("/").filter(Boolean);
      return parts[0] || "";
    } catch (e) {
      const match = url.match(/github\.com[\/:]([^\/]+)/i);
      return match ? match[1] : "";
    }
  };
  const ownerName = getOwner(repo.repo_url);
  const contributorNames = contributors.map(c => c.name).filter(Boolean);

  const getContributorsText = () => {
    if (contributorNames.length === 0) return "None";
    if (contributorNames.length === 1) return contributorNames[0];
    if (contributorNames.length === 2) return `${contributorNames[0]}, ${contributorNames[1]}`;
    return `${contributorNames[0]}, ${contributorNames[1]} +${contributorNames.length - 2}`;
  };

  const getLanguagesText = () => {
    const topLangs = dashboard?.top_languages || [];
    if (topLangs.length === 0) return repo.language || "TypeScript";
    
    const resolvedNames = topLangs
      .map((l: any) => getFriendlyLanguage(l.language))
      .filter((val: string, index: number, self: string[]) => val && self.indexOf(val) === index);
      
    if (resolvedNames.length === 0) return repo.language || "TypeScript";
    if (resolvedNames.length <= 3) return resolvedNames.join(", ");
    return `${resolvedNames.slice(0, 3).join(", ")} +${resolvedNames.length - 3}`;
  };

  const getLanguagesTitle = () => {
    const topLangs = dashboard?.top_languages || [];
    return topLangs
      .map((l: any) => `${getFriendlyLanguage(l.language)} (${l.count} files)`)
      .join("\n");
  };

  const stats = [
    { label: "Total Commits", value: dashboard?.total_commits || 0, icon: GitBranch },
    { label: "Total Files", value: dashboard?.total_files || 0, icon: FileCode },
    { label: "Contributors", value: dashboard?.total_contributors || 0, icon: Users },
    { label: "Repository Size", value: repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : "1.2 MB", icon: Database }
  ];

  return (
    <section className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8 border-b border-border-strong">
        
        {/* Repo Title & Meta */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header Description Info */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block">Repository Name</span>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">
                {repo.name || "Git Repository"}
              </h1>
              <Badge variant="success" className="px-3 py-1 text-[11px] rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 mr-1 text-success inline" /> Analyzed
              </Badge>

              {/* Branch Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  disabled={isSwitching}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-3 py-1.5 text-[11px] rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-strong text-text-primary font-mono flex items-center gap-1.5 select-none transition-colors cursor-pointer shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSwitching ? (
                    <ArrowsCounterClockwise className="w-3 h-3 text-text-secondary animate-spin" />
                  ) : (
                    <GitBranch className="w-3 h-3 text-text-secondary" />
                  )}
                  <span>{repo.branch || "main"}</span>
                  <CaretDown className="w-3 h-3 text-text-tertiary" />
                </button>

                {isDropdownOpen && branches.length > 0 && (
                  <div className="absolute left-0 mt-1.5 w-48 bg-surface-1 border border-border-strong rounded-xl shadow-floating z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <p className="px-3 py-1 text-[9px] uppercase font-mono font-bold text-text-tertiary border-b border-border-subtle mb-1">
                      Switch Branch
                    </p>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {branches.map((b) => (
                        <button
                          key={b}
                          onClick={() => handleSwitchBranch(b)}
                          className={cn(
                            "w-full px-3 py-2 text-[11px] font-mono text-left transition-colors flex items-center justify-between hover:bg-surface-2",
                            b === (repo.branch || "main") 
                              ? "text-accent bg-accent-subtle/40 font-bold" 
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          <span className="truncate">{b}</span>
                          {b === (repo.branch || "main") && (
                            <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-text-secondary font-medium max-w-xl">
              {repo.description || "Comprehensive architectural code reviews, risk analysis, and technical debt visualization for engineering teams."}
            </p>
          </div>

          <div className="border-t border-border-base/50 pt-4 w-full">
            <div className="flex flex-wrap items-center gap-6">
              {/* Owner */}
              {ownerName && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/5 flex items-center justify-center text-accent border border-accent/10 shrink-0">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-mono font-bold text-text-tertiary">Repository Owner</p>
                    <p className="text-xs font-bold text-text-primary">@{ownerName}</p>
                  </div>
                </div>
              )}

              {ownerName && <div className="h-6 w-px bg-border-base hidden sm:block"></div>}

              {/* Contributors */}
              {contributorNames.length > 0 && (
                <div 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-3 max-w-[280px] cursor-pointer hover:bg-surface-2 p-1.5 rounded-xl transition-all duration-200"
                  title="Click to view all contributors"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-500/5 flex items-center justify-center text-indigo-500 border border-indigo-500/10 shrink-0">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-mono font-bold text-text-tertiary flex items-center gap-1.5">
                      Contributors 
                      <span className="text-[8px] font-sans font-semibold bg-indigo-500/10 text-indigo-500 px-1 rounded hover:bg-indigo-500/15">View List</span>
                    </p>
                    <p className="text-xs font-bold text-text-primary truncate">
                      {getContributorsText()}
                    </p>
                  </div>
                </div>
              )}

              {contributorNames.length > 0 && <div className="h-6 w-px bg-border-base hidden sm:block"></div>}

              {/* Languages */}
              <div className="flex items-center gap-3" title={getLanguagesTitle()}>
                <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500 border border-emerald-500/10 shrink-0">
                  <FileCode className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-mono font-bold text-text-tertiary">Languages</p>
                  <p className="text-xs font-bold text-text-primary">{getLanguagesText()}</p>
                </div>
              </div>

              <div className="h-6.5 w-px bg-border-base hidden sm:block"></div>

              {/* Last Analyzed */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/5 flex items-center justify-center text-rose-500 border border-rose-500/10 shrink-0">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-mono font-bold text-text-tertiary">Last Analyzed</p>
                  <p className="text-xs font-bold text-text-primary">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
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

      {/* Contributors Detail Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
          ></div>
          
          {/* Modal Content container */}
          <div className="bg-surface-1 border border-border-strong rounded-[20px] shadow-floating max-w-sm w-full overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-accent" />
                <h3 className="font-display font-bold text-text-primary text-sm">
                  Repository Contributors
                </h3>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-surface-3">
                {contributors.length} active
              </Badge>
            </div>
            
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2.5 custom-scrollbar">
              {contributors.map((c, idx) => {
                const initial = c.name ? c.name.substring(0, 2).toUpperCase() : "DV";
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-surface-2/40 border border-border-base rounded-xl hover:bg-surface-2/70 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center text-accent font-bold font-display text-[10px] shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-text-primary truncate">{c.name}</p>
                        {c.email && (
                          <p className="text-[10px] text-text-tertiary truncate font-mono">{c.email}</p>
                        )}
                      </div>
                    </div>
                    {c.commits !== undefined && (
                      <span className="text-[9px] font-mono font-bold bg-surface-3 px-1.5 py-0.5 rounded-md border border-border-base shrink-0 text-text-secondary">
                        {c.commits} commits
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="p-3 border-t border-border-subtle bg-surface-2 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-accent text-white font-bold text-[11px] hover:bg-accent-hover transition-colors shadow-subtle"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
