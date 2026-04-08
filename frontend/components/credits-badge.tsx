"use client";

import { Coins } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface CreditsBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function CreditsBadge({ className, showLabel = false }: CreditsBadgeProps) {
  const { user } = useAuth();

  if (!user) return null;

  const isLow = user.credits < 100;
  const isMedium = user.credits >= 100 && user.credits < 300;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono border transition-colors",
        isLow && "bg-red-500/10 text-red-400 border-red-500/20",
        isMedium && "bg-amber-500/10 text-amber-400 border-amber-500/20",
        !isLow && !isMedium && "bg-green-500/10 text-green-400 border-green-500/20",
        className
      )}
    >
      <Coins className="w-3.5 h-3.5" />
      {user.credits.toLocaleString()}
      {showLabel && <span className="opacity-70 font-normal">creditos</span>}
    </div>
  );
}
