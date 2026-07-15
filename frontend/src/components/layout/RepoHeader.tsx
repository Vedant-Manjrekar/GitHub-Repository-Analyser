import React, { useState, useEffect, useRef } from "react";
import {
  GitBranch, Database, Calendar, Users, FileCode, CheckCircle, User,
  CaretDown, ArrowsCounterClockwise, WarningCircle
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { getRepositoryBranches, switchRepositoryBranch, restartAnalysis } from "@/utils/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface RepoHeaderProps {
  dashboard: any;
  contributors?: any[];
}

const extensionMap: Record<string, string> = {
  ".js": "JavaScript", ".jsx": "React (JS)", ".ts": "TypeScript", ".tsx": "React (TS)",
  ".py": "Python", ".go": "Go", ".rs": "Rust", ".rb": "Ruby", ".java": "Java",
  ".cpp": "C++", ".c": "C", ".h": "C/C++ Header", ".cs": "C#", ".php": "PHP",
  ".html": "HTML", ".css": "CSS", ".sh": "Shell Script", ".yml": "YAML",
  ".yaml": "YAML", ".json": "JSON", ".md": "Markdown", ".sql": "SQL",
};

const getFriendlyLanguage = (ext: string) => {
  if (!ext) return "";
  const cleanExt = ext.toLowerCase().trim();
  if (extensionMap[cleanExt]) return extensionMap[cleanExt];
  if (cleanExt.startsWith(".")) return cleanExt.slice(1).toUpperCase();
  return cleanExt.charAt(0).toUpperCase() + cleanExt.slice(1);
};

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // Apple-style ease

const formatLastAnalyzed = (dateStr?: string) => {
  if (!dateStr) return "Never";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export function RepoHeader({ dashboard, contributors = [] }: RepoHeaderProps) {
  const repo = dashboard?.repository || {};
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReanalyzing(true);
    try {
      await restartAnalysis(repo.id);
      window.location.search = `?repoId=${repo.id}`;
    } catch (err: any) {
      setIsReanalyzing(false);
      alert(`Failed to restart analysis: ${err.message || err}`);
    }
  };

  const lastAnalyzedDate = repo.last_analyzed_at || repo.created_at;
  const isOutdated = repo.repo_url && lastAnalyzedDate
    ? (new Date().getTime() - new Date(lastAnalyzedDate).getTime()) > 3 * 24 * 60 * 60 * 1000
    : false;

  useEffect(() => {
    if (repo?.id) {
      getRepositoryBranches(repo.id)
        .then(data => { if (data?.branches) setBranches(data.branches); })
        .catch(err => console.error("Error fetching branches:", err));
    }
  }, [repo?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === (repo.branch || "main")) { setIsDropdownOpen(false); return; }
    setIsSwitching(true);
    setIsDropdownOpen(false);
    try {
      await switchRepositoryBranch(repo.id, branchName);
      window.location.search = `?repoId=${repo.id}`;
    } catch (err: any) {
      setIsSwitching(false);
      alert(`Failed to switch branch: ${err.message || err}`);
    }
  };

  const getOwner = (url?: string) => {
    if (!url) return "";
    const clean = url.replace("git@github.com:", "https://github.com/").replace(/\.git$/, "");
    try {
      const parts = new URL(clean).pathname.split("/").filter(Boolean);
      return parts[0] || "";
    } catch {
      return url.match(/github\.com[\/:]([^\/]+)/i)?.[1] ?? "";
    }
  };

  const ownerName = getOwner(repo.repo_url);
  const contributorNames = contributors.map(c => c.name).filter(Boolean);

  const getContributorsText = () => {
    if (!contributorNames.length) return "None";
    if (contributorNames.length === 1) return contributorNames[0];
    if (contributorNames.length === 2) return `${contributorNames[0]}, ${contributorNames[1]}`;
    return `${contributorNames[0]}, ${contributorNames[1]} +${contributorNames.length - 2}`;
  };

  const getLanguagesText = () => {
    const topLangs = dashboard?.top_languages || [];
    if (!topLangs.length) return repo.language || "TypeScript";
    const names = topLangs
      .map((l: any) => getFriendlyLanguage(l.language))
      .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i);
    if (!names.length) return repo.language || "TypeScript";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
  };

  const getLanguagesTitle = () =>
    (dashboard?.top_languages || [])
      .map((l: any) => `${getFriendlyLanguage(l.language)} (${l.count} files)`)
      .join("\n");

  const stats = [
    { label: "Total Commits",    value: dashboard?.total_commits || 0,     icon: GitBranch },
    { label: "Total Files",      value: dashboard?.total_files || 0,       icon: FileCode },
    { label: "Contributors",     value: dashboard?.total_contributors || 0, icon: Users },
    { label: "Repository Size",  value: repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : "1.2 MB", icon: Database },
  ];

  /* ── shared branch dropdown ───────────────────────────────── */
  const BranchMenu = ({ align = "left" }: { align?: "left" | "right" }) =>
    isDropdownOpen && branches.length > 0 ? (
      <motion.div
        key="branch-menu"
        initial={{ opacity: 0, y: -4, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.97 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "absolute top-full mt-2 w-48 bg-[#1a1d21] border border-white/10 rounded-xl shadow-floating z-50 py-1.5 overflow-hidden text-left",
          align === "right" ? "right-0" : "left-0"
        )}
      >
        <p className="px-3 py-1 text-[9px] uppercase font-mono font-bold text-zinc-400 border-b border-white/5 mb-1">
          Switch Branch
        </p>
        <div className="max-h-48 overflow-y-auto custom-scrollbar">
          {branches.map(b => (
            <button
              key={b}
              onClick={e => { e.stopPropagation(); handleSwitchBranch(b); }}
              className={cn(
                "w-full px-3 py-2 text-[10px] font-mono text-left flex items-center justify-between hover:bg-white/5 transition-colors",
                b === (repo.branch || "main") ? "text-accent bg-accent/10 font-bold" : "text-zinc-300"
              )}
            >
              <span className="truncate">{b}</span>
              {b === (repo.branch || "main") && <CheckCircle className="w-3 h-3 text-accent shrink-0" />}
            </button>
          ))}
        </div>
      </motion.div>
    ) : null;

  return (
    <section className="mb-8">
      {/*
        ── Dynamic Island ─────────────────────────────────────────
        Shape morphing: CSS inline transition on borderRadius + padding.
        Height morphing: CSS grid-template-rows 0fr → 1fr trick.
        Content crossfade: simple CSS opacity transition.
        No Framer Motion layout — avoids per-frame layout recalc.
      */}
      <motion.div
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        className="bg-[#212529] border border-white/10 text-white shadow-floating w-full cursor-pointer select-none rounded-[28px] relative"
        animate={{
          width: "100%",
          height: isExpanded ? "auto" : "56px",
          paddingTop: isExpanded ? 32 : 0,
          paddingBottom: isExpanded ? 32 : 0,
          paddingLeft: isExpanded ? 32 : 24,
          paddingRight: isExpanded ? 32 : 24,
        }}
        transition={{
          height: {
            type: "spring",
            stiffness: 140,
            damping: 20,
            mass: 1.1,
          },
          paddingTop: {
            type: "spring",
            stiffness: 140,
            damping: 20,
          },
          paddingBottom: {
            type: "spring",
            stiffness: 140,
            damping: 20,
          },
          paddingLeft: {
            type: "spring",
            stiffness: 160,
            damping: 22,
          },
          paddingRight: {
            type: "spring",
            stiffness: 160,
            damping: 22,
          },
        }}
        style={{
          borderRadius: 28,
          overflow: isExpanded || isDropdownOpen ? "visible" : "hidden",
        }}
      >
        {/* ── Compact bar — always in DOM, fades out ─────────── */}
        <motion.div
          animate={{
            opacity: isExpanded ? 0 : 1,
            pointerEvents: isExpanded ? "none" : "auto",
          }}
          transition={{
            duration: 0.15,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 24,
            right: 24,
          }}
          className="flex items-center justify-between"
        >
          {/* Left cluster */}
          <div className="flex items-center gap-4 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <h1 className="text-base sm:text-lg font-display font-black tracking-tight truncate max-w-[240px] sm:max-w-[400px] text-white">
              {repo.name || "Git Repository"}
            </h1>

            <Badge className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 uppercase font-mono font-bold">
              Analyzed
            </Badge>

            <span
              onClick={e => { e.stopPropagation(); setIsDropdownOpen(v => !v); }}
              className="relative px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-mono font-bold flex items-center gap-2 text-white"
            >
              <GitBranch className="w-3 h-3 text-zinc-400" />
              <span>{repo.branch || "main"}</span>
              <CaretDown className="w-2.5 h-2.5 text-zinc-400" />
              <AnimatePresence><BranchMenu /></AnimatePresence>
            </span>
          </div>

          {/* Right stats */}
          <div className="flex items-center gap-6 shrink-0 font-mono text-xs text-zinc-400">
            <span className="hidden sm:inline">
              Commits: <strong className="text-white text-sm">{dashboard?.total_commits || 0}</strong>
            </span>
            <span className="hidden sm:inline">
              Files: <strong className="text-white text-sm">{dashboard?.total_files || 0}</strong>
            </span>
            <span>
              Size: <strong className="text-white text-sm">
                {repo.size ? `${(repo.size / 1024).toFixed(1)} MB` : "1.2 MB"}
              </strong>
            </span>
            <div
              className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 text-white shrink-0 transition-colors"
            >
              <CaretDown className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* ── Expanded panel ── */}
        <div
          style={{
            pointerEvents: isExpanded ? "auto" : "none",
          }}
          className="w-full"
        >
          {/* Inner opacity wrapper — delayed fade-in */}
          <motion.div
            animate={{
              opacity: isExpanded ? 1 : 0,
              y: isExpanded ? 0 : 16,
            }}
            transition={{
              opacity: { duration: 0.2 },
              y: { type: "spring", stiffness: 140, damping: 20 },
            }}
            className="space-y-6"
          >
            {/* Header row */}
            <div
              onClick={() => setIsExpanded(false)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Repository Name
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-display font-black tracking-tight text-white">
                    {repo.name || "Git Repository"}
                  </h1>
                  <Badge className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 uppercase font-mono font-bold">
                    Analyzed
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative" ref={dropdownRef}>
                  <button
                    disabled={isSwitching}
                    onClick={e => { e.stopPropagation(); setIsDropdownOpen(v => !v); }}
                    className="px-3 py-1.5 text-[10px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSwitching
                      ? <ArrowsCounterClockwise className="w-3 h-3 text-zinc-400 animate-spin" />
                      : <GitBranch className="w-3 h-3 text-zinc-400" />}
                    <span>{repo.branch || "main"}</span>
                    <CaretDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  <AnimatePresence><BranchMenu align="right" /></AnimatePresence>
                </div>

                {repo.repo_url && (
                  <button
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="px-3 py-1.5 text-[10px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ArrowsCounterClockwise className={cn("w-3.5 h-3.5 text-zinc-400", isReanalyzing && "animate-spin")} />
                    <span>Refresh</span>
                  </button>
                )}

                <button
                  onClick={e => { e.stopPropagation(); setIsExpanded(false); }}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                >
                  <CaretDown className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>

            {/* Description */}
            {repo.description && (
              <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
                {repo.description}
              </p>
            )}

            {/* Metadata row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-5 border-t border-white/5">
              {ownerName && (
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider mb-0.5">Repository Owner</p>
                    <p className="text-sm font-bold text-white">@{ownerName}</p>
                  </div>
                </div>
              )}

              {contributorNames.length > 0 && (
                <div
                  onClick={e => { e.stopPropagation(); setIsModalOpen(true); }}
                  className="flex items-start gap-2.5 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all"
                >
                  <Users className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 mb-0.5">
                      Contributors
                      <span className="font-sans font-semibold bg-white/10 text-white px-1.5 py-0.5 rounded text-[8px] normal-case">
                        View List
                      </span>
                    </p>
                    <p className="text-sm font-bold text-white truncate">{getContributorsText()}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5" title={getLanguagesTitle()}>
                <FileCode className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider mb-0.5">Languages</p>
                  <p className="text-sm font-bold text-white truncate">{getLanguagesText()}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider mb-0.5">Last Analyzed</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm font-bold text-white" title={repo.last_analyzed_at || repo.created_at}>
                      {formatLastAnalyzed(repo.last_analyzed_at || repo.created_at)}
                    </p>
                    {repo.repo_url && (
                      <button
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        title="Re-analyze repository"
                      >
                        <ArrowsCounterClockwise className={cn("w-3.5 h-3.5", isReanalyzing && "animate-spin")} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5 border-t border-white/5">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 select-none">
                  <stat.icon className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider mb-0.5">{stat.label}</p>
                    <p className="text-lg font-display font-black text-white">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Outdated warning banner */}
      {isOutdated && (
        <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-500/90 text-xs select-none">
          <WarningCircle className="w-4.5 h-4.5 shrink-0 text-amber-500 animate-pulse-slow" />
          <span>
            Analysis may be outdated. Repository contents may have changed since the last analysis.
          </span>
        </div>
      )}

      {/* ── Contributors Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          >
            <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="bg-surface-1 border border-border-strong rounded-[20px] shadow-floating max-w-sm w-full overflow-hidden z-10 flex flex-col"
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-accent" />
                  <h3 className="font-display font-bold text-text-primary text-sm">Repository Contributors</h3>
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
                          {c.email && <p className="text-[10px] text-text-tertiary truncate font-mono">{c.email}</p>}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
