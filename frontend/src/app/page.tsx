"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, DownloadCloud, Activity, AlertTriangle, RefreshCw, ChevronRight, CheckCircle2, ArrowRight } from "lucide-react";
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

  useEffect(() => {
    const saved = localStorage.getItem("recent_repositories");
    if (saved) {
      try {
        setRecentRepos(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
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
    if (!cloneName || !cloneUrl) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await cloneRepository(cloneName, cloneUrl);
      setSelectedRepoId(res.id);
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
    setStatus("analyzing");
    setView("loading");
  };

  // Pipeline loading visualization helper
  const pipelineSteps = ["pending", "cloning", "extracting", "analyzing", "completed"];
  const currentStepIndex = pipelineSteps.indexOf(status);

  // If in Dashboard View, render the entire AppShell and Tab content
  if (view === "dashboard") {
    return (
      <AppShell 
        activeTab={tab} 
        onTabChange={(t) => setTab(t as TabMode)} 
        repoName={dashboard?.repository?.name}
        onBackToWorkspace={() => setView("landing")}
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
            {tab === "overview" && <HeroDashboard dashboard={dashboard} techDebt={techDebt} busFactor={busFactor} />}
            {tab === "hotspots" && <RiskMap hotspots={hotspots} />}
            {tab === "debt" && <TechDebtVisualizer techDebt={techDebt} complexityFiles={complexityFiles} />}
            {tab === "contributors" && <ContributorIntel contributors={contributors} busFactor={busFactor} />}
            {tab === "explorer" && <VSCodeExplorer hotspots={hotspots} />}
          </motion.div>
        </AnimatePresence>
      </AppShell>
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
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </motion.div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Clone Panel */}
                <Card className="bg-surface-1/50 backdrop-blur-xl border-border-base hover:border-border-strong transition-colors">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-base flex items-center justify-center mb-6">
                      <GitBranch className="w-6 h-6 text-text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-2 text-text-primary">Clone Repository</h3>
                    <p className="text-sm text-text-secondary mb-8">Analyze any public repository directly by pasting its HTTPS clone address.</p>
                    
                    <form onSubmit={handleCloneSubmit} className="space-y-5">
                      <div>
                        <label className="text-xs font-semibold text-text-primary block mb-2">Project Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. react-hooks-demo" 
                          value={cloneName}
                          onChange={e => setCloneName(e.target.value)}
                          className="w-full bg-surface-2 border border-border-base rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-text-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-primary block mb-2">Repository URL</label>
                        <input 
                          type="url" 
                          placeholder="https://github.com/username/repo.git" 
                          value={cloneUrl}
                          onChange={e => setCloneUrl(e.target.value)}
                          className="w-full bg-surface-2 border border-border-base rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-text-primary"
                          required
                        />
                      </div>
                      
                      <Button type="submit" disabled={isSubmitting} className="w-full h-12 mt-2">
                        {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Run Analysis <ArrowRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Upload Panel */}
                <Card 
                  className={`bg-surface-1/50 backdrop-blur-xl transition-all ${dragOver ? "border-accent bg-accent-subtle/20 scale-[1.02]" : "border-border-base hover:border-border-strong"}`}
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
                    <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-base flex items-center justify-center mb-6">
                      <DownloadCloud className="w-6 h-6 text-text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-xl mb-2 text-text-primary">Upload ZIP Codebase</h3>
                    <p className="text-sm text-text-secondary mb-8">Drag and drop or select a ZIP bundle containing your repository files.</p>
                    
                    <form onSubmit={handleZipSubmit} className="space-y-5">
                      <div>
                        <label className="text-xs font-semibold text-text-primary block mb-2">Project Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. legacy-backend" 
                          value={zipName}
                          onChange={e => setZipName(e.target.value)}
                          className="w-full bg-surface-2 border border-border-base rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-text-primary"
                          required
                        />
                      </div>
                      
                      <div className="border border-dashed border-border-strong rounded-xl p-8 text-center cursor-pointer transition-colors relative hover:bg-surface-2">
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
                        <DownloadCloud className="w-6 h-6 text-text-tertiary mx-auto mb-3" />
                        {zipFile ? (
                          <p className="text-sm font-medium text-text-primary truncate">{zipFile.name}</p>
                        ) : (
                          <p className="text-sm text-text-tertiary">Drop ZIP file here</p>
                        )}
                      </div>
                      
                      <Button variant="secondary" type="submit" disabled={isSubmitting || !zipFile} className="w-full h-12 mt-2">
                        {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Upload & Analyze"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {recentRepos.length > 0 && (
                <div className="max-w-4xl mx-auto mt-12">
                  <h4 className="text-sm font-semibold text-text-secondary mb-4 px-1">Recent Projects</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recentRepos.map(repo => (
                      <Card key={repo.id} interactive onClick={() => handleRecentClick(repo.id, repo.name)} className="bg-surface-2 hover:bg-surface-3">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="truncate">
                            <p className="font-semibold text-sm text-text-primary truncate">{repo.name}</p>
                            <p className="text-[10px] text-text-tertiary mt-1">{repo.date}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-xl bg-surface-1 border border-border-base rounded-3xl p-10 shadow-floating text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <svg className="animate-spin w-full h-full text-border-strong" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="2" stroke="currentColor" />
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" stroke="var(--color-accent)" strokeDasharray="70 210" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-text-primary animate-pulse" />
                </div>
              </div>

              <h3 className="font-display font-bold text-3xl text-text-primary mb-2">Analyzing Repository</h3>
              <p className="text-text-secondary mb-10">Mining history logs, evaluating complexities, and extracting AI intelligence.</p>

              {/* Animated Pipeline Visualization */}
              <div className="space-y-4 text-left">
                {pipelineSteps.map((step, idx) => {
                  const isActive = currentStepIndex === idx;
                  const isDone = currentStepIndex > idx || status === "failed";
                  
                  return (
                    <div key={step} className="flex items-center gap-4">
                      <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        ) : isActive ? (
                          <>
                            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-20 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                          </>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-border-strong"></div>
                        )}
                      </div>
                      <div className={`flex-1 p-4 rounded-xl border transition-all ${isActive ? "bg-surface-2 border-accent" : isDone ? "bg-surface-1 border-border-base" : "bg-transparent border-transparent opacity-50"}`}>
                        <span className={`font-semibold text-sm capitalize ${isActive ? "text-accent" : isDone ? "text-text-primary" : "text-text-tertiary"}`}>
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
                    <AlertTriangle className="w-5 h-5" /> Analysis Failed
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
    </div>
  );
}
