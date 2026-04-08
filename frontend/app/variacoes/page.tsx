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
  Copy,
  FileImage,
  Smartphone,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CopyVariation {
  headline: string;
  subheadline: string;
  cta: string;
  legenda: string;
}

interface VariationItem {
  copy: CopyVariation;
  imagem_url: string | null;
  imagem_story_url: string | null;
  formato: "feed" | "story" | "ambos";
}

interface VisionAnalysis {
  headline: string;
  tom: string;
  publico: string;
  objetivo: string;
  [key: string]: unknown;
}

interface VariationOutput {
  original_url: string;
  analise: VisionAnalysis;
  variacoes: VariationItem[];
  formato: "feed" | "story" | "ambos";
}

interface JobResponse {
  job_id: string;
  status: "processing" | "completed" | "failed";
  resultado?: VariationOutput;
  erro?: string;
  formato: string;
}

type StepStatus = "pending" | "active" | "completed";

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
}

type FormatoOption = "feed" | "story" | "ambos";

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
// Format options config
// ---------------------------------------------------------------------------
const FORMAT_OPTIONS: {
  id: FormatoOption;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    id: "feed",
    label: "Feed",
    sublabel: "Quadrado 1:1",
    icon: FileImage,
  },
  {
    id: "story",
    label: "Story",
    sublabel: "Vertical 9:16",
    icon: Smartphone,
  },
  {
    id: "ambos",
    label: "Feed + Story",
    sublabel: "Ambos os formatos",
    icon: Zap,
    badge: "Recomendado",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
];

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

  // Format state
  const [formato, setFormato] = useState<FormatoOption>("ambos");

  // Pipeline state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VariationOutput | null>(null);

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Copied legendas tracker
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const initialSteps: PipelineStep[] = [
    { id: "vision", label: "Análise", icon: Eye, status: "pending" },
    { id: "variation", label: "Copys", icon: PenLine, status: "pending" },
    { id: "generation", label: "Artes", icon: Cpu, status: "pending" },
  ];
  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Restaurar job do localStorage ao montar
  useEffect(() => {
    const savedJobId = localStorage.getItem("variacoes_job_id");
    if (savedJobId && !result) {
      setJobId(savedJobId);
      setJobStatus("processing");
      setLoading(true);
      setSteps(initialSteps.map((s, i) => i === 2 ? { ...s, status: "active" } : { ...s, status: "completed" }));
      toast.info("Retomando geração anterior...");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling effect — roda quando jobId muda
  useEffect(() => {
    if (!jobId || jobStatus !== "processing") return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<JobResponse>(`/criativos/jobs/${jobId}`);

        if (data.status === "completed" && data.resultado) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" as StepStatus })));
          setResult(data.resultado);
          setJobStatus("completed");
          setLoading(false);
          localStorage.removeItem("variacoes_job_id");
          toast.success("Variações geradas com sucesso!");
        } else if (data.status === "failed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setJobStatus("failed");
          setLoading(false);
          localStorage.removeItem("variacoes_job_id");
          toast.error(data.erro || "Erro ao gerar variações");
          setSteps((prev) =>
            prev.map((s) => s.status === "active" ? { ...s, status: "pending" as StepStatus } : s)
          );
        }
      } catch {
        // Erro de rede — continua tentando
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId, jobStatus]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
    const durations = formato === "ambos" ? [5000, 14000] : [5000, 12000];

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
            i === 0 ? { ...s, status: "completed" } : i === 1 ? { ...s, status: "active" } : s
          )
        );
      }, durations[0])
    );
    timeouts.push(
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i) =>
            i <= 1 ? { ...s, status: "completed" } : i === 2 ? { ...s, status: "active" } : s
          )
        );
      }, durations[1])
    );

    return timeouts;
  }, [formato]);

  // ---------- Submit ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setSteps(initialSteps);
    setJobStatus("processing");

    const timeouts = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("formato", formato);

      const { data } = await api.post<{ job_id: string; status: string }>(
        "/criativos/variacoes",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Salvar job_id no localStorage para persistir navegação
      setJobId(data.job_id);
      localStorage.setItem("variacoes_job_id", data.job_id);
      toast.info("Geração iniciada! Você pode navegar — a IA continua trabalhando.");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar geração";
      toast.error(message);
      setJobStatus("failed");
      setLoading(false);
      setSteps((prev) =>
        prev.map((s) => s.status === "active" ? { ...s, status: "pending" as StepStatus } : s)
      );
    } finally {
      timeouts.forEach(clearTimeout);
      // NÃO setar loading=false aqui — o polling vai setar quando terminar
    }
  }

  // ---------- Copy legenda ----------
  const handleCopyLegenda = useCallback((legenda: string, index: number) => {
    navigator.clipboard.writeText(legenda).then(() => {
      setCopiedIndex(index);
      toast.success("Legenda copiada!");
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  // ---------- Download ----------
  async function handleDownload(url: string, filename: string) {
    try {
      const response = await fetch(resolveUrl(url));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
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
    for (let i = 0; i < result.variacoes.length; i++) {
      const item = result.variacoes[i];
      if (item.imagem_url) {
        await handleDownload(item.imagem_url, `feed-variacao-${i + 1}.png`);
      }
      if (item.imagem_story_url) {
        await handleDownload(item.imagem_story_url, `story-variacao-${i + 1}.png`);
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

  const isDual = result?.formato === "ambos";

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8 px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gerar Variações</h1>
            <p className="text-sm text-muted-foreground">
              Envie um criativo e gere 5 variações com copy, artes e legenda prontas.
            </p>
          </div>
        </div>

        {/* Upload + Config card */}
        <Card className="border border-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload area */}
              {!preview ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative flex flex-col items-center justify-center gap-3 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${dragging
                      ? "border-violet-500/40 bg-violet-500/[0.02]"
                      : "border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/[0.02]"
                    }
                  `}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-violet-500/15" : "bg-secondary"}`}>
                    <Upload className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-foreground">
                      <span className="text-violet-400 font-medium">Clique para selecionar</span>{" "}
                      ou arraste uma imagem
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG ou PNG</p>
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
                      <img src={preview} alt="Preview" className="w-full h-auto object-cover rounded-xl" />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ImageIcon className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-foreground truncate">{file?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{file && formatFileSize(file.size)}</p>
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

              {/* Format selector */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Formato de saída</label>
                <div className="grid grid-cols-3 gap-3">
                  {FORMAT_OPTIONS.map((opt) => {
                    const isSelected = formato === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormato(opt.id)}
                        className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {/* Badge "Recomendado" */}
                        {opt.badge && (
                          <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                            {opt.badge}
                          </span>
                        )}

                        {/* Icon visual */}
                        <div className="flex items-center gap-1">
                          {opt.id === "ambos" ? (
                            <div className="flex items-center gap-0.5">
                              <div className={`w-7 h-7 rounded border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40"}`}>
                                <div className={`w-4 h-4 rounded-sm ${isSelected ? "bg-primary/60" : "bg-muted-foreground/30"}`} />
                              </div>
                              <span className="text-xs font-bold opacity-60">+</span>
                              <div className={`w-5 h-7 rounded border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40"}`}>
                                <div className={`w-2.5 h-4 rounded-sm ${isSelected ? "bg-primary/60" : "bg-muted-foreground/30"}`} />
                              </div>
                            </div>
                          ) : opt.id === "feed" ? (
                            <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40"}`}>
                              <div className={`w-6 h-6 rounded ${isSelected ? "bg-primary/60" : "bg-muted-foreground/30"}`} />
                            </div>
                          ) : (
                            <div className={`w-7 h-10 rounded-lg border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary/20" : "border-muted-foreground/40"}`}>
                              <div className={`w-4 h-6 rounded ${isSelected ? "bg-primary/60" : "bg-muted-foreground/30"}`} />
                            </div>
                          )}
                        </div>

                        <div className="text-center">
                          <p className="text-sm font-semibold leading-none">{opt.label}</p>
                          <p className="text-[11px] opacity-60 mt-1">{opt.sublabel}</p>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

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
          <Card className="animate-fade-in border border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Gerando suas variações...
                <Badge variant="outline" className="text-xs font-normal">
                  {formato === "ambos" ? "Feed + Story" : formato === "story" ? "Story" : "Feed"}
                </Badge>
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
                        <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 ${
                          step.status === "completed"
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                            : step.status === "active"
                            ? "border-violet-500/50 bg-violet-500/15 text-violet-400"
                            : "border-border bg-secondary text-muted-foreground"
                        }`}>
                          {step.status === "completed" ? (
                            <Check className="w-5 h-5" />
                          ) : step.status === "active" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                          {step.status === "active" && (
                            <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                          )}
                        </div>
                        <span className={`text-xs font-medium text-center transition-colors duration-300 ${
                          step.status === "completed" ? "text-emerald-400" :
                          step.status === "active" ? "text-violet-400" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div className="flex-shrink-0 w-12 mt-[-1rem]">
                          <div className={`h-0.5 w-full transition-colors duration-500 ${step.status === "completed" ? "bg-emerald-500/40" : "bg-border"}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Persistence banner */}
        {loading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm text-blue-400">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span>
              Geração em andamento — você pode navegar pelo app sem perder o progresso.
              {jobId && <span className="opacity-60 ml-1 font-mono text-xs">#{jobId.slice(0, 8)}</span>}
            </span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                {result.variacoes.length} Variações Geradas
                <Badge variant="secondary" className="ml-1">
                  {isDual ? "Feed + Story" : result.formato === "story" ? "Story" : "Feed"}
                </Badge>
              </h2>
              <div className="flex items-center gap-3">
                <Badge variant="success">Completo</Badge>
                <Button variant="outline" size="sm" onClick={handleDownloadAll} className="active:scale-[0.98]">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download Todas
                </Button>
              </div>
            </div>

            {/* Variation cards */}
            <div className="space-y-6">
              {result.variacoes.map((item, i) => (
                <Card key={i} className="border border-border overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Badge variant="accent" className="text-[11px]">Variação {i + 1}</Badge>
                      <span className="text-sm font-semibold text-foreground">{item.copy.headline}</span>
                    </div>
                  </div>

                  <CardContent className="p-5">
                    <div className={`grid gap-5 ${isDual ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
                      {/* Images column */}
                      <div className={`flex gap-4 ${isDual ? "flex-row" : "flex-col sm:flex-row"}`}>
                        {/* Feed image */}
                        {item.imagem_url && (
                          <div className="flex-1 space-y-2">
                            {isDual && (
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <FileImage className="w-3 h-3" /> Feed 1:1
                              </p>
                            )}
                            <div className={`relative group overflow-hidden bg-secondary rounded-xl ${
                              result.formato === "story" && !isDual ? "aspect-[9/16]" : "aspect-square"
                            }`}>
                              <img
                                src={resolveUrl(item.imagem_url)}
                                alt={item.copy.headline}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <button
                                onClick={() => handleDownload(item.imagem_url!, `feed-variacao-${i + 1}.png`)}
                                className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Story image */}
                        {item.imagem_story_url && (
                          <div className="flex-1 space-y-2">
                            {isDual && (
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Smartphone className="w-3 h-3" /> Story 9:16
                              </p>
                            )}
                            <div className="relative group aspect-[9/16] rounded-xl overflow-hidden bg-secondary">
                              <img
                                src={resolveUrl(item.imagem_story_url)}
                                alt={`Story - ${item.copy.headline}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <button
                                onClick={() => handleDownload(item.imagem_story_url!, `story-variacao-${i + 1}.png`)}
                                className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Copy + Legenda column */}
                      <div className="flex flex-col gap-4">
                        {/* Copy details */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headline</p>
                            <p className="text-sm font-semibold text-foreground">{item.copy.headline}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtítulo</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.copy.subheadline}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CTA</p>
                            <span className="inline-block px-3 py-1 bg-violet-500/15 border border-violet-500/30 rounded-md text-violet-400 text-xs font-medium">
                              {item.copy.cta}
                            </span>
                          </div>
                        </div>

                        {/* Legenda card */}
                        {item.copy.legenda && (
                          <div className="mt-auto rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5 text-primary" />
                                Sugestão de Legenda
                              </p>
                              <button
                                onClick={() => handleCopyLegenda(item.copy.legenda, i)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 font-medium ${
                                  copiedIndex === i
                                    ? "bg-green-500/15 border-green-500/30 text-green-400"
                                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                }`}
                              >
                                {copiedIndex === i ? (
                                  <><Check className="w-3 h-3" /> Copiado!</>
                                ) : (
                                  <><Copy className="w-3 h-3" /> Copiar</>
                                )}
                              </button>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {item.copy.legenda}
                            </p>
                          </div>
                        )}
                      </div>
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
