"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, CloudArrowDown, ChartLine, Warning, ArrowsCounterClockwise, CaretRight, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

// Backend APIs
import {
  cloneRepository,
  uploadRepositoryZip,
  getAnalysisStatus,
  getDashboardData,
  getComplexityData,
  getChurnData,
  getHotspotsData,
  getBusFactorData,
  getContributorsData,
  getTechnicalDebtData
} from "../utils/api";

// Layout & UI
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

// Views
import { HeroDashboard } from "@/components/views/HeroDashboard";
import { RiskMap } from "@/components/views/RiskMap";
import { TechDebtVisualizer } from "@/components/views/TechDebtVisualizer";
import { ContributorIntel } from "@/components/views/ContributorIntel";
import { VSCodeExplorer } from "@/components/views/VSCodeExplorer";
import { AuthModal } from "@/components/ui/AuthModal";
import { AuthLock } from "@/components/ui/AuthLock";


type ViewMode = "landing" | "loading" | "dashboard";
type TabMode = "overview" | "hotspots" | "debt" | "contributors" | "explorer";

export default function Home() {
  const [view, setView] = useState<ViewMode>("landing");
  const [tab, setTab] = useState<TabMode>("overview");
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [recentRepos, setRecentRepos] = useState<Array<{id: string, name: string, date: string}>>([]);
  
  const [cloneName, setCloneName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [zipName, setZipName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<string>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Data State
  const [dashboard, setDashboard] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [busFactor, setBusFactor] = useState<any>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [techDebt, setTechDebt] = useState<any>(null);
  const [complexityFiles, setComplexityFiles] = useState<any[]>([]);

  // Authentication State
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recent_repositories");
    if (saved) {
      try {
        setRecentRepos(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    const savedUser = localStorage.getItem("current_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
    
    // Sync repoId query param
    const params = new URLSearchParams(window.location.search);
    const repoId = params.get("repoId");
    if (repoId) {
      setSelectedRepoId(repoId);
      setView("loading");
      setStatus("pending");
    }
  }, []);

  const saveToRecents = (id: string, name: string) => {
    const list = [...recentRepos];
    const filtered = list.filter(r => r.id !== id);
    const updated = [{ id, name, date: new Date().toLocaleDateString() }, ...filtered].slice(0, 5);
    setRecentRepos(updated);
    localStorage.setItem("recent_repositories", JSON.stringify(updated));
  };

  useEffect(() => {
    if (view !== "loading" || !selectedRepoId) return;

    let timer: NodeJS.Timeout;
    const checkStatus = async () => {
      try {
        const res = await getAnalysisStatus(selectedRepoId);
        setStatus(res.status);
        
        if (res.status === "completed") {
          await loadDashboard(selectedRepoId);
          saveToRecents(selectedRepoId, cloneName || zipName || "Repository");
          setView("dashboard");
        } else if (res.status === "failed") {
          setErrorMessage(res.error_message || "Analysis pipeline execution encountered an error.");
        } else {
          timer = setTimeout(checkStatus, 1500);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Connection to backend service lost.");
      }
    };
    checkStatus();
    return () => { if (timer) clearTimeout(timer); };
  }, [view, selectedRepoId]);

  const loadDashboard = async (repoId: string) => {
    try {
      const [dash, hot, bus, contrib, debt, comp] = await Promise.all([
        getDashboardData(repoId),
        getHotspotsData(repoId),
        getBusFactorData(repoId),
        getContributorsData(repoId),
        getTechnicalDebtData(repoId),
        getComplexityData(repoId)
      ]);
      setDashboard(dash);
      setHotspots(hot);
      setBusFactor(bus);
      setContributors(contrib);
      setTechDebt(debt);
      setComplexityFiles(comp);
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.message || "Failed to load dashboard metrics.");
    }
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneUrl) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Extract repository name from URL
      let cleanUrl = cloneUrl.trim().replace(/\/+$/, "");
      if (cleanUrl.endsWith(".git")) {
        cleanUrl = cleanUrl.slice(0, -4);
      }
      const parts = cleanUrl.split("/");
      const repoName = parts[parts.length - 1] || "repository";
      
      setCloneName(repoName);

      const res = await cloneRepository(repoName, cloneUrl);
      setSelectedRepoId(res.id);
      
      const url = new URL(window.location.href);
      url.searchParams.set("repoId", res.id);
      window.history.pushState({}, "", url.toString());

      setStatus(res.status);
      setView("loading");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to trigger repository clone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipName || !zipFile) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await uploadRepositoryZip(zipName, zipFile);
      setSelectedRepoId(res.id);

      const url = new URL(window.location.href);
      url.searchParams.set("repoId", res.id);
      window.history.pushState({}, "", url.toString());

      setStatus(res.status);
      setView("loading");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to trigger ZIP analysis.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecentClick = async (repoId: string, name: string) => {
    setSelectedRepoId(repoId);
    setCloneName(name); // Temporarily store to display if needed

    const url = new URL(window.location.href);
    url.searchParams.set("repoId", repoId);
    window.history.pushState({}, "", url.toString());

    setStatus("analyzing");
    setView("loading");
  };

  // Pipeline loading visualization helper
  const pipelineSteps = ["pending", "cloning", "extracting", "analyzing", "completed"];
  const currentStepIndex = pipelineSteps.indexOf(status);

  // If in Dashboard View, render the entire AppShell and Tab content
  if (view === "dashboard") {
    let featureName = "Risk Insights";
    let featureDesc = "Unlock interactive hotspot clustering, file churn risk maps, and historical regression trackers to pinpoint code instability.";
    
    if (tab === "debt") {
      featureName = "Technical Debt Modularity";
      featureDesc = "Unlock the codebase modularity treemap, density analytics, and AI recommendations checklists to clean up monolith files.";
    } else if (tab === "contributors") {
      featureName = "Contributor Intelligence";
      featureDesc = "Unlock detailed developer ranking, expertise profiles, files ownership summaries, and knowledge concentration metrics.";
    } else if (tab === "explorer") {
      featureName = "Repository Explorer";
      featureDesc = "Unlock the high fidelity repository tree explorer, inline complexity score highlights, and AI-powered refactoring suggestions.";
    }

    const renderTabContent = () => {
      if (!user && tab !== "overview") {
        const previewComponent = (() => {
          switch (tab) {
            case "hotspots":
              return <RiskMap hotspots={hotspots} />;
            case "debt":
              return <TechDebtVisualizer techDebt={techDebt} complexityFiles={complexityFiles} />;
            case "contributors":
              return <ContributorIntel contributors={contributors} busFactor={busFactor} />;
            case "explorer":
              return <VSCodeExplorer hotspots={hotspots} />;
            default:
              return null;
          }
        })();

        return (
          <div className="select-none pointer-events-none filter blur-[8px] opacity-25 transition-all duration-300 h-full">
            {previewComponent}
          </div>
        );
      }

      switch (tab) {
        case "overview":
          return <HeroDashboard dashboard={dashboard} techDebt={techDebt} busFactor={busFactor} contributors={contributors} hotspots={hotspots} />;
        case "hotspots":
          return <RiskMap hotspots={hotspots} />;
        case "debt":
          return <TechDebtVisualizer techDebt={techDebt} complexityFiles={complexityFiles} />;
        case "contributors":
          return <ContributorIntel contributors={contributors} busFactor={busFactor} />;
        case "explorer":
          return <VSCodeExplorer hotspots={hotspots} />;
        default:
          return null;
      }
    };

    return (
      <>
        <AppShell 
          activeTab={tab} 
          onTabChange={(t) => setTab(t as TabMode)} 
          repoName={dashboard?.repository?.name}
          onBackToWorkspace={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete("repoId");
            window.history.pushState({}, "", url.toString());
            setView("landing");
          }}
          user={user}
          onLoginClick={() => setShowAuthModal(true)}
          onLogout={() => {
            localStorage.removeItem("current_user");
            setUser(null);
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </AppShell>

        {!user && tab !== "overview" && (
          <AuthLock 
            onLoginClick={() => setShowAuthModal(true)} 
            onClose={() => setTab("overview")}
            featureName={featureName} 
            featureDesc={featureDesc}
          />
        )}

        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => setUser(u)}
        />
      </>
    );
  }

  // Otherwise, render Landing or Loading (Clean, Centered experiences)
  return (
    <div className="min-h-screen bg-bg-base flex flex-col font-sans selection:bg-accent-subtle selection:text-accent overflow-hidden relative">
      
      {/* Premium Background Gradient (Subtle) */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none"></div>

      <header className="h-20 flex items-center justify-between px-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-text-primary text-bg-base flex items-center justify-center">
            <GitBranch className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-text-primary">
            ANTIGRAVITY
          </span>
        </div>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-display font-bold text-xs border border-accent/20">
                  {user.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <span className="text-xs font-semibold text-text-primary hidden sm:inline">{user.name}</span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("current_user");
                  setUser(null);
                }}
                className="text-xs font-semibold text-critical hover:bg-critical/10 px-3 py-1.5 rounded-xl border border-transparent transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait">
          
          {view === "landing" && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl"
            >
              <div className="text-center mb-16 space-y-4">
                <h1 className="text-5xl md:text-7xl font-display font-bold text-text-primary tracking-tight">
                  Engineering <span className="text-accent">Intelligence.</span>
                </h1>
                <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto font-medium">
                  Connect your repository to identify critical maintenance hotspots, trace single-developer dependencies, and access AI-generated refactoring guides.
                </p>
                
                {submitError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 rounded-xl border border-critical/20 bg-critical/10 text-critical text-sm flex items-center justify-center gap-2 max-w-md mx-auto">
                    <Warning className="w-5 h-5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </motion.div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Clone Panel */}
                <Card className="bg-surface-1 border border-border-base shadow-subtle">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-xl bg-accent-subtle/40 border border-accent/10 flex items-center justify-center mb-6">
                      <GitBranch className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2 text-text-primary tracking-tight">Clone Repository</h3>
                    <p className="text-sm text-text-secondary mb-8 leading-relaxed">Analyze any public repository directly by pasting its HTTPS clone address.</p>
                    
                    <form onSubmit={handleCloneSubmit} className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block mb-2">Repository URL</label>
                        <input 
                          type="url" 
                          placeholder="https://github.com/username/repo.git" 
                          value={cloneUrl}
                          onChange={e => setCloneUrl(e.target.value)}
                          className="w-full bg-surface-1 border border-border-strong rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 text-text-primary transition-all duration-150 placeholder:text-text-tertiary/60 shadow-subtle"
                          required
                        />
                      </div>
                      
                      <Button type="submit" disabled={isSubmitting} className="w-full h-12 mt-2">
                        {isSubmitting ? <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> : <>Run Analysis <ArrowRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Upload Panel */}
                <Card 
                  className={`bg-surface-1 shadow-subtle border transition-all duration-200 ${dragOver ? "border-accent bg-accent-subtle/10 scale-[1.01]" : "border-border-base"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].name.endsWith(".zip")) {
                      setZipFile(files[0]);
                      if (!zipName) setZipName(files[0].name.replace(/\.[^/.]+$/, ""));
                    } else setSubmitError("Only ZIP files are supported.");
                  }}
                >
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-xl bg-accent-subtle/40 border border-accent/10 flex items-center justify-center mb-6">
                      <CloudArrowDown className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2 text-text-primary tracking-tight">Upload ZIP Codebase</h3>
                    <p className="text-sm text-text-secondary mb-8 leading-relaxed">Drag and drop or select a ZIP bundle containing your repository files.</p>
                    
                    <form onSubmit={handleZipSubmit} className="space-y-5">
                      <div>
                        <label className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block mb-2">Project Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. legacy-backend" 
                          value={zipName}
                          onChange={e => setZipName(e.target.value)}
                          className="w-full bg-surface-1 border border-border-strong rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 text-text-primary transition-all duration-150 placeholder:text-text-tertiary/60 shadow-subtle"
                          required
                        />
                      </div>
                      
                      <div className="border border-dashed border-border-strong rounded-xl p-8 text-center cursor-pointer transition-all duration-150 relative hover:bg-surface-2/50 hover:border-accent">
                        <input 
                          type="file" 
                          accept=".zip" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={e => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              setZipFile(files[0]);
                              if (!zipName) setZipName(files[0].name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                        />
                        <CloudArrowDown className="w-5 h-5 text-text-tertiary mx-auto mb-3" />
                        {zipFile ? (
                          <p className="text-xs font-semibold text-text-primary truncate">{zipFile.name}</p>
                        ) : (
                          <p className="text-xs text-text-tertiary">Drop ZIP file here or click to browse</p>
                        )}
                      </div>
                      
                      <Button variant="secondary" type="submit" disabled={isSubmitting || !zipFile} className="w-full h-12 mt-2">
                        {isSubmitting ? <ArrowsCounterClockwise className="w-4 h-4 animate-spin" /> : "Upload & Analyze"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {recentRepos.length > 0 && (
                <div className="max-w-4xl mx-auto mt-12 animate-in fade-in duration-300">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider mb-4 px-1">Recent Projects</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recentRepos.map(repo => (
                      <Card key={repo.id} interactive onClick={() => handleRecentClick(repo.id, repo.name)} className="bg-surface-1 hover:bg-surface-2/45 border border-border-base shadow-subtle">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="truncate">
                            <p className="font-bold text-xs text-text-primary truncate">{repo.name}</p>
                            <p className="text-[9px] font-mono text-text-tertiary mt-1">{repo.date}</p>
                          </div>
                          <CaretRight className="w-4 h-4 text-text-tertiary shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl bg-surface-1 border border-border-base rounded-xl p-8 shadow-floating text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-8">
                <svg className="animate-spin w-full h-full text-border-strong" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="2" stroke="currentColor" />
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" stroke="var(--color-accent)" strokeDasharray="70 210" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ChartLine className="w-6 h-6 text-accent animate-pulse" />
                </div>
              </div>

              <h3 className="font-display font-bold text-2xl text-text-primary mb-2 tracking-tight">Analyzing Repository</h3>
              <p className="text-sm text-text-secondary mb-10 max-w-sm mx-auto">Mining Git history logs, evaluating code complexities, and extracting AI intelligence.</p>

              {/* Animated Pipeline Visualization */}
              <div className="space-y-3 text-left max-w-md mx-auto">
                {pipelineSteps.map((step, idx) => {
                  const isActive = currentStepIndex === idx;
                  const isDone = currentStepIndex > idx || status === "failed";
                  
                  return (
                    <div key={step} className="flex items-center gap-4">
                      <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : isActive ? (
                          <>
                            <span className="absolute inline-flex h-5 w-5 rounded-full bg-accent/20 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                          </>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-border-strong"></div>
                        )}
                      </div>
                      <div className={`flex-1 p-3 rounded-xl border transition-all duration-200 ${isActive ? "bg-accent-subtle/25 border-accent/20" : isDone ? "bg-surface-1 border-border-base" : "bg-transparent border-transparent opacity-40"}`}>
                        <span className={`font-semibold text-xs capitalize ${isActive ? "text-accent" : isDone ? "text-text-primary" : "text-text-tertiary"}`}>
                          {step === "pending" ? "Job Queued" : step}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errorMessage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 rounded-xl border border-critical/20 bg-critical/10 text-left">
                  <div className="flex items-center gap-2 text-critical font-semibold mb-3">
                    <Warning className="w-5 h-5" /> Analysis Failed
                  </div>
                  <p className="font-mono bg-bg-base p-3 rounded-lg border border-critical/10 text-xs text-text-secondary max-h-32 overflow-y-auto mb-4">
                    {errorMessage}
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setView("landing")}>
                    Return to Workspace
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
