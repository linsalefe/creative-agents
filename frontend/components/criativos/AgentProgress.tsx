"use client";

import { cn } from "@/lib/utils";
import {
  Target,
  PenLine,
  Palette,
  LayoutGrid,
  ImageIcon,
  Check,
  Loader2,
} from "lucide-react";

export type AgentStatus = "pending" | "active" | "completed";

export interface AgentStep {
  id: string;
  label: string;
  status: AgentStatus;
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  strategy: Target,
  copy: PenLine,
  creative_director: Palette,
  format: LayoutGrid,
  image: ImageIcon,
};

const DEFAULT_STEPS: AgentStep[] = [
  { id: "strategy", label: "Strategy", status: "pending" },
  { id: "copy", label: "Copy", status: "pending" },
  { id: "creative_director", label: "Creative Director", status: "pending" },
  { id: "format", label: "Format", status: "pending" },
  { id: "image", label: "Image", status: "pending" },
];

interface AgentProgressProps {
  steps?: AgentStep[];
  className?: string;
}

export function AgentProgress({ steps = DEFAULT_STEPS, className }: AgentProgressProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative h-1 bg-white/5 rounded-full mb-8 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        {progress > 0 && progress < 100 && (
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent-light rounded-full animate-pulse-slow"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>

      {/* Agent steps */}
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, i) => {
          const Icon = AGENT_ICONS[step.id] || Target;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                {/* Icon circle */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-500",
                    {
                      "border-border bg-white/5 text-text-muted":
                        step.status === "pending",
                      "border-accent bg-accent/15 text-accent-light glow-accent agent-active":
                        step.status === "active",
                      "border-emerald-500/50 bg-emerald-500/15 text-emerald-400":
                        step.status === "completed",
                    }
                  )}
                >
                  {step.status === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : step.status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-xs font-medium text-center transition-colors duration-300",
                    {
                      "text-text-muted": step.status === "pending",
                      "text-accent-light": step.status === "active",
                      "text-emerald-400": step.status === "completed",
                    }
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-shrink-0 w-8 mt-5">
                  <div
                    className={cn(
                      "h-px w-full transition-colors duration-500",
                      step.status === "completed"
                        ? "bg-emerald-500/40"
                        : "bg-white/10"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
