"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PenLine, Copy } from "lucide-react";
import { useState } from "react";

interface CopyPreviewProps {
  headline: string;
  subheadline: string;
  cta: string;
  copyLegenda: string;
  className?: string;
}

export function CopyPreview({
  headline,
  subheadline,
  cta,
  copyLegenda,
  className,
}: CopyPreviewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-accent" />
          Copy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Headline */}
        <div className="group">
          <div className="flex items-center justify-between mb-1.5">
            <Badge variant="accent">Headline</Badge>
            <button
              onClick={() => handleCopy(headline, "headline")}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xl font-semibold text-text-primary leading-tight">
            {headline}
          </p>
          {copied === "headline" && (
            <span className="text-xs text-emerald-400 mt-1">Copiado!</span>
          )}
        </div>

        {/* Subheadline */}
        <div className="group">
          <div className="flex items-center justify-between mb-1.5">
            <Badge variant="default">Subheadline</Badge>
            <button
              onClick={() => handleCopy(subheadline, "subheadline")}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-base text-text-secondary leading-relaxed">
            {subheadline}
          </p>
          {copied === "subheadline" && (
            <span className="text-xs text-emerald-400 mt-1">Copiado!</span>
          )}
        </div>

        {/* CTA */}
        <div>
          <Badge variant="success" className="mb-1.5">
            CTA
          </Badge>
          <div className="inline-block mt-2 px-5 py-2 bg-accent/15 border border-accent/30 rounded-lg text-accent-light font-medium text-sm">
            {cta}
          </div>
        </div>

        {/* Legenda */}
        <div className="group">
          <div className="flex items-center justify-between mb-1.5">
            <Badge variant="muted">Legenda</Badge>
            <button
              onClick={() => handleCopy(copyLegenda, "legenda")}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
            {copyLegenda}
          </p>
          {copied === "legenda" && (
            <span className="text-xs text-emerald-400 mt-1">Copiado!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
