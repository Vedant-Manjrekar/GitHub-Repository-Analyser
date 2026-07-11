"use client";

import React, { useState, useEffect } from "react";
import { GitBranch, CloudArrowDown, ChartLine, Warning, ArrowsCounterClockwise, CaretRight, CheckCircle, ArrowRight, X, ShieldWarning, Users, User, Cpu, FolderSimple, Envelope, Lock, SignIn, UserPlus } from "@phosphor-icons/react";
import { motion, AnimatePresence, Variants } from "framer-motion";

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
  getTechnicalDebtData,
  registerUser,
  loginUser,
  getRecentAnalyses
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

const panelVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 220 : -220,
    filter: "blur(6px)"
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 26,
      stiffness: 170,
      mass: 1
    }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -220 : 220,
    filter: "blur(6px)",
    transition: {
      ease: "easeInOut",
      duration: 0.25
    }
  })
};

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

  // Auth Form State for sliding screen
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Redesigned Landing Page Slide Transitions
  const [activePanel, setActivePanel] = useState<"hero" | "clone" | "zip" | "auth">("hero");
  const [direction, setDirection] = useState(1);

  const navigateTo = (panel: "hero" | "clone" | "zip" | "auth") => {
    if (panel === "hero") {
      setDirection(-1);
    } else {
      setDirection(1);
    }
    setActivePanel(panel);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail || !authPassword || (authMode === "signup" && !authName)) {
      setAuthError("Please fill in all fields.");
      return;
    }

    if (!authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (authMode === "signup") {
        const registered = await registerUser(authEmail, authName, authPassword);
        localStorage.setItem("current_user", JSON.stringify(registered));
        setUser(registered);
        navigateTo("hero");
      } else {
        const loggedIn = await loginUser(authEmail, authPassword);
        localStorage.setItem("current_user", JSON.stringify(loggedIn));
        setUser(loggedIn);
        navigateTo("hero");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    }
  };

  // Load user context and sync parameters on mount
  useEffect(() => {
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

  // Sync recent projects list dynamically based on authentication state
  const loadRecentAnalysesFromDb = async () => {
    if (!user || !user.email) {
      setRecentRepos([]);
      return;
    }
    try {
      const data = await getRecentAnalyses(user.email);
      setRecentRepos(data);
    } catch (e) {
      console.error("Failed to load recent repositories from db:", e);
      setRecentRepos([]);
    }
  };

  useEffect(() => {
    loadRecentAnalysesFromDb();
  }, [user]);

  const saveToRecents = (id: string, name: string) => {
    loadRecentAnalysesFromDb();
  };

  useEffect(() => {
    if (view !== "loading" || !selectedRepoId) return;

    let timer: NodeJS.Timeout;
    const checkStatus = async () => {
      try {
        const res = await getAnalysisStatus(selectedRepoId);
        setStatus(res.status);
        
        if (res.status === "completed") {
          const dash = await loadDashboard(selectedRepoId);
          const nameToSave = dash?.repository?.name || cloneName || zipName || "Repository";
          saveToRecents(selectedRepoId, nameToSave);
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
  }, [view, selectedRepoId, cloneName, zipName]);

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
      return dash;
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.message || "Failed to load dashboard metrics.");
      return null;
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

      const res = await cloneRepository(repoName, cloneUrl, user?.email || undefined);
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
      const res = await uploadRepositoryZip(zipName, zipFile, user?.email || undefined);
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
    <div className="h-screen w-screen bg-[#030712] text-white flex flex-col font-sans selection:bg-[#00d8f6]/30 selection:text-[#00d8f6] overflow-hidden relative z-0">
      
      {/* Premium futuristic background glowing elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 rounded-full filter blur-[130px] pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-[450px] h-[450px] bg-indigo-500/10 rounded-full filter blur-[110px] pointer-events-none -z-10" />

      {/* Decorative Git commit graph line artwork on the left background */}
      <div className="absolute left-[3%] top-1/4 h-[420px] w-[260px] pointer-events-none select-none -z-10 opacity-[0.06] dark:opacity-[0.09] hidden md:block">
        <svg viewBox="0 0 200 400" className="w-full h-full text-[#00d8f6] fill-none stroke-current" strokeWidth="2">
          <defs>
            <linearGradient id="git-grad-1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d8f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Main branch */}
          <line x1="50" y1="20" x2="50" y2="380" stroke="url(#git-grad-1)" strokeWidth="2.5" />
          
          {/* Feature 1 */}
          <path d="M 50,60 C 90,80 90,110 90,130 C 90,150 90,170 50,190" strokeDasharray="3 3" />
          
          {/* Feature 2 */}
          <path d="M 50,150 C 130,170 130,200 130,225 C 130,250 130,270 50,290" />
          
          {/* Bugfix */}
          <path d="M 50,220 C 10,240 10,270 10,290 C 10,310 10,330 50,350" />

          {/* Commits nodes circles */}
          <circle cx="50" cy="30" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />
          <circle cx="50" cy="60" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />
          <circle cx="90" cy="130" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />
          <circle cx="50" cy="150" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />
          <circle cx="130" cy="225" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />
          <circle cx="50" cy="190" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />
          <circle cx="50" cy="290" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />
          <circle cx="10" cy="290" r="4" fill="#030712" stroke="#fb7185" strokeWidth="2" />
          <circle cx="50" cy="350" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="2" />

          {/* Text labels */}
          <text x="62" y="34" className="font-mono text-[9px] fill-neutral-500 font-bold stroke-none">main</text>
          <text x="102" y="134" className="font-mono text-[8px] fill-neutral-600 stroke-none">feat/auth</text>
          <text x="142" y="229" className="font-mono text-[8px] fill-neutral-600 stroke-none">feat/insights</text>
          <text x="22" y="294" className="font-mono text-[8px] fill-[#fb7185]/70 stroke-none">bug/fix</text>
        </svg>
      </div>

      {/* Decorative System Topology / Dependency network chart on the right background */}
      <div className="absolute right-[3%] top-1/4 h-[420px] w-[260px] pointer-events-none select-none -z-10 opacity-[0.06] dark:opacity-[0.09] hidden md:block">
        <svg viewBox="0 0 200 400" className="w-full h-full text-[#00d8f6] fill-none stroke-current" strokeWidth="1.5">
          {/* Concentric tier rings */}
          <circle cx="100" cy="200" r="40" strokeDasharray="4 4" className="text-neutral-700" />
          <circle cx="100" cy="200" r="80" strokeDasharray="6 6" className="text-neutral-700" />
          <circle cx="100" cy="200" r="120" strokeDasharray="8 8" className="text-neutral-800" />

          {/* Radial axis lines */}
          <line x1="100" y1="80" x2="100" y2="320" strokeDasharray="2 6" className="text-neutral-800" />
          <line x1="20" y1="200" x2="180" y2="200" strokeDasharray="2 6" className="text-neutral-800" />

          {/* Connected nodes */}
          <circle cx="100" cy="200" r="6" fill="#030712" stroke="#00d8f6" strokeWidth="2.5" />
          
          <circle cx="100" cy="160" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />
          <circle cx="140" cy="200" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />
          <circle cx="100" cy="240" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />
          <circle cx="60" cy="200" r="4" fill="#030712" stroke="#818cf8" strokeWidth="2" />

          <circle cx="156" cy="144" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="1.5" />
          <circle cx="44" cy="256" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="1.5" />
          <circle cx="156" cy="256" r="4" fill="#030712" stroke="#fb7185" strokeWidth="1.5" />
          <circle cx="44" cy="144" r="4" fill="#030712" stroke="#00d8f6" strokeWidth="1.5" />

          {/* Connection vectors */}
          <path d="M 100,160 Q 120,150 156,144" />
          <path d="M 140,200 Q 150,230 156,256" />
          <path d="M 100,240 Q 70,250 44,256" />
          <path d="M 60,200 Q 50,170 44,144" />

          {/* Nodes text descriptors */}
          <text x="108" y="163" className="font-mono text-[7px] fill-neutral-500 font-bold stroke-none">api.ts</text>
          <text x="148" y="203" className="font-mono text-[7px] fill-neutral-500 font-bold stroke-none">db.py</text>
          <text x="164" y="147" className="font-mono text-[7px] fill-neutral-600 stroke-none">auth.py</text>
          <text x="164" y="259" className="font-mono text-[7px] fill-[#fb7185]/70 stroke-none">cache.ts</text>
        </svg>
      </div>

      {/* Landing Header */}
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 relative z-10 bg-transparent shrink-0">
        {/* Left Logo branding */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-4 h-4 text-[#00d8f6] fill-none stroke-current" strokeWidth="2.5">
              <rect x="4" y="4" width="9" height="9" rx="1.5" className="fill-[#00d8f6]" />
              <rect x="19" y="4" width="9" height="9" rx="1.5" />
              <rect x="4" y="19" width="9" height="9" rx="1.5" />
              <rect x="19" y="19" width="9" height="9" rx="1.5" />
            </svg>
          </div>
          <span className="font-display font-black text-sm tracking-[0.2em] text-white">
            REPO-LYTICS
          </span>
        </div>



        {/* Right Authentication states */}
        <div className="flex items-center gap-5">
          <button 
            onClick={() => {
              if (view === "landing") {
                navigateTo("auth");
              } else {
                setShowAuthModal(true);
              }
            }} 
            className="text-[10px] font-mono tracking-[0.2em] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {user ? user.name.toUpperCase() : "ACCESS"}
          </button>

          {user && (
            <button
              onClick={() => {
                localStorage.removeItem("current_user");
                setUser(null);
              }}
              className="text-[10px] font-mono tracking-[0.2em] text-critical/80 hover:text-critical transition-colors cursor-pointer"
            >
              LOGOUT
            </button>
          )}


        </div>
      </header>

      {/* Main Container - strictly centered 100vh with screen transitions */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          
          {/* Centered Hero Section */}
          {view === "landing" && activePanel === "hero" && (
            <motion.div 
              key="hero"
              custom={direction}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-3xl text-center flex flex-col items-center justify-center"
            >
              {/* Tagline */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono tracking-[0.35em] text-[#00d8f6] uppercase">
                  CLARITY IN CHAOS
                </span>
                <div className="w-44 h-[1.2px] bg-gradient-to-r from-transparent via-[#00d8f6]/30 to-transparent my-3.5" />
              </div>

              {/* Title Header */}
              <h1 className="text-5xl md:text-7xl lg:text-[80px] font-display font-black tracking-tight leading-[1.05] text-center mt-2 select-none">
                <span className="block md:whitespace-nowrap">
                  <span className="text-white">Deep </span>
                  <span className="text-[#00d8f6]">Codebase Insights</span>
                </span>
                <span className="text-neutral-400 block mt-2 text-3xl md:text-5xl lg:text-6xl">Beyond Git History</span>
              </h1>

              {/* Subheading/Description */}
              <p className="text-xs md:text-sm text-neutral-400 max-w-2xl mt-6 leading-relaxed select-none">
                Analyze GitHub repositories to uncover technical debt, code hotspots, contributor dependencies, complexity trends, and AI-powered insights that help teams build healthier software.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
                <button
                  onClick={() => navigateTo("clone")}
                  className="px-8 py-3.5 bg-[#00d8f6] hover:bg-[#00b2cc] text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,216,246,0.3)] hover:shadow-[0_0_35px_rgba(0,216,246,0.5)] cursor-pointer"
                >
                  Analyze Repository
                </button>
                <button
                  onClick={() => navigateTo("zip")}
                  className="px-8 py-3.5 bg-transparent border border-[#00d8f6]/30 hover:border-[#00d8f6]/60 text-[#00d8f6] hover:bg-[#00d8f6]/5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  Upload Repository ZIP
                </button>
              </div>
            </motion.div>
          )}

          {/* Centered Clone Repository Screen */}
          {view === "landing" && activePanel === "clone" && (
            <motion.div 
              key="clone"
              custom={direction}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-xl flex flex-col items-center justify-center relative text-white"
            >
              {/* Back Trigger */}
              <button
                onClick={() => navigateTo("hero")}
                className="flex items-center gap-2 mb-6 text-[10px] font-mono tracking-[0.2em] text-neutral-400 hover:text-white transition-colors cursor-pointer group"
              >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                <span>GO BACK</span>
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <span className="text-[10px] font-mono tracking-[0.3em] text-[#00d8f6] uppercase">
                  Initialize
                </span>
                <h3 className="font-display font-black text-2xl text-white mt-1.5 uppercase tracking-tight">
                  Clone Public Repository
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Paste any repository HTTPS address below to begin code intelligence mining.
                </p>
              </div>

              <form onSubmit={handleCloneSubmit} className="space-y-5 w-full bg-neutral-950/40 border border-neutral-800/80 rounded-3xl p-8 shadow-floating">
                <div>
                  <label className="text-xs uppercase font-mono font-bold text-neutral-400 tracking-wider block mb-2">Repository URL</label>
                  <input 
                    type="url" 
                    placeholder="https://github.com/username/repo.git" 
                    value={cloneUrl}
                    onChange={e => setCloneUrl(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#00d8f6] focus:ring-1 focus:ring-[#00d8f6]/30 transition-all placeholder:text-neutral-600"
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-12 bg-[#00d8f6] hover:bg-[#00b2cc] text-black rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-[0_0_15px_rgba(0,216,246,0.2)]"
                >
                  {isSubmitting ? <ArrowsCounterClockwise className="w-4.5 h-4.5 animate-spin" /> : "Run Analysis"}
                </button>
              </form>

              {/* Quick Toggle Link */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => navigateTo("zip")}
                  className="text-xs text-neutral-400 hover:text-[#00d8f6] font-semibold transition-colors cursor-pointer"
                >
                  Or upload a ZIP codebase file instead
                </button>
              </div>

              {/* Mini Recent Projects */}
              {recentRepos.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-900 w-full max-w-md">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-400 block mb-3.5 text-center">Recently Analyzed Repositories</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {recentRepos.map(repo => (
                      <div 
                        key={repo.id}
                        onClick={() => handleRecentClick(repo.id, repo.name)}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/40 hover:border-neutral-700/60 cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold text-neutral-200 truncate">{repo.name}</span>
                        <CaretRight className="w-4 h-4 text-neutral-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Centered ZIP Upload Screen */}
          {view === "landing" && activePanel === "zip" && (
            <motion.div 
              key="zip"
              custom={direction}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-xl flex flex-col items-center justify-center relative text-white"
            >
              {/* Back Trigger */}
              <button
                onClick={() => navigateTo("hero")}
                className="flex items-center gap-2 mb-6 text-[10px] font-mono tracking-[0.2em] text-neutral-400 hover:text-white transition-colors cursor-pointer group"
              >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                <span>GO BACK</span>
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <span className="text-[10px] font-mono tracking-[0.3em] text-[#00d8f6] uppercase">
                  Transmission
                </span>
                <h3 className="font-display font-black text-2xl text-white mt-1.5 uppercase tracking-tight">
                  Upload ZIP Codebase
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Drag and drop or select a ZIP bundle containing your repository files.
                </p>
              </div>

              <form onSubmit={handleZipSubmit} className="space-y-5 w-full bg-neutral-950/40 border border-neutral-800/80 rounded-3xl p-8 shadow-floating">
                <div>
                  <label className="text-xs uppercase font-mono font-bold text-neutral-400 tracking-wider block mb-2">Project Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. legacy-backend" 
                    value={zipName}
                    onChange={e => setZipName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00d8f6] focus:ring-1 focus:ring-[#00d8f6]/30 transition-all placeholder:text-neutral-600"
                    required
                  />
                </div>

                <div 
                  className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all relative ${
                    dragOver ? "border-[#00d8f6] bg-[#00d8f6]/5" : "border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"
                  }`}
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
                  <CloudArrowDown className="w-6 h-6 text-neutral-500 mx-auto mb-3.5" />
                  {zipFile ? (
                    <p className="text-xs font-semibold text-white truncate px-3">{zipFile.name}</p>
                  ) : (
                    <p className="text-xs text-neutral-400 font-medium">Drop ZIP file here or click to browse</p>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting || !zipFile}
                  className="w-full h-12 bg-[#00d8f6] hover:bg-[#00b2cc] text-black rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-[0_0_15px_rgba(0,216,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <ArrowsCounterClockwise className="w-4.5 h-4.5 animate-spin" /> : "Upload & Analyze"}
                </button>
              </form>

              {/* Quick Toggle Link */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => navigateTo("clone")}
                  className="text-xs text-neutral-400 hover:text-[#00d8f6] font-semibold transition-colors cursor-pointer"
                >
                  Or clone a public repository URL instead
                </button>
              </div>

              {/* Mini Recent Projects */}
              {recentRepos.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-900 w-full max-w-md">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-400 block mb-3.5 text-center">Recently Analyzed Repositories</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {recentRepos.map(repo => (
                      <div 
                        key={repo.id}
                        onClick={() => handleRecentClick(repo.id, repo.name)}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/40 hover:border-neutral-700/60 cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold text-neutral-200 truncate">{repo.name}</span>
                        <CaretRight className="w-4 h-4 text-neutral-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Centered Authentication Screen */}
          {view === "landing" && activePanel === "auth" && (
            <motion.div 
              key="auth"
              custom={direction}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-xl flex flex-col items-center justify-center relative text-white"
            >
              {/* Back Trigger */}
              <button
                onClick={() => navigateTo("hero")}
                className="flex items-center gap-2 mb-6 text-[10px] font-mono tracking-[0.2em] text-neutral-400 hover:text-white transition-colors cursor-pointer group"
              >
                <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                <span>GO BACK</span>
              </button>

              {/* Mode Toggle Switch */}
              <div className="flex border border-neutral-800 bg-neutral-950/60 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(null); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    authMode === "login"
                      ? "bg-neutral-900 text-white shadow-subtle border border-neutral-800"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <SignIn className="w-3.5 h-3.5" /> Login
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setAuthError(null); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    authMode === "signup"
                      ? "bg-neutral-900 text-white shadow-subtle border border-neutral-800"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up
                </button>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <span className="text-[10px] font-mono tracking-[0.3em] text-[#00d8f6] uppercase">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </span>
                <h3 className="font-display font-black text-2xl text-white mt-1.5 uppercase tracking-tight">
                  {authMode === "login" ? "Access Gateway" : "Register Profile"}
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                  {authMode === "login"
                    ? "Sign in to unlock all advanced analysis tabs and AI recommendations."
                    : "Register to analyze repos with real-time complexity tracking and hotspots."}
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="mb-5 p-3 rounded-xl bg-critical/10 border border-critical/20 text-critical text-xs font-medium w-full">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-5 w-full bg-neutral-950/40 border border-neutral-800/80 rounded-3xl p-8 shadow-floating">
                {authMode === "signup" && (
                  <div>
                    <label className="text-xs uppercase font-mono font-bold text-neutral-400 tracking-wider block mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9.5 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00d8f6] focus:ring-1 focus:ring-[#00d8f6]/30 transition-all placeholder:text-neutral-600"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs uppercase font-mono font-bold text-neutral-400 tracking-wider block mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Envelope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9.5 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00d8f6] focus:ring-1 focus:ring-[#00d8f6]/30 transition-all placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase font-mono font-bold text-neutral-400 tracking-wider block mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9.5 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#00d8f6] focus:ring-1 focus:ring-[#00d8f6]/30 transition-all placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full h-12 bg-[#00d8f6] hover:bg-[#00b2cc] text-black rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center shadow-[0_0_15px_rgba(0,216,246,0.2)]"
                >
                  {authMode === "login" ? "Login" : "Register"}
                </button>
              </form>

              {/* Demo Login Assist */}
              {authMode === "login" && (
                <div className="mt-5 pt-4 border-t border-neutral-900 text-center w-full max-w-md">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Demo credentials:{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthEmail("demo@example.com");
                        setAuthPassword("password");
                      }}
                      className="text-[#00d8f6] hover:underline font-bold"
                    >
                    demo@example.com / password
                    </button>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Redesigned Loading Visualization Container (Dark theme to match) */}
          {view === "loading" && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 shadow-floating text-center"
            >
              <div className="relative w-16 h-16 mx-auto mb-6">
                <svg className="animate-spin w-full h-full text-neutral-800" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="2" stroke="currentColor" />
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" stroke="#00d8f6" strokeDasharray="70 210" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ChartLine className="w-5 h-5 text-[#00d8f6] animate-pulse" />
                </div>
              </div>

              <h3 className="font-display font-bold text-lg text-white mb-1.5 tracking-tight">Analyzing Repository</h3>
              <p className="text-xs text-neutral-400 mb-8 max-w-xs mx-auto">Mining Git history logs, evaluating code complexities, and extracting AI intelligence.</p>

              {/* Animated Pipeline steps */}
              <div className="space-y-2.5 text-left max-w-xs mx-auto">
                {pipelineSteps.map((step, idx) => {
                  const isActive = currentStepIndex === idx;
                  const isDone = currentStepIndex > idx || status === "failed";
                  
                  return (
                    <div key={step} className="flex items-center gap-3.5">
                      <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                        {isDone ? (
                          <CheckCircle className="w-4.5 h-4.5 text-success" />
                        ) : isActive ? (
                          <>
                            <span className="absolute inline-flex h-4 w-4 rounded-full bg-[#00d8f6]/25 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d8f6]"></span>
                          </>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
                        )}
                      </div>
                      <div className={`flex-1 p-2.5 rounded-xl border transition-all duration-200 ${isActive ? "bg-[#00d8f6]/5 border-[#00d8f6]/10" : isDone ? "bg-neutral-900 border-neutral-800/80" : "bg-transparent border-transparent opacity-30"}`}>
                        <span className={`font-semibold text-[10px] uppercase font-mono tracking-wider ${isActive ? "text-[#00d8f6]" : isDone ? "text-neutral-200" : "text-neutral-500"}`}>
                          {step === "pending" ? "Job Queued" : step}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errorMessage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 rounded-xl border border-critical/20 bg-critical/10 text-left">
                  <div className="flex items-center gap-2 text-critical font-semibold mb-2.5 text-xs">
                    <Warning className="w-4.5 h-4.5" /> Analysis Failed
                  </div>
                  <p className="font-mono bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 text-[10px] text-neutral-400 max-h-24 overflow-y-auto mb-3">
                    {errorMessage}
                  </p>
                  <Button variant="outline" className="w-full text-xs" onClick={() => setView("landing")}>
                    Return to Workspace
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Structural technical mesh grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-20" />

      {/* Bottom Floating Features Panel */}
      <footer className="h-16 border-t border-white/5 bg-neutral-950/40 backdrop-blur-md flex items-center justify-center gap-6 px-8 relative z-10 shrink-0 select-none">
        <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase mr-2">MODULES:</span>
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d8f6]/30 hover:bg-[#00d8f6]/5 text-xs text-neutral-300 transition-all cursor-help group relative">
            <ShieldWarning className="w-3.5 h-3.5 text-[#00d8f6]" />
            <span>Risk Map</span>
            {/* Tooltip */}
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 py-1.5 px-3 rounded-lg whitespace-nowrap shadow-floating z-50">
              Trace file change frequencies and code hotspots.
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d8f6]/30 hover:bg-[#00d8f6]/5 text-xs text-neutral-300 transition-all cursor-help group relative">
            <Users className="w-3.5 h-3.5 text-[#00d8f6]" />
            <span>Contributor Intel</span>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 py-1.5 px-3 rounded-lg whitespace-nowrap shadow-floating z-50">
              Analyze developer bus-factor and knowledge bottlenecks.
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d8f6]/30 hover:bg-[#00d8f6]/5 text-xs text-neutral-300 transition-all cursor-help group relative">
            <Cpu className="w-3.5 h-3.5 text-[#00d8f6]" />
            <span>Tech Debt Tracker</span>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 py-1.5 px-3 rounded-lg whitespace-nowrap shadow-floating z-50">
              Calculate code complexity, duplication and tech debt.
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d8f6]/30 hover:bg-[#00d8f6]/5 text-xs text-neutral-300 transition-all cursor-help group relative">
            <FolderSimple className="w-3.5 h-3.5 text-[#00d8f6]" />
            <span>Visual Explorer</span>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all origin-bottom bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 py-1.5 px-3 rounded-lg whitespace-nowrap shadow-floating z-50">
              Navigate codebases interactively in a mock IDE view.
            </span>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
