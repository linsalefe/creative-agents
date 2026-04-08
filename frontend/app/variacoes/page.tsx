"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Sparkles,
  Upload,
  X,
  ImageIcon,
  Eye,
  PenLine,
  Cpu,
  Download,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CopyVariation {
  headline: string;
  subheadline: string;
  cta: string;
}

interface VariationItem {
  copy: CopyVariation;
  imagem_url: string | null;
}

interface VisionAnalysis {
  headline: string;
  subheadline: string;
  cta: string;
  tom: string;
  publico: string;
  contexto: string;
  objetivo: string;
  estilo_visual: string;
  descricao_fundo: string;
}

interface VariationOutput {
  original_url: string;
  analise: VisionAnalysis;
  variacoes: VariationItem[];
}

type StepStatus = "pending" | "active" | "completed";

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveUrl(url: string) {
  return url.startsWith("/static/") ? `${API_URL}${url}` : url;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VariacoesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VariationOutput | null>(null);

  const initialSteps: PipelineStep[] = [
    { id: "vision", label: "Análise", icon: Eye, status: "pending" },
    { id: "variation", label: "Copys", icon: PenLine, status: "pending" },
    { id: "generation", label: "Edição", icon: Cpu, status: "pending" },
  ];
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // ---------- File handling ----------
  const handleFileSelect = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem (JPG ou PNG).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [preview]);

  // ---------- Progress simulation ----------
  const simulateProgress = useCallback(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    timeouts.push(
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) => (i === 0 ? { ...s, status: "active" } : s))
        );
      }, 0)
    );
    timeouts.push(
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) =>
            i === 0
              ? { ...s, status: "completed" }
              : i === 1
              ? { ...s, status: "active" }
              : s
          )
        );
      }, 5000)
    );
    timeouts.push(
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) =>
            i <= 1
              ? { ...s, status: "completed" }
              : i === 2
              ? { ...s, status: "active" }
              : s
          )
        );
      }, 12000)
    );

    return timeouts;
  }, []);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setSteps(initialSteps);

    const timeouts = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await api.post<VariationOutput>(
        "/criativos/variacoes",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as StepStatus })));
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao gerar variações";
      toast.error(message);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "pending" as StepStatus } : s
        )
      );
    } finally {
      timeouts.forEach(clearTimeout);
      setLoading(false);
    }
  }

  // ---------- Download ----------
  async function handleDownload(url: string, index: number) {
    try {
      const response = await fetch(resolveUrl(url));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `variacao-${index + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Erro ao baixar imagem.");
    }
  }

  async function handleDownloadAll() {
    if (!result) return;
    const items = result.variacoes.filter((v) => v.imagem_url);
    for (let i = 0; i < items.length; i++) {
      if (items[i].imagem_url) {
        await handleDownload(items[i].imagem_url!, i);
      }
    }
  }

  // ---------- Render ----------
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8 px-6 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gerar Variações
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie a imagem de um criativo e gere 5 variações automaticamente.
            </p>
          </div>
        </div>

        {/* Upload card */}
        <Card className="border border-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Upload / Preview area */}
              {!preview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-3 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${
                      dragging
                        ? "border-violet-500/40 bg-violet-500/[0.02]"
                        : "border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/[0.02]"
                    }
                  `}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      dragging ? "bg-violet-500/15" : "bg-secondary"
                    }`}
                  >
                    <Upload
                      className={`w-6 h-6 ${
                        dragging ? "text-violet-400" : "text-violet-400"
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground">
                      <span className="text-violet-400 font-medium">
                        Clique para selecionar
                      </span>{" "}
                      ou arraste uma imagem
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG ou PNG
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white/[0.02] overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    <div className="relative w-48 max-w-full rounded-xl overflow-hidden flex-shrink-0 shadow-2xl">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-auto object-cover rounded-xl"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {file?.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {file && formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Generate button */}
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={!file}
                className="w-full md:w-auto active:scale-[0.98] transition-transform shadow-lg shadow-violet-600/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? "Gerando variações..." : "Gerar Variações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pipeline progress */}
        {loading && (
          <Card className="animate-fade-in glow-primary border border-border">
            <CardHeader>
              <CardTitle className="text-base">
                Pipeline de variações em execução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const isLast = i === steps.length - 1;

                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-2 flex-1">
                        {/* Circle */}
                        <div
                          className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 ${
                            step.status === "completed"
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                              : step.status === "active"
                              ? "border-violet-500/50 bg-violet-500/15 text-violet-400 agent-active"
                              : "border-border bg-secondary text-muted-foreground"
                          }`}
                        >
                          {step.status === "completed" ? (
                            <Check className="w-5 h-5" />
                          ) : step.status === "active" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                          {/* Glow ring for active */}
                          {step.status === "active" && (
                            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                          )}
                        </div>

                        {/* Label */}
                        <span
                          className={`text-xs font-medium text-center transition-colors duration-300 ${
                            step.status === "completed"
                              ? "text-emerald-400"
                              : step.status === "active"
                              ? "text-violet-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>

                      {/* Connector line */}
                      {!isLast && (
                        <div className="flex-shrink-0 w-12 mt-[-1rem]">
                          <div
                            className={`h-0.5 w-full transition-colors duration-500 ${
                              step.status === "completed"
                                ? "bg-emerald-500/40"
                                : "bg-border"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                {result.variacoes.length} Variações Geradas
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="success">Completo</Badge>
                {result.variacoes.some((v) => v.imagem_url) && (
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} className="active:scale-[0.98]">
                    <Download className="w-4 h-4 mr-1.5" />
                    Download Todas
                  </Button>
                )}
              </div>
            </div>

            {/* Original analysis */}
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4 text-violet-400" />
                  Análise do Criativo Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnalysisField label="Headline" value={result.analise.headline} />
                  <AnalysisField label="Tom" value={result.analise.tom} />
                  <AnalysisField label="Público" value={result.analise.publico} />
                  <AnalysisField label="Objetivo" value={result.analise.objetivo} />
                  <AnalysisField label="Estilo Visual" value={result.analise.estilo_visual} />
                </div>
              </CardContent>
            </Card>

            {/* Variation cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {result.variacoes.map((item, i) => (
                <Card key={i} className="group overflow-hidden p-0 border border-border hover:scale-[1.02] hover:shadow-xl transition-all duration-300">
                  {/* Image */}
                  {item.imagem_url ? (
                    <div className="relative aspect-square bg-secondary overflow-hidden">
                      <img
                        src={resolveUrl(item.imagem_url)}
                        alt={item.copy.headline}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {/* Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge variant="accent" className="text-[10px] shadow-lg">
                          Variação {i + 1}
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleDownload(item.imagem_url!, i)}
                        className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70 active:scale-[0.98]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-square bg-secondary flex items-center justify-center relative">
                      <PenLine className="w-8 h-8 text-muted-foreground" />
                      <div className="absolute top-3 left-3">
                        <Badge variant="accent" className="text-[10px]">
                          Variação {i + 1}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Copy */}
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {item.copy.headline}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.copy.subheadline}
                    </p>
                    <div className="pt-1">
                      <span className="inline-block px-3 py-1 bg-violet-500/15 border border-violet-500/30 rounded-md text-violet-400 text-xs font-medium">
                        {item.copy.cta}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------
function AnalysisField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
