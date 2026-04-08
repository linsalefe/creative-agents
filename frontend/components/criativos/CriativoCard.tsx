"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, ExternalLink } from "lucide-react";

interface CriativoCardProps {
  id?: string;
  imagemUrl: string;
  headline: string;
  cta: string;
  plataforma: string;
  objetivo: string;
  onClick?: () => void;
  className?: string;
}

export function CriativoCard({
  imagemUrl,
  headline,
  cta,
  plataforma,
  objetivo,
  onClick,
  className,
}: CriativoCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const response = await fetch(imagemUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `criativo-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden p-0 hover:glow-accent",
        className
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-white/5">
        <img
          src={imagemUrl}
          alt={headline}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Overlay actions */}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="secondary"
            className="bg-black/50 backdrop-blur-sm border-white/20 hover:bg-black/70"
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <a
            href={imagemUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/50 backdrop-blur-sm border-white/20 hover:bg-black/70"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-medium text-text-primary truncate">
          {headline}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <Badge variant="accent">{plataforma}</Badge>
            <Badge variant="muted">{objetivo}</Badge>
          </div>
        </div>
        <div className="text-xs text-accent-light font-medium">{cta}</div>
      </CardContent>
    </Card>
  );
}
