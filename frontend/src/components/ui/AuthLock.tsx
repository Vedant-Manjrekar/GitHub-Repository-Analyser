import React from "react";
import { LockSimple } from "@phosphor-icons/react";
import { Button } from "./Button";

interface AuthLockProps {
  children: React.ReactNode;
  onLoginClick: () => void;
  featureName: string;
  featureDesc: string;
}

export function AuthLock({ children, onLoginClick, featureName, featureDesc }: AuthLockProps) {
  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-3xl">
      {/* Blurred glimpse of children content */}
      <div className="select-none pointer-events-none filter blur-[8px] opacity-35 transition-all duration-300">
        {children}
      </div>
      
      {/* Centered locked prompt overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-6 bg-bg-base/30 backdrop-blur-[2px] z-10">
        <div className="bg-surface-1/90 backdrop-blur-md border border-border-strong rounded-3xl p-8 max-w-md w-full text-center shadow-floating animate-in zoom-in-95 duration-300">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4 border border-accent/20">
            <LockSimple className="w-7 h-7" weight="bold" />
          </div>
          <h3 className="font-display font-black text-xl text-text-primary tracking-tight uppercase">
            Unlock {featureName}
          </h3>
          <p className="text-xs text-text-secondary mt-2 mb-6 leading-relaxed">
            {featureDesc}
          </p>
          <div className="flex flex-col gap-2.5">
            <Button onClick={onLoginClick} className="w-full justify-center">
              Login or Sign Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
