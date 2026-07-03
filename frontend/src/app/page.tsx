"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, GitBranch, Users, FileCode, AlertTriangle, TrendingUp, 
  Terminal, ArrowRight, ChevronRight, DownloadCloud, FileText, 
  RefreshCw, Trash2, Folder, Calendar, Zap, BookOpen, User,
  FileSpreadsheet, ArrowLeft, BarChart2, HelpCircle
} from "lucide-react";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

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

type ViewMode = "landing" | "loading" | "dashboard";
type TabMode = "overview" | "hotspots" | "debt" | "contributors" | "explorer";

export default function Home() {
  // Navigation & View States
  const [view, setView] = useState<ViewMode>("landing");
  const [tab, setTab] = useState<TabMode>("overview");
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [recentRepos, setRecentRepos] = useState<Array<{id: string, name: string, date: string}>>([]);
  
  // Form Inputs
  const [cloneName, setCloneName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [zipName, setZipName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  
  // Loading & Ingestion States
  const [status, setStatus] = useState<string>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Core Analytical Data States
  const [dashboard, setDashboard] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [churnTrends, setChurnTrends] = useState<any>(null);
  const [busFactor, setBusFactor] = useState<any>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [techDebt, setTechDebt] = useState<any>(null);
  const [complexityFiles, setComplexityFiles] = useState<any[]>([]);
  
  // Code Explorer States
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Load Recent Repos on boot
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

  // Save new repo to recents
  const saveToRecents = (id: string, name: string) => {
    const list = [...recentRepos];
    const filtered = list.filter(r => r.id !== id);
    const updated = [{ id, name, date: new Date().toLocaleDateString() }, ...filtered].slice(0, 5);
    setRecentRepos(updated);
    localStorage.setItem("recent_repositories", JSON.stringify(updated));
  };

  // Status Polling Loop
  useEffect(() => {
    if (view !== "loading" || !selectedRepoId) return;

    let timer: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        const res = await getAnalysisStatus(selectedRepoId);
        setStatus(res.status);
        
        if (res.status === "completed") {
          saveToRecents(selectedRepoId, dashboard?.repository?.name || "Repository");
          await loadDashboard(selectedRepoId);
          setView("dashboard");
        } else if (res.status === "failed") {
          setErrorMessage(res.error_message || "Analysis pipeline execution encountered an error.");
        } else {
          // Keep polling
          timer = setTimeout(checkStatus, 1500);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Connection to backend service lost.");
      }
    };

    checkStatus();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [view, selectedRepoId]);

  // Load All Dashboard APIs
  const loadDashboard = async (repoId: string) => {
    try {
      const [dash, hot, churn, bus, contrib, debt, comp] = await Promise.all([
        getDashboardData(repoId),
        getHotspotsData(repoId),
        getChurnData(repoId),
        getBusFactorData(repoId),
        getContributorsData(repoId),
        getTechnicalDebtData(repoId),
        getComplexityData(repoId)
      ]);
      
      setDashboard(dash);
      setHotspots(hot);
      setChurnTrends(churn);
      setBusFactor(bus);
      setContributors(contrib);
      setTechDebt(debt);
      setComplexityFiles(comp);
      
      // Auto-select first hotspot file in explorer
      if (hot && hot.length > 0) {
        setSelectedFile(hot[0]);
      }
    } catch (e: any) {
      console.error("Error loading dashboard modules:", e);
      setSubmitError(e.message || "Failed to load dashboard metrics.");
    }
  };

  // Form Submissions
  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneName || !cloneUrl) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setErrorMessage(null);
    
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
    setErrorMessage(null);

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

  const handleRecentClick = async (repoId: string) => {
    setSelectedRepoId(repoId);
    setStatus("analyzing");
    setView("loading");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith(".zip")) {
      setZipFile(files[0]);
      // Pre-fill name if empty
      if (!zipName) {
        const basename = files[0].name.replace(/\.[^/.]+$/, "");
        setZipName(basename);
      }
    } else {
      setSubmitError("Only ZIP files are supported in file upload.");
    }
  };

  const getHealthGrade = (score: number) => {
    if (score >= 90) return { grade: "A", color: "text-neon-green" };
    if (score >= 80) return { grade: "B", color: "text-neon-teal" };
    if (score >= 65) return { grade: "C", color: "text-neon-yellow" };
    if (score >= 50) return { grade: "D", color: "text-orange-500" };
    return { grade: "F", color: "text-neon-pink" };
  };

  const getTechDebtRating = (debt: number) => {
    const score = 100 - debt;
    if (score >= 90) return { rating: "A", color: "text-neon-green", label: "Healthy" };
    if (score >= 80) return { rating: "B", color: "text-neon-teal", label: "Minor Issues" };
    if (score >= 65) return { rating: "C", color: "text-neon-yellow", label: "Moderate Debt" };
    if (score >= 50) return { rating: "D", color: "text-orange-500", label: "High Debt" };
    return { rating: "F", color: "text-neon-pink", label: "Critical Debt" };
  };

  const getStatusStepClass = (step: string) => {
    const states = ["pending", "cloning", "extracting", "analyzing", "completed", "failed"];
    const curIdx = states.indexOf(status);
    const stepIdx = states.indexOf(step);
    
    if (status === "failed") return "border-red-900/40 text-red-500 bg-red-950/20";
    if (curIdx === stepIdx) return "border-neon-teal text-neon-teal bg-neon-teal/10 animate-pulse";
    if (curIdx > stepIdx) return "border-emerald-500 text-emerald-400 bg-emerald-950/10";
    return "border-border-dark text-gray-500 bg-transparent";
  };

  return (
    <div className="flex-1 flex flex-col font-sans selection:bg-neon-teal/20 selection:text-neon-teal">
      
      {/* Decorative Blob */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-neon-teal/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-purple/5 rounded-full filter blur-[120px] pointer-events-none"></div>

      {/* --- HEADER --- */}
      <header className="glass-card sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-border-dark bg-opacity-70">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-neon-teal to-neon-purple rounded-xl flex items-center justify-center shadow-lg shadow-neon-teal/10">
            <Activity className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-2">
              ANTIGRAVITY <span className="text-xs bg-neon-teal/10 text-neon-teal border border-neon-teal/30 px-2 py-0.5 rounded-full uppercase font-mono tracking-wider font-semibold">Analytics</span>
            </h1>
          </div>
        </div>
        
        {view === "dashboard" && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Current Scope</p>
              <h2 className="text-sm font-semibold text-white font-display">{dashboard?.repository?.name}</h2>
            </div>
            <button 
              onClick={() => setView("landing")} 
              className="px-3 py-1.5 rounded-lg border border-border-dark text-xs font-medium text-gray-300 hover:border-white hover:text-white flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
            </button>
          </div>
        )}
      </header>

      {/* --- CONTENT CONTAINER --- */}
      <main className="flex-1 flex flex-col p-6 z-10 max-w-7xl mx-auto w-full">
        
        {/* --- VIEW 1: LANDING PAGE --- */}
        {view === "landing" && (
          <div className="flex-1 flex flex-col justify-center py-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight leading-tight mb-4 text-white">
                Engineering Risk & Code Health <span className="bg-gradient-to-r from-neon-teal to-neon-purple bg-clip-text text-transparent">Visualizer</span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                Connect your repository to identify critical maintenance hotspots, trace single-developer dependencies, and access AI-generated refactoring guidelines.
              </p>
              
              {submitError && (
                <div className="mt-6 p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-sm flex items-center gap-2 max-w-md mx-auto">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Ingestion Cards Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
              
              {/* Option A: Clone from Git URL */}
              <div className="glass-card p-8 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-neon-teal/10 flex items-center justify-center text-neon-teal border border-neon-teal/20 mb-6">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2 text-white">Clone Git Repository</h3>
                  <p className="text-xs text-gray-400 mb-6">Analyze any public repository directly by pasting its HTTPS clone address.</p>
                  
                  <form onSubmit={handleCloneSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400 block mb-1">Project Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. react-hooks-demo" 
                        value={cloneName}
                        onChange={e => setCloneName(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400 block mb-1">Repository URL</label>
                      <input 
                        type="url" 
                        placeholder="https://github.com/username/repo.git" 
                        value={cloneUrl}
                        onChange={e => setCloneUrl(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                        required
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-neon-teal to-neon-purple hover:opacity-90 disabled:opacity-50 text-black font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-neon-teal/10 transition-all hover:scale-[1.01]"
                    >
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Trigger Clone <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </div>
              </div>

              {/* Option B: ZIP Archive Ingestion */}
              <div 
                className={`glass-card p-8 rounded-2xl flex flex-col justify-between transition-all ${dragOver ? "border-neon-purple bg-neon-purple/5" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center text-neon-purple border border-neon-purple/20 mb-6">
                    <DownloadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2 text-white">Upload ZIP Codebase</h3>
                  <p className="text-xs text-gray-400 mb-6">Drag and drop or select a ZIP bundle containing your repository files.</p>
                  
                  <form onSubmit={handleZipSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400 block mb-1">Project Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. legacy-backend" 
                        value={zipName}
                        onChange={e => setZipName(e.target.value)}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        required
                      />
                    </div>
                    
                    {/* Drag Zone */}
                    <div className="border border-dashed border-border-dark hover:border-neon-purple/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                      <input 
                        type="file" 
                        accept=".zip" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={e => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            setZipFile(files[0]);
                            if (!zipName) {
                              const basename = files[0].name.replace(/\.[^/.]+$/, "");
                              setZipName(basename);
                            }
                          }
                        }}
                      />
                      <DownloadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      {zipFile ? (
                        <p className="text-xs text-white font-medium truncate">{zipFile.name}</p>
                      ) : (
                        <p className="text-xs text-gray-400">Click or Drag ZIP file here</p>
                      )}
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !zipFile}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-neon-purple/10 transition-all hover:scale-[1.01]"
                    >
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Start Analysis <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </div>
              </div>

            </div>

            {/* Recent Repositories */}
            {recentRepos.length > 0 && (
              <div className="max-w-2xl mx-auto w-full mt-16">
                <h4 className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400 mb-3">Recently Indexed Projects</h4>
                <div className="space-y-2">
                  {recentRepos.map(repo => (
                    <div 
                      key={repo.id}
                      onClick={() => handleRecentClick(repo.id)}
                      className="glass-card hover:bg-white/5 border border-border-dark px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-neon-teal" />
                        <span className="text-sm font-semibold text-white">{repo.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Analyzed: {repo.date}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 2: LOADING / PROGRESS PAGE --- */}
        {view === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-16">
            
            <div className="w-20 h-20 rounded-full border-t-2 border-r-2 border-neon-teal animate-spin flex items-center justify-center mb-8">
              <div className="w-16 h-16 rounded-full border-b-2 border-l-2 border-neon-purple animate-spin flex items-center justify-center">
                <Activity className="w-6 h-6 text-neon-teal animate-pulse" />
              </div>
            </div>

            <h3 className="font-display font-bold text-2xl text-center text-white mb-2">Analyzing Repository</h3>
            <p className="text-xs text-gray-400 text-center mb-8">
              Mining history logs, evaluating complexities, and preparing risk metrics.
            </p>

            {/* Checklist of Status */}
            <div className="w-full space-y-3 bg-card-dark border border-border-dark p-6 rounded-2xl">
              <div className={`border p-3 rounded-xl flex items-center gap-3 text-sm transition-all ${getStatusStepClass("pending")}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                <span>Job Queued</span>
              </div>
              <div className={`border p-3 rounded-xl flex items-center gap-3 text-sm transition-all ${getStatusStepClass("cloning")}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                <span>Cloning / Ingesting Files</span>
              </div>
              <div className={`border p-3 rounded-xl flex items-center gap-3 text-sm transition-all ${getStatusStepClass("extracting")}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                <span>Unzipping Workspace</span>
              </div>
              <div className={`border p-3 rounded-xl flex items-center gap-3 text-sm transition-all ${getStatusStepClass("analyzing")}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                <span>Running Static Analyzers</span>
              </div>
              <div className={`border p-3 rounded-xl flex items-center gap-3 text-sm transition-all ${getStatusStepClass("completed")}`}>
                <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                <span>Generating Dashboard</span>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-8 w-full p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-xs flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-semibold">Analysis Failed</span>
                </div>
                <p className="font-mono bg-black/40 p-2 rounded border border-red-950/40 max-h-24 overflow-y-auto">{errorMessage}</p>
                <button 
                  onClick={() => setView("landing")}
                  className="mt-2 py-2 w-full text-center text-xs font-semibold rounded-lg bg-red-900/20 border border-red-500/40 hover:bg-red-900/40 text-white cursor-pointer transition-colors"
                >
                  Return to Workspace Setup
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW 3: CORE ANALYTICAL DASHBOARD --- */}
        {view === "dashboard" && (
          <div className="flex-1 flex flex-col">
            
            {/* Dashboard Sub-Tabs Bar */}
            <div className="flex border-b border-border-dark mb-8 overflow-x-auto gap-2">
              <button 
                onClick={() => setTab("overview")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${tab === "overview" ? "border-neon-teal text-neon-teal" : "border-transparent text-gray-400 hover:text-white"}`}
              >
                <BarChart2 className="w-4 h-4" /> Codebase Overview
              </button>
              <button 
                onClick={() => setTab("hotspots")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${tab === "hotspots" ? "border-neon-pink text-neon-pink" : "border-transparent text-gray-400 hover:text-white"}`}
              >
                <Zap className="w-4 h-4" /> Code Hotspots
              </button>
              <button 
                onClick={() => setTab("debt")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${tab === "debt" ? "border-neon-yellow text-neon-yellow" : "border-transparent text-gray-400 hover:text-white"}`}
              >
                <HelpCircle className="w-4 h-4" /> Technical Debt
              </button>
              <button 
                onClick={() => setTab("contributors")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${tab === "contributors" ? "border-neon-purple text-neon-purple" : "border-transparent text-gray-400 hover:text-white"}`}
              >
                <Users className="w-4 h-4" /> Contributor Dependencies
              </button>
              <button 
                onClick={() => setTab("explorer")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${tab === "explorer" ? "border-neon-teal text-neon-teal" : "border-transparent text-gray-400 hover:text-white"}`}
              >
                <FileCode className="w-4 h-4" /> Code Explorer
              </button>
            </div>

            {/* TAB PANELS */}
            <div className="flex-1 flex flex-col">
              
              {/* --- TAB A: OVERVIEW --- */}
              {tab === "overview" && (
                <div className="space-y-8">
                  {/* High Level Metrics Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Gauge Health Card */}
                    <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Health Index</p>
                        <h3 className={`text-4xl font-display font-extrabold mt-2 ${getHealthGrade(techDebt?.health_score || 100).color}`}>
                          {getHealthGrade(techDebt?.health_score || 100).grade}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Health Score: {techDebt?.health_score}%</p>
                      </div>
                      
                      {/* Circular Gauge */}
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                          <circle 
                            cx="32" cy="32" r="28" fill="transparent" 
                            stroke={techDebt?.health_score >= 80 ? "#00f2fe" : techDebt?.health_score >= 65 ? "#ffb300" : "#ff0844"} 
                            strokeWidth="4" 
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - (techDebt?.health_score || 100) / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white">
                          {Math.round(techDebt?.health_score || 0)}%
                        </div>
                      </div>
                    </div>

                    {/* Bus Factor Card */}
                    <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between ${busFactor?.bus_factor <= 1.0 ? "border-red-950/40 hover:border-red-500/50" : ""}`}>
                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Bus Factor</p>
                        <h3 className={`text-4xl font-display font-extrabold mt-2 ${busFactor?.bus_factor <= 1 ? "text-neon-pink animate-pulse" : "text-white"}`}>
                          {busFactor?.bus_factor}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
                        {busFactor?.bus_factor <= 1 ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-neon-pink" /> 
                            <span className="text-neon-pink font-semibold">Critical knowledge bottleneck</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5 text-neon-teal" /> Core authors cover codebase
                          </>
                        )}
                      </p>
                    </div>

                    {/* Technical Debt Card */}
                    <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Technical Debt</p>
                        <h3 className={`text-4xl font-display font-extrabold mt-2 ${getTechDebtRating(techDebt?.technical_debt_score || 0).color}`}>
                          {getTechDebtRating(techDebt?.technical_debt_score || 0).rating}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-4">
                        Debt Score: {techDebt?.technical_debt_score}% ({getTechDebtRating(techDebt?.technical_debt_score || 0).label})
                      </p>
                    </div>

                    {/* Raw Stats Card */}
                    <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Repository Details</p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase block font-mono">Commits</span>
                            <span className="text-sm font-semibold text-white">{dashboard?.total_commits}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase block font-mono">Authors</span>
                            <span className="text-sm font-semibold text-white">{dashboard?.total_contributors}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase block font-mono">Files</span>
                            <span className="text-sm font-semibold text-white">{dashboard?.total_files}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase block font-mono">Language</span>
                            <span className="text-sm font-semibold text-neon-teal truncate block max-w-full">{dashboard?.repository?.language || "Unknown"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Main Grid: AI Review + Secondary Stats */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    
                    {/* Left: AI Review Markdown console (Col-span 2) */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col border border-border-dark">
                      <div className="flex items-center justify-between border-b border-border-dark pb-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-5 h-5 text-neon-teal" />
                          <h4 className="font-display font-bold text-lg text-white">AI Architectural Code Review</h4>
                        </div>
                        <span className="text-[9px] font-mono bg-neon-teal/10 text-neon-teal px-2 py-0.5 rounded border border-neon-teal/20">AGENT LOG</span>
                      </div>
                      
                      {/* Markdown Container */}
                      <div className="flex-1 max-h-[500px] overflow-y-auto pr-2 text-sm text-gray-300 space-y-4 font-sans leading-relaxed">
                        {techDebt?.ai_summary ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            {techDebt.ai_summary.split("\n").map((line: string, i: number) => {
                              if (line.startsWith("# ")) {
                                return <h2 key={i} className="text-xl font-bold font-display text-white mt-4 mb-2">{line.replace("# ", "")}</h2>;
                              }
                              if (line.startsWith("## ")) {
                                return <h3 key={i} className="text-lg font-bold font-display text-white mt-3 mb-2">{line.replace("## ", "")}</h3>;
                              }
                              if (line.startsWith("### ")) {
                                return <h4 key={i} className="text-base font-bold font-display text-white mt-2 mb-1">{line.replace("### ", "")}</h4>;
                              }
                              if (line.startsWith("* ") || line.startsWith("- ")) {
                                return <li key={i} className="ml-4 list-disc text-gray-300">{line.replace(/^[\*\-]\s+/, "")}</li>;
                              }
                              if (line.startsWith("> [!")) {
                                return null; // skip alert tag lines
                              }
                              if (line.trim() === "---") {
                                return <hr key={i} className="border-border-dark my-4" />;
                              }
                              if (line.trim() === "") return <div key={i} className="h-2"></div>;
                              return <p key={i} className="text-gray-300">{line}</p>;
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No AI summary available for this analysis.</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Languages & Commits Feed */}
                    <div className="space-y-6">
                      
                      {/* Languages Card */}
                      <div className="glass-card p-6 rounded-2xl">
                        <h4 className="font-display font-bold text-sm text-white mb-4">Programming Languages</h4>
                        <div className="space-y-3">
                          {dashboard?.top_languages && dashboard.top_languages.length > 0 ? (
                            dashboard.top_languages.slice(0, 4).map((lang: any) => {
                              const total = dashboard.top_languages.reduce((acc: number, cur: any) => acc + cur.count, 0);
                              const pct = Math.round((lang.count / total) * 100);
                              return (
                                <div key={lang.language} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-gray-300">{lang.language}</span>
                                    <span className="text-gray-400">{pct}% ({lang.count} files)</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div 
                                      className="bg-neon-teal h-1.5 rounded-full" 
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-500 italic">No languages detected.</p>
                          )}
                        </div>
                      </div>

                      {/* Recent Commits Feed */}
                      <div className="glass-card p-6 rounded-2xl flex-1">
                        <h4 className="font-display font-bold text-sm text-white mb-4">Latest Commits</h4>
                        <div className="space-y-4">
                          {dashboard?.recent_commits && dashboard.recent_commits.length > 0 ? (
                            dashboard.recent_commits.map((c: any) => (
                              <div key={c.hash} className="flex gap-3 text-xs border-l border-border-dark pl-4 relative">
                                <div className="absolute w-2 h-2 rounded-full bg-neon-purple -left-[4.5px] top-1"></div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-neon-teal">{c.hash.substring(0, 7)}</span>
                                    <span className="text-gray-500">{new Date(c.date).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-gray-300 truncate max-w-[200px]">{c.author}</p>
                                  <div className="flex items-center gap-2 text-[10px] font-mono">
                                    <span className="text-emerald-450">+{c.additions}</span>
                                    <span className="text-neon-pink">-{c.deletions}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">No commits recorded.</p>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB B: CODE HOTSPOTS --- */}
              {tab === "hotspots" && (
                <div className="space-y-8">
                  <div className="grid lg:grid-cols-3 gap-6">
                    
                    {/* Left: Recharts Scatter Plot Map (Col-span 2) */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col border border-border-dark h-[450px]">
                      <h4 className="font-display font-bold text-lg text-white mb-2">Codebase Hotspots Map</h4>
                      <p className="text-xs text-gray-400 mb-6">X-axis represents file modification counts (Churn). Y-axis represents cyclomatic complexity. Files in the top-right quadrant represent files combining high complexity with high edit frequencies.</p>
                      
                      <div className="flex-1 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                              type="number" 
                              dataKey="churn" 
                              name="Churn" 
                              unit=" edits" 
                              stroke="#6b7280" 
                              label={{ value: "Git Churn (Changes)", position: "insideBottom", offset: -5, fill: "#6b7280" }} 
                            />
                            <YAxis 
                              type="number" 
                              dataKey="complexity" 
                              name="Complexity" 
                              stroke="#6b7280"
                              label={{ value: "Cyclomatic Complexity", angle: -90, position: "insideLeft", offset: 5, fill: "#6b7280" }} 
                            />
                            <ZAxis type="number" dataKey="hotspot_score" range={[60, 400]} />
                            <Tooltip 
                              cursor={{ strokeDasharray: "3 3" }} 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-bg-dark border border-neon-pink p-3 rounded-lg text-xs space-y-1 shadow-lg shadow-neon-pink/15">
                                      <p className="font-semibold text-white">{data.path}</p>
                                      <p className="text-gray-400">Hotspot Score: <span className="text-neon-pink font-bold">{data.hotspot_score}/100</span></p>
                                      <p className="text-gray-400">Edits (Churn): <span className="text-white font-mono">{data.churn}</span></p>
                                      <p className="text-gray-400">Complexity: <span className="text-white font-mono">{data.complexity}</span></p>
                                      <p className="text-gray-500">Owner: {data.owner}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter name="Files" data={hotspots} fill="#ff0844">
                              {hotspots.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.hotspot_score >= 70 ? "#ff0844" : entry.hotspot_score >= 45 ? "#ffb300" : "#00f2fe"} 
                                />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Right: Critical Hotspots Table */}
                    <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                      <div>
                        <h4 className="font-display font-bold text-sm text-white mb-4">Critical Code Hotspots</h4>
                        <div className="space-y-3">
                          {hotspots && hotspots.length > 0 ? (
                            hotspots.slice(0, 5).map((f: any) => (
                              <div key={f.id} className="p-3 bg-white/3 border border-border-dark hover:border-neon-pink/40 rounded-xl space-y-1 transition-all">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs font-semibold text-white truncate max-w-[150px]">{f.path.split("/").pop()}</span>
                                  <span className="text-[10px] font-mono font-bold text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-1.5 py-0.5 rounded">
                                    Score: {Math.round(f.hotspot_score)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate">{f.path}</p>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                                  <span>Complexity: {f.complexity}</span>
                                  <span>Churn: {f.churn} edits</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">No hotspots identified.</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border-dark">
                        <button 
                          onClick={() => { setTab("explorer"); }} 
                          className="w-full py-2.5 rounded-xl border border-border-dark hover:border-neon-pink text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          Inspect Hotspot Files in Explorer <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB C: TECHNICAL DEBT --- */}
              {tab === "debt" && (
                <div className="space-y-8">
                  
                  {/* Grid Cards */}
                  <div className="grid sm:grid-cols-3 gap-6">
                    
                    <div className="glass-card p-6 rounded-2xl">
                      <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Total Outstanding TODOs</p>
                      <h3 className="text-4xl font-display font-extrabold text-neon-yellow mt-2">
                        {techDebt?.total_todos}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">Incomplete tags, FIXMEs, HACKs, and BUG comments remaining.</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                      <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Complex Files Ratio</p>
                      <h3 className="text-4xl font-display font-extrabold text-orange-500 mt-2">
                        {techDebt?.complex_files_count}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">Files exceeding cyclomatic complexity values of 10.</p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                      <p className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400">Lines of Code Ratio</p>
                      <h3 className="text-4xl font-display font-extrabold text-white mt-2">
                        {complexityFiles.length > 0 ? Math.round(complexityFiles.reduce((acc, cur) => acc + cur.complexity, 0) / complexityFiles.length * 100) : 0}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">Average LOC per source file in the repository.</p>
                    </div>

                  </div>

                  {/* Complex Files List */}
                  <div className="glass-card p-6 rounded-2xl border border-border-dark">
                    <h4 className="font-display font-bold text-lg text-white mb-4">Highest Complexity Files</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border-dark text-gray-400">
                            <th className="pb-3 font-semibold">File Path</th>
                            <th className="pb-3 font-semibold">Language</th>
                            <th className="pb-3 font-semibold">Complexity Score</th>
                            <th className="pb-3 font-semibold">Total Churn</th>
                            <th className="pb-3 font-semibold">Primary Maintainer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {complexityFiles && complexityFiles.length > 0 ? (
                            complexityFiles.slice(0, 5).map((f: any) => (
                              <tr key={f.id} className="border-b border-white/3 hover:bg-white/1 text-gray-300">
                                <td className="py-3 font-medium text-white">{f.path}</td>
                                <td className="py-3">{f.language || "Source"}</td>
                                <td className="py-3 font-mono font-bold text-orange-500">{f.complexity}</td>
                                <td className="py-3 font-mono">{f.churn} changes</td>
                                <td className="py-3">{f.owner}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-gray-500 italic">No complexity files processed.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB D: CONTRIBUTORS --- */}
              {tab === "contributors" && (
                <div className="space-y-8">
                  
                  {/* Contributor Warnings */}
                  {busFactor?.bus_factor <= 1.0 && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-sm flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-white">Critical In-house Dependency Warning</h4>
                        <p className="text-xs text-red-300 mt-1">A single contributor owns more than 50% of this repository. Standard knowledge-transfer, peer reviews, and collaborative branches are recommended to prevent single-developer failures.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-3 gap-6">
                    
                    {/* Left: Recharts Contributor Share (Col-span 2) */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col border border-border-dark h-[400px]">
                      <h4 className="font-display font-bold text-lg text-white mb-4">Developer Contribution Shares</h4>
                      <div className="flex-1 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={contributors} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" label={{ value: "Total Commits", angle: -90, position: "insideLeft", fill: "#6b7280" }} />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-bg-dark border border-neon-purple p-3 rounded-lg text-xs space-y-1">
                                      <p className="font-semibold text-white">{data.name}</p>
                                      <p className="text-gray-400">Email: {data.email}</p>
                                      <p className="text-gray-400">Commits: <span className="text-neon-purple font-bold">{data.commits}</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="commits" fill="#7f00ff" radius={[4, 4, 0, 0]}>
                              {contributors.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={index === 0 ? "#7f00ff" : index === 1 ? "#4facfe" : "#00f2fe"} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Right: Contributors Directory */}
                    <div className="glass-card p-6 rounded-2xl flex flex-col">
                      <h4 className="font-display font-bold text-sm text-white mb-4 font-display">Author List</h4>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2">
                        {contributors && contributors.length > 0 ? (
                          contributors.map((c: any, index: number) => (
                            <div key={c.email} className="flex items-center justify-between border-b border-white/3 pb-2 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-border-dark flex items-center justify-center font-display text-white font-bold">
                                  {c.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-white">{c.name}</p>
                                  <p className="text-[10px] text-gray-500">{c.email}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-white block">{c.commits} commits</span>
                                <span className="text-[10px] text-gray-500">Rank #{index + 1}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No contributors tracked.</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB E: CODE EXPLORER --- */}
              {tab === "explorer" && (
                <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[550px]">
                  
                  {/* Left: Files catalog list (Width 1/3) */}
                  <div className="lg:w-1/3 glass-card p-6 rounded-2xl flex flex-col border border-border-dark h-full">
                    <h4 className="font-display font-bold text-sm text-white mb-2">Repository Files</h4>
                    <input 
                      type="text" 
                      placeholder="Search files..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="w-full glass-input rounded-lg px-3 py-1.5 text-xs mb-4"
                    />
                    
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                      {hotspots && hotspots.length > 0 ? (
                        hotspots
                          .filter(f => f.path.toLowerCase().includes(searchFilter.toLowerCase()))
                          .map((f: any) => (
                            <div 
                              key={f.id}
                              onClick={() => setSelectedFile(f)}
                              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between text-xs ${selectedFile?.id === f.id ? "border-neon-teal bg-neon-teal/5 text-neon-teal" : "border-transparent hover:bg-white/3 text-gray-300 hover:text-white"}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{f.path}</span>
                              </div>
                              <span className={`text-[9px] font-mono px-1 rounded flex-shrink-0 ${f.hotspot_score >= 60 ? "bg-neon-pink/15 text-neon-pink" : "bg-white/5 text-gray-400"}`}>
                                HS: {Math.round(f.hotspot_score)}
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">No files available.</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Selected File Metrics details (Width 2/3) */}
                  <div className="lg:w-2/3 glass-card p-6 rounded-2xl flex flex-col justify-between border border-border-dark h-full">
                    {selectedFile ? (
                      <div className="space-y-6 flex-1 flex flex-col justify-between">
                        <div>
                          {/* File Title */}
                          <div className="flex items-center justify-between border-b border-border-dark pb-4 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-white/5 border border-border-dark rounded-xl text-neon-teal">
                                <FileCode className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-white font-display">{selectedFile.path.split("/").pop()}</h3>
                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{selectedFile.path}</p>
                              </div>
                            </div>
                            
                            {selectedFile.hotspot_score >= 60 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-neon-pink bg-neon-pink/10 border border-neon-pink/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                <AlertTriangle className="w-3 h-3" /> Critical Hotspot
                              </span>
                            )}
                          </div>

                          {/* File Stats Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            <div className="p-3 bg-white/3 border border-border-dark rounded-xl text-center">
                              <span className="text-[10px] text-gray-500 uppercase block font-mono">Avg Complexity</span>
                              <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedFile.complexity}</span>
                            </div>
                            <div className="p-3 bg-white/3 border border-border-dark rounded-xl text-center">
                              <span className="text-[10px] text-gray-500 uppercase block font-mono">Changes (Churn)</span>
                              <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedFile.churn}</span>
                            </div>
                            <div className="p-3 bg-white/3 border border-border-dark rounded-xl text-center">
                              <span className="text-[10px] text-gray-500 uppercase block font-mono">Hotspot Score</span>
                              <span className={`text-lg font-bold font-mono mt-1 block ${selectedFile.hotspot_score >= 60 ? "text-neon-pink" : "text-neon-teal"}`}>
                                {Math.round(selectedFile.hotspot_score)}/100
                              </span>
                            </div>
                            <div className="p-3 bg-white/3 border border-border-dark rounded-xl text-center">
                              <span className="text-[10px] text-gray-500 uppercase block font-mono">File Type</span>
                              <span className="text-xs font-semibold text-white truncate block mt-2">{selectedFile.language ? selectedFile.language.replace(".", "").toUpperCase() : "SOURCE"}</span>
                            </div>
                          </div>

                          {/* Owner details */}
                          <div className="p-4 bg-white/3 border border-border-dark rounded-xl space-y-2">
                            <h5 className="text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-400 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-neon-teal" /> Primary Maintainer (Owner)
                            </h5>
                            <div>
                              <p className="text-sm font-semibold text-white">{selectedFile.owner.split(" <")[0]}</p>
                              <p className="text-[10px] text-gray-500">{selectedFile.owner.includes("<") ? selectedFile.owner.split(" <")[1].replace(">", "") : "No email available"}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                              This developer is marked as owner because they account for the majority of line additions and deletions written in this file across the repository commit logs.
                            </p>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="p-4 border border-border-dark rounded-xl text-xs bg-bg-dark/45 space-y-1.5">
                          <h6 className="font-semibold text-white font-display">Refactoring Guide:</h6>
                          {selectedFile.hotspot_score >= 65 ? (
                            <p className="text-gray-400 leading-relaxed">
                              **Warning**: This file is modified very frequently and has high cyclomatic complexity. It represents a major regression risk during modifications. It is highly recommended to refactor this file, splitting it into modular dependencies and increasing its automated unit test coverage.
                            </p>
                          ) : selectedFile.complexity > 8.0 ? (
                            <p className="text-gray-400 leading-relaxed">
                              **Caution**: This file has high cyclomatic complexity (complex conditions, branches, or helper structures). Try to extract large logical functions into clean helper methods.
                            </p>
                          ) : (
                            <p className="text-gray-400 leading-relaxed">
                              This file is currently in a healthy state. Maintain modular coding patterns and review its logic regularly.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 italic text-xs">
                        Select a file from the explorer list to inspect its metrics.
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* --- FOOTER --- */}
      <footer className="glass-card py-6 border-t border-border-dark text-center text-xs text-gray-500 mt-12">
        <p>© {new Date().getFullYear()} Antigravity Repository Analytics Engine. Deep codebase health & collaboration intelligence.</p>
      </footer>

    </div>
  );
}
