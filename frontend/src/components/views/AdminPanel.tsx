import React, { useState, useEffect } from "react";
import { getAdminUsers, updateUserRole } from "@/utils/api";
import { Badge } from "@/components/ui/Badge";
import { Users, ShieldWarning, User, Envelope, ArrowsCounterClockwise, ShieldCheck, Check, UserMinus, ArrowUp, ArrowDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminPanelProps {
  currentUser: { name: string; email: string; role?: string } | null;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!currentUser?.email) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers(currentUser.email);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.email]);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    if (!currentUser?.email) return;
    const targetRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    
    setActionUserId(userId);
    setError(null);
    setSuccessMsg(null);

    try {
      await updateUserRole(userId, targetRole, currentUser.email);
      setSuccessMsg(`Successfully updated user role to ${targetRole}.`);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update role.");
    } finally {
      setActionUserId(null);
    }
  };

  const getInitials = (n: string) => {
    return n.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const standardCount = users.filter(u => u.role === "USER").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <ArrowsCounterClockwise className="w-8 h-8 text-accent animate-spin" />
        <p className="text-xs text-text-secondary font-mono">Loading User Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Dashboard Sub-Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary uppercase font-mono">
            User Administration
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            Browse user catalog directory, promote developers, and view authorization scopes.
          </p>
        </div>
        <button 
          onClick={fetchUsers}
          className="px-3.5 py-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 border border-border-base text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all cursor-pointer shadow-subtle hover:scale-[1.02]"
        >
          <ArrowsCounterClockwise className="w-3.5 h-3.5" />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Stats Cards (Enterprise SaaS Minimal Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-1 border border-border-strong rounded-xl shadow-elevated p-5 flex items-center gap-4 hover:shadow-floating transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-accent/30">
          <div className="w-10 h-10 rounded-lg bg-accent/5 border border-accent/15 flex items-center justify-center text-accent shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Total Accounts</p>
              <span className="text-[9px] font-mono font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">active</span>
            </div>
            <p className="text-2xl font-semibold text-text-primary mt-1 tracking-tight">{totalUsers}</p>
          </div>
        </div>

        <div className="bg-surface-1 border border-border-strong rounded-xl shadow-elevated p-5 flex items-center gap-4 hover:shadow-floating transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-emerald-500/30">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Administrators</p>
              <span className="text-[9px] font-mono font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">privileged</span>
            </div>
            <p className="text-2xl font-semibold text-text-primary mt-1 tracking-tight">{adminCount}</p>
          </div>
        </div>

        <div className="bg-surface-1 border border-border-strong rounded-xl shadow-elevated p-5 flex items-center gap-4 hover:shadow-floating transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:border-zinc-500/30">
          <div className="w-10 h-10 rounded-lg bg-zinc-500/5 border border-zinc-500/15 flex items-center justify-center text-zinc-400 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">Standard Users</p>
              <span className="text-[9px] font-mono font-semibold text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">developers</span>
            </div>
            <p className="text-2xl font-semibold text-text-primary mt-1 tracking-tight">{standardCount}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-critical/20 bg-critical/5 text-xs text-critical flex items-start gap-2.5"
          >
            <ShieldWarning className="w-4.5 h-4.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5"
          >
            <Check className="w-4.5 h-4.5 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enterprise Data Table */}
      <div className="bg-surface-1 border border-border-base rounded-xl overflow-hidden shadow-floating transition-colors duration-200">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-border-base bg-surface-2/60 text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider sticky top-0 z-10 select-none">
                <th className="px-6 py-3.5">User Details</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Authorization Role</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-base/40 bg-transparent">
              {users.map((user, idx) => {
                const isSelf = user.email.toLowerCase() === currentUser?.email?.toLowerCase();
                const isUpdating = actionUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-surface-2/40 even:bg-surface-2/10 transition-colors">
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-2 text-text-secondary flex items-center justify-center font-bold text-xs border border-border-strong shrink-0 select-none">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <p className="text-xs font-semibold text-text-primary leading-none">{user.name}</p>
                            {isSelf && (
                              <span className="text-[8px] font-mono bg-accent/15 text-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 select-none leading-none">
                                Self
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                        <Envelope className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 align-middle">
                      {user.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 uppercase rounded">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-surface-2 text-text-secondary border border-border-strong px-2 py-0.5 uppercase rounded">
                          <User className="w-3 h-3 text-text-tertiary" />
                          <span>Developer</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 align-middle text-right">
                      {isSelf ? (
                        <span className="text-[10px] text-text-tertiary font-mono italic select-none">Self Account</span>
                      ) : (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleRoleToggle(user.id, user.role)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 hover:scale-[1.02]",
                            user.role === "ADMIN"
                              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          )}
                        >
                          {isUpdating ? (
                            <ArrowsCounterClockwise className="w-3.5 h-3.5 animate-spin" />
                          ) : user.role === "ADMIN" ? (
                            <>
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Demote</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Promote</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
