"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Shield, Users, Database, ShieldWarning, Gear, Sun, Moon, SignOut } from "@phosphor-icons/react";
import { AdminPanel } from "@/components/views/AdminPanel";
import { getAdminUsers } from "../../utils/api";

export default function AdminPage() {
  const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const darkThemeActive = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(darkThemeActive);
    if (darkThemeActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedUserStr = localStorage.getItem("current_user");
    if (!savedUserStr) {
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUserStr);
      setUser(parsedUser);

      // Verify dynamically with backend using existing /admin/users endpoint
      getAdminUsers(parsedUser.email)
        .then(() => {
          setIsAuthorized(true);
          // If local storage was stale, update it to ADMIN
          if (parsedUser.role !== "ADMIN") {
            const updatedUser = { ...parsedUser, role: "ADMIN" };
            localStorage.setItem("current_user", JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Administrative verification failed:", err);
          setIsAuthorized(false);
          setLoading(false);
        });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const getInitials = (n: string) => {
    return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-bg-base text-text-primary flex items-center justify-center font-sans">
        <span className="text-xs font-mono text-text-secondary animate-pulse">Verifying administrative context...</span>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="h-screen w-screen bg-bg-base text-text-primary flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="max-w-md bg-surface-1 border border-border-base rounded-2xl p-8 shadow-floating">
          <ShieldWarning className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Access Denied</h2>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">
            You do not have administrative privileges to access this control gateway.
          </p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-surface-3 dark:hover:bg-surface-4 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Back to Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-bg-base text-text-primary flex flex-col font-sans selection:bg-accent-subtle dark:selection:bg-accent/20 relative overflow-hidden transition-colors duration-200">
      {/* Premium Minimal Grid Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="h-14 bg-surface-1 border-b border-border-base flex items-center justify-between px-6 sticky top-0 z-20 shrink-0 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>App</span>
          </button>

          <div className="h-4 w-px bg-border-base" />

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
              Administrative Gateway
            </span>
            <span className="text-[9px] font-mono font-semibold bg-surface-2 px-1.5 py-0.5 rounded text-text-secondary select-none">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          <div className="h-4 w-px bg-border-base" />

          {/* Current Admin details */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-500 select-none">
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-text-primary">{user.name}</p>
              <p className="text-[9px] font-mono text-text-tertiary leading-none">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("current_user");
              window.location.href = "/";
            }}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-critical hover:text-critical/90 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <SignOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Multi-column Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Admin Sidebar */}
        <aside className="w-56 bg-surface-1 border-r border-border-base hidden md:flex flex-col p-4 shrink-0 transition-colors duration-200">
          <p className="px-2 text-[9px] font-mono font-bold uppercase tracking-wider text-text-tertiary mb-3 select-none">
            Control Center
          </p>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-accent bg-accent-subtle/50 border border-accent-subtle transition-all cursor-default text-left">
              <Users className="w-4 h-4 text-accent" />
              <span>User Directory</span>
            </button>
            <button disabled className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-tertiary opacity-50 cursor-not-allowed text-left">
              <Database className="w-4 h-4" />
              <span>Audit logs</span>
            </button>
            <button disabled className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-tertiary opacity-50 cursor-not-allowed text-left">
              <Gear className="w-4 h-4" />
              <span>System Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Panel Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
          <div className="max-w-[1200px] mx-auto w-full">
            <AdminPanel currentUser={user} />
          </div>
        </main>
      </div>
    </div>
  );
}
