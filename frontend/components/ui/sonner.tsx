"use client";

import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

function Toaster({
  className,
  ...props
}: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      data-slot="sonner-toaster"
      className={cn("toaster group", className)}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
