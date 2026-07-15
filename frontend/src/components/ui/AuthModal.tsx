import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Envelope, Lock, User, SignIn, UserPlus } from "@phosphor-icons/react";
import { Button } from "./Button";
import { registerUser, loginUser } from "../../utils/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; role?: string }) => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Disable body scroll when modal is active
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (mode === "signup") {
        const registered = await registerUser(email, name, password);
        localStorage.setItem("current_user", JSON.stringify(registered));
        onSuccess(registered);
        onClose();
      } else {
        const loggedIn = await loginUser(email, password);
        localStorage.setItem("current_user", JSON.stringify(loggedIn));
        onSuccess(loggedIn);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-base/80 backdrop-blur-md z-[100]"
          />

          {/* Modal Card */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ ease: "easeOut", duration: 0.22 }}
              className="bg-surface-1 border border-border-strong rounded-3xl p-6 w-full max-w-md shadow-floating relative pointer-events-auto flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Mode Toggle Switch */}
              <div className="flex border border-border-base bg-surface-2 p-1 rounded-xl mb-6 self-start">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    mode === "login"
                      ? "bg-surface-1 text-text-primary shadow-subtle"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <SignIn className="w-3.5 h-3.5" /> Login
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    mode === "signup"
                      ? "bg-surface-1 text-text-primary shadow-subtle"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up
                </button>
              </div>

              {/* Title Header */}
              <div className="mb-5">
                <h3 className="font-display font-black text-xl text-text-primary tracking-tight uppercase">
                  {mode === "login" ? "Welcome Back" : "Create Account"}
                </h3>
                <p className="text-xs text-text-tertiary mt-1">
                  {mode === "login"
                    ? "Sign in to unlock all advanced analysis tabs and AI recommendations."
                    : "Register to analyze repos with real-time complexity tracking and hotspots."}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-critical/10 border border-critical/20 text-critical text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-surface-2 border border-border-strong rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 transition-all placeholder:text-text-tertiary/50"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Envelope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-2 border border-border-strong rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 transition-all placeholder:text-text-tertiary/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase font-mono font-bold text-text-tertiary tracking-wider">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface-2 border border-border-strong rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle/40 transition-all placeholder:text-text-tertiary/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full justify-center py-2.5">
                    {mode === "login" ? "Login" : "Register"}
                  </Button>
                </div>
              </form>

              {/* Demo Login Assist */}
              {mode === "login" && (
                <div className="mt-4 pt-4 border-t border-border-base text-center">
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    Demo credentials:{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("demo@example.com");
                        setPassword("password");
                      }}
                      className="text-accent hover:underline font-bold"
                    >
                      demo@example.com / password
                    </button>
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
