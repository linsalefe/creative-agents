import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "success" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-white/10 text-text-secondary": variant === "default",
          "bg-accent/15 text-accent-light": variant === "accent",
          "bg-emerald-500/15 text-emerald-400": variant === "success",
          "bg-white/5 text-text-muted": variant === "muted",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
