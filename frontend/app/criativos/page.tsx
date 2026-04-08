"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AgentProgress,
  type AgentStep,
} from "@/components/criativos/AgentProgress";
import { CopyPreview } from "@/components/criativos/CopyPreview";
import { CriativoCard } from "@/components/criativos/CriativoCard";
import {
  Sparkles,
  Target,
  Palette,
  LayoutGrid,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  PenLine,
  Download,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

const API_URL = "http://localhost:8000";

function resolveUrl(url: string) {
  return url.startsWith("/static/") ? `${API_URL}${url}` : url;
}

interface CreativeOutput {
  id: string;
  estrategia: {
    objetivo: string;
    etapa_funil: string;
    cta: string;
    tom: string;
    plataforma: string;
  };
  copy: {
    headline: string;
    subheadline: string;
    cta: string;
    copy_legenda: string;
  };
  direcao_criativa: {
    conceito: string;
    cores_dominantes: string[];
    estilo_visual: string;
    elementos_visuais: string;
    prompt_ideogram: string;
  };
  formato: {
    formato: string;
    dimensoes: string;
    template_bannerbear: string;
    variantes: string[];
    especificacoes: Record<string, unknown>;
  };
  imagem: {
    imagem_url: string;
    criativo_final_url: string | null;
    variantes_urls: string[];
  };
}

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

const AGENT_IDS = ["strategy", "copy", "creative_director", "format", "image"] as const;
const AGENT_DURATIONS = [3000, 4000, 5000, 2000, 8000];

const VARIATION_AGENT_IDS = ["vision", "variation", "generation"] as const;
const VARIATION_AGENT_LABELS: Record<string, string> = {
  vision: "Analise (Nano Banana Pro)",
  variation: "Copys (Nano Banana Pro)",
  generation: "Edicao (Nano Banana Pro)",
};

export default function CriativosPage() {
  // --- Gerar criativo ---
  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [contexto, setContexto] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreativeOutput | null>(null);
  const [historico, setHistorico] = useState<CreativeOutput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(
    AGENT_IDS.map((id) => ({
      id,
      label: id === "creative_director" ? "Creative Director" : id.charAt(0).toUpperCase() + id.slice(1),
      status: "pending" as const,
    }))
  );
  const [showDetails, setShowDetails] = useState(false);

  // --- Variacoes ---
  const [varFile, setVarFile] = useState<File | null>(null);
  const [varPreview, setVarPreview] = useState<string | null>(null);
  const [varDragging, setVarDragging] = useState(false);
  const varInputRef = useRef<HTMLInputElement>(null);
  const [varLoading, setVarLoading] = useState(false);
  const [varResult, setVarResult] = useState<VariationOutput | null>(null);
  const [varError, setVarError] = useState<string | null>(null);
  const [varSteps, setVarSteps] = useState<AgentStep[]>(
    VARIATION_AGENT_IDS.map((id) => ({
      id,
      label: VARIATION_AGENT_LABELS[id],
      status: "pending" as const,
    }))
  );

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    try {
      const res = await fetch(`${API_URL}/criativos/historico/`);
      if (res.ok) {
        const data = await res.json();
        setHistorico(data);
      }
    } catch {
      // API may not be running
    }
  };

  // --- Gerar criativo handlers ---
  const simulateProgress = () => {
    let elapsed = 0;
    AGENT_IDS.forEach((_, i) => {
      const startTime = elapsed;
      const duration = AGENT_DURATIONS[i];
      setTimeout(() => {
        setAgentSteps((prev) =>
          prev.map((step, j) => (j === i ? { ...step, status: "active" } : step))
        );
      }, startTime);
      setTimeout(() => {
        setAgentSteps((prev) =>
          prev.map((step, j) => (j === i ? { ...step, status: "completed" } : step))
        );
      }, startTime + duration);
      elapsed += duration;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowDetails(false);
    setAgentSteps(
      AGENT_IDS.map((id) => ({
        id,
        label: id === "creative_director" ? "Creative Director" : id.charAt(0).toUpperCase() + id.slice(1),
        status: "pending" as const,
      }))
    );
    simulateProgress();

    try {
      const res = await fetch(`${API_URL}/criativos/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto,
          publico,
          contexto,
          plataforma: plataforma || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Erro ${res.status}`);
      }
      const data: CreativeOutput = await res.json();
      setAgentSteps((prev) =>
        prev.map((step) => ({ ...step, status: "completed" as const }))
      );
      setResult(data);
      setHistorico((prev) => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar criativo");
      setAgentSteps((prev) =>
        prev.map((step) =>
          step.status === "active" ? { ...step, status: "pending" } : step
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Variacoes handlers ---
  const simulateVarProgress = () => {
    // Vision: 0-5s, Variation: 5-12s, Generation: 12-30s
    setTimeout(() => {
      setVarSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "active" } : s))
      );
    }, 0);
    setTimeout(() => {
      setVarSteps((prev) =>
        prev.map((s, i) => (i === 0 ? { ...s, status: "completed" } : i === 1 ? { ...s, status: "active" } : s))
      );
    }, 5000);
    setTimeout(() => {
      setVarSteps((prev) =>
        prev.map((s, i) => (i <= 1 ? { ...s, status: "completed" } : i === 2 ? { ...s, status: "active" } : s))
      );
    }, 12000);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setVarFile(file);
    const url = URL.createObjectURL(file);
    setVarPreview(url);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setVarDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const clearFile = () => {
    setVarFile(null);
    if (varPreview) URL.revokeObjectURL(varPreview);
    setVarPreview(null);
    if (varInputRef.current) varInputRef.current.value = "";
  };

  const handleVariacoes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varFile) return;
    setVarLoading(true);
    setVarError(null);
    setVarResult(null);
    setVarSteps(
      VARIATION_AGENT_IDS.map((id) => ({
        id,
        label: VARIATION_AGENT_LABELS[id],
        status: "pending" as const,
      }))
    );
    simulateVarProgress();

    try {
      const formData = new FormData();
      formData.append("file", varFile);

      const res = await fetch(`${API_URL}/criativos/variacoes`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Erro ${res.status}`);
      }
      const data: VariationOutput = await res.json();
      setVarSteps((prev) =>
        prev.map((s) => ({ ...s, status: "completed" as const }))
      );
      setVarResult(data);
    } catch (err) {
      setVarError(err instanceof Error ? err.message : "Erro ao gerar variacoes");
      setVarSteps((prev) =>
        prev.map((s) =>
          s.status === "active" ? { ...s, status: "pending" } : s
        )
      );
    } finally {
      setVarLoading(false);
    }
  };

  const handleDownloadVar = async (url: string, index: number) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `variacao-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">
                Creative Agents
              </h1>
              <p className="text-xs text-text-muted">
                Pipeline multi-agente de criativos
              </p>
            </div>
          </div>
          <Badge variant="accent" className="text-xs">
            7 agentes
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* ========== GERAR CRIATIVO ========== */}
        <section className="animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Novo Criativo</CardTitle>
              <CardDescription>
                Preencha o briefing e os agentes fazem o resto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="produto">Produto</Label>
                    <Input
                      id="produto"
                      placeholder="Ex: Formacao em Psicologia Clinica"
                      value={produto}
                      onChange={(e) => setProduto(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="publico">Publico-alvo</Label>
                    <Input
                      id="publico"
                      placeholder="Ex: psicologos e estudantes"
                      value={publico}
                      onChange={(e) => setPublico(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contexto">Contexto</Label>
                    <Input
                      id="contexto"
                      placeholder="Ex: lancamento de nova turma"
                      value={contexto}
                      onChange={(e) => setContexto(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="plataforma">Plataforma</Label>
                    <Select
                      id="plataforma"
                      value={plataforma}
                      onChange={(e) => setPlataforma(e.target.value)}
                    >
                      <option value="">Automatico</option>
                      <option value="instagram_feed">Instagram Feed</option>
                      <option value="instagram_stories">Instagram Stories</option>
                      <option value="facebook_feed">Facebook Feed</option>
                      <option value="google_display">Google Display</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" size="lg" loading={loading} className="w-full md:w-auto">
                  {loading ? "Gerando criativo..." : "Gerar Criativo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Agent Progress - Gerar */}
        {loading && (
          <section className="animate-fade-in">
            <Card className="glow-accent">
              <CardHeader>
                <CardTitle className="text-base">Pipeline em execucao</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentProgress steps={agentSteps} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Error - Gerar */}
        {error && (
          <Card className="border-red-500/30 bg-red-500/5 animate-fade-in">
            <CardContent className="py-4">
              <p className="text-red-400 text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result - Gerar */}
        {result && (
          <section className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">Resultado</h2>
              <Badge variant="success">Completo</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden p-0">
                <div className="aspect-square relative bg-white/5">
                  <img
                    src={result.imagem.criativo_final_url || result.imagem.imagem_url}
                    alt={result.copy.headline}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="accent">{result.formato.dimensoes}</Badge>
                    <a
                      href={result.imagem.imagem_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:text-accent-light transition-colors"
                    >
                      Abrir original
                    </a>
                  </div>
                </CardContent>
              </Card>
              <CopyPreview
                headline={result.copy.headline}
                subheadline={result.copy.subheadline}
                cta={result.copy.cta}
                copyLegenda={result.copy.copy_legenda}
              />
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showDetails ? "Ocultar detalhes" : "Ver detalhes completos"}
            </button>

            {showDetails && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-4 h-4 text-accent" />
                      Estrategia
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="Objetivo" value={result.estrategia.objetivo} />
                    <DetailRow label="Funil" value={result.estrategia.etapa_funil} />
                    <DetailRow label="Tom" value={result.estrategia.tom} />
                    <DetailRow label="Plataforma" value={result.estrategia.plataforma} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Palette className="w-4 h-4 text-accent" />
                      Direcao Criativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="Conceito" value={result.direcao_criativa.conceito} />
                    <DetailRow label="Estilo" value={result.direcao_criativa.estilo_visual} />
                    <div>
                      <span className="text-xs text-text-muted">Cores</span>
                      <div className="flex gap-1.5 mt-1">
                        {result.direcao_criativa.cores_dominantes.map((cor) => (
                          <div
                            key={cor}
                            className="w-6 h-6 rounded-md border border-white/10"
                            style={{ backgroundColor: cor }}
                            title={cor}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LayoutGrid className="w-4 h-4 text-accent" />
                      Formato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="Formato" value={result.formato.formato} />
                    <DetailRow label="Dimensoes" value={result.formato.dimensoes} />
                    <DetailRow label="Variantes" value={result.formato.variantes.join(", ")} />
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        )}

        {/* ========== VARIACOES ========== */}
        <section className="animate-slide-up">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Layers className="w-5 h-5 text-accent" />
                Gerar Variacoes
              </CardTitle>
              <CardDescription>
                Envie a imagem de um criativo existente e gere 5 variacoes completas (copy + fundo) automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVariacoes} className="space-y-5">
                {/* Upload area */}
                {!varPreview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setVarDragging(true); }}
                    onDragLeave={() => setVarDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => varInputRef.current?.click()}
                    className={`
                      relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                      ${varDragging
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-border-hover hover:bg-white/[0.02]"
                      }
                    `}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${varDragging ? "bg-accent/20" : "bg-white/5"}`}>
                      <Upload className={`w-5 h-5 ${varDragging ? "text-accent-light" : "text-text-muted"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-text-secondary">
                        <span className="text-accent font-medium">Clique para selecionar</span> ou arraste uma imagem
                      </p>
                      <p className="text-xs text-text-muted mt-1">JPG ou PNG</p>
                    </div>
                    <input
                      ref={varInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="rounded-xl overflow-hidden border border-border bg-white/[0.02]">
                      <div className="flex items-start gap-4 p-4">
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                          <img
                            src={varPreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <ImageIcon className="w-4 h-4 text-accent" />
                            <span className="text-sm font-medium text-text-primary truncate">
                              {varFile?.name}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">
                            {varFile && (varFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearFile}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  loading={varLoading}
                  variant="secondary"
                  disabled={!varFile}
                  className="w-full md:w-auto"
                >
                  {varLoading ? "Analisando e gerando..." : "Gerar Variacoes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Agent Progress - Variacoes */}
        {varLoading && (
          <section className="animate-fade-in">
            <Card className="glow-accent">
              <CardHeader>
                <CardTitle className="text-base">Pipeline de variacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <AgentProgress steps={varSteps} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Error - Variacoes */}
        {varError && (
          <Card className="border-red-500/30 bg-red-500/5 animate-fade-in">
            <CardContent className="py-4">
              <p className="text-red-400 text-sm">{varError}</p>
            </CardContent>
          </Card>
        )}

        {/* Result - Variacoes */}
        {varResult && (
          <section className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" />
                5 Variacoes Geradas
              </h2>
              <Badge variant="success">Completo</Badge>
            </div>

            {/* Analise do original */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4 text-accent" />
                  Analise do Criativo Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailRow label="Headline" value={varResult.analise.headline} />
                  <DetailRow label="Tom" value={varResult.analise.tom} />
                  <DetailRow label="Publico" value={varResult.analise.publico} />
                  <DetailRow label="Objetivo" value={varResult.analise.objetivo} />
                  <DetailRow label="Estilo Visual" value={varResult.analise.estilo_visual} />
                  <DetailRow label="Fundo Original" value={varResult.analise.descricao_fundo} />
                </div>
              </CardContent>
            </Card>

            {/* Grid 2x3 de variacoes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {varResult.variacoes.map((item, i) => (
                  <Card key={i} className="group overflow-hidden p-0">
                    {/* Image */}
                    {item.imagem_url ? (
                      <div className="relative aspect-square bg-white/5 overflow-hidden">
                        <img
                          src={resolveUrl(item.imagem_url)}
                          alt={item.copy.headline}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <button
                          onClick={() => handleDownloadVar(resolveUrl(item.imagem_url!), i)}
                          className="absolute bottom-2 right-2 p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-square bg-white/5 flex items-center justify-center">
                        <PenLine className="w-8 h-8 text-text-muted" />
                      </div>
                    )}

                    {/* Copy */}
                    <CardContent className="p-4 space-y-2">
                      <Badge variant="accent" className="text-[10px]">
                        Variacao {i + 1}
                      </Badge>
                      <p className="text-sm font-semibold text-text-primary leading-tight">
                        {item.copy.headline}
                      </p>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {item.copy.subheadline}
                      </p>
                      <div className="pt-1">
                        <span className="inline-block px-3 py-1 bg-accent/15 border border-accent/30 rounded-md text-accent-light text-xs font-medium">
                          {item.copy.cta}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          </section>
        )}

        {/* ========== HISTORICO ========== */}
        {historico.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-text-muted" />
              <h2 className="text-xl font-semibold text-text-primary">Historico</h2>
              <Badge variant="muted">{historico.length}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {historico.map((item) => (
                <CriativoCard
                  key={item.id}
                  id={item.id}
                  imagemUrl={item.imagem.criativo_final_url || item.imagem.imagem_url}
                  headline={item.copy.headline}
                  cta={item.copy.cta}
                  plataforma={item.estrategia.plataforma}
                  objetivo={item.estrategia.objetivo}
                  onClick={() => setResult(item)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <p className="text-sm text-text-primary mt-0.5">{value}</p>
    </div>
  );
}
