"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Play,
  Download,
  Loader2,
  Clock,
  Sparkles,
  ImageIcon,
  Layers,
  Type,
  Copy,
  Check,
  CloudUpload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import { toast } from "sonner";

const resolveUrl = (url: string) => {
  if (!url) return url;
  return url.startsWith("/static/") ? url : url;
};

interface VideoOutput {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  duracao_segundos: number;
  tipo: string;
  formato: string;
  dimensoes: string;
  copy_legenda: string | null;
  script: {
    tipo: string;
    duracao_segundos: number;
    fps: number;
    cor_primaria: string;
    cor_secundaria: string;
    textos: unknown[];
  };
}

interface JobStatus {
  job_id: string;
  status: "processing" | "completed" | "failed";
  resultado: VideoOutput | null;
  erro: string | null;
}

const TIPOS_VIDEO = [
  {
    value: "ken_burns",
    label: "Imagem Animada",
    desc: "Zoom + pan suave sobre imagem",
    icon: ImageIcon,
  },
  {
    value: "slideshow",
    label: "Slideshow",
    desc: "3-4 imagens com transições",
    icon: Layers,
  },
  {
    value: "motion_graphics",
    label: "Motion Graphics",
    desc: "Texto animado + shapes",
    icon: Type,
  },
];

const PLATAFORMAS = [
  { value: "feed", label: "Feed (1:1)", dimensoes: "1080x1080" },
  { value: "stories", label: "Stories (9:16)", dimensoes: "1080x1920" },
  { value: "reels", label: "Reels (9:16)", dimensoes: "1080x1920" },
];

export default function VideosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [contexto, setContexto] = useState("");
  const [tipo, setTipo] = useState("ken_burns");
  const [plataforma, setPlataforma] = useState("stories");
  const [duracao, setDuracao] = useState(10);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoOutput | null>(null);
  const [historico, setHistorico] = useState<VideoOutput[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [copied, setCopied] = useState(false);

  // Drive export
  const [driveExportOpen, setDriveExportOpen] = useState(false);
  const [driveExportProduto, setDriveExportProduto] = useState("");
  const [driveExporting, setDriveExporting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadHistorico();
  }, [user]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadHistorico = async () => {
    try {
      const res = await api.get("/videos/historico");
      setHistorico(res.data);
    } catch {
      // silent
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleGerar = async () => {
    if (!produto || !publico || !contexto) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setGenerating(true);
    setCurrentVideo(null);

    try {
      const formData = new FormData();
      formData.append("produto", produto);
      formData.append("publico", publico);
      formData.append("contexto", contexto);
      formData.append("tipo", tipo);
      formData.append("plataforma", plataforma);
      formData.append("duracao_segundos", duracao.toString());
      if (imagemFile) {
        formData.append("file", imagemFile);
      }

      const res = await api.post("/videos/gerar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const id = res.data.job_id;
      setJobId(id);
      toast.success("Geração iniciada! Aguarde...");

      pollRef.current = setInterval(async () => {
        try {
          const jobRes = await api.get(`/videos/jobs/${id}`);
          const job: JobStatus = jobRes.data;

          if (job.status === "completed" && job.resultado) {
            if (pollRef.current) clearInterval(pollRef.current);
            setCurrentVideo(job.resultado);
            setGenerating(false);
            setJobId(null);
            setHistorico((prev) => [job.resultado!, ...prev]);
            toast.success("Vídeo gerado com sucesso!");
          } else if (job.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setGenerating(false);
            setJobId(null);
            toast.error(job.erro || "Erro na geração do vídeo");
          }
        } catch {
          // Keep polling
        }
      }, 5000);
    } catch (err: unknown) {
      setGenerating(false);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Erro ao iniciar geração");
    }
  };

  const handleCopyLegenda = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Legenda copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportVideoDrive = async () => {
    if (!currentVideo) return;
    try {
      const statusRes = await api.get("/drive/status");
      if (!statusRes.data.connected) {
        toast.error("Conecte seu Google Drive em Configurações");
        return;
      }
      setDriveExportProduto(produto || "");
      setDriveExportOpen(true);
    } catch {
      toast.error("Erro ao verificar conexão com Drive");
    }
  };

  const handleConfirmExportVideoDrive = async () => {
    if (!currentVideo || !driveExportProduto.trim()) return;
    try {
      setDriveExporting(true);
      const res = await api.post("/drive/export-video", {
        produto_nome: driveExportProduto.trim(),
        file_path: currentVideo.video_url,
      });
      toast.success(`Exportado para ${res.data.path}`);
      setDriveExportOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao exportar para Drive");
    } finally {
      setDriveExporting(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Vídeos Criativos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere vídeos curtos animados para Meta Ads (Stories, Reels, Feed)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Briefing
              </h2>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Produto *
                </label>
                <input
                  type="text"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  placeholder="Ex: Formação em Psicologia Clínica"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Público *
                </label>
                <input
                  type="text"
                  value={publico}
                  onChange={(e) => setPublico(e.target.value)}
                  placeholder="Ex: psicólogos e estudantes"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Contexto *
                </label>
                <textarea
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="Ex: lançamento de nova turma"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Tipo de vídeo */}
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Tipo de Vídeo
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {TIPOS_VIDEO.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTipo(t.value)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          tipo === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5" />
                        <div className="text-xs font-medium">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {t.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plataforma */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Plataforma
                </label>
                <div className="mt-2 flex gap-2">
                  {PLATAFORMAS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlataforma(p.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-center text-xs transition-colors ${
                        plataforma === p.value
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.dimensoes}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration slider */}
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Duração: {duracao}s
                </label>
                <input
                  type="range"
                  min={6}
                  max={15}
                  value={duracao}
                  onChange={(e) => setDuracao(parseInt(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>6s</span>
                  <span>15s</span>
                </div>
              </div>

              {/* Upload de imagem (opcional) */}
              {tipo !== "motion_graphics" && (
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Imagem (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImagemFile(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setImagemPreview(url);
                      } else {
                        setImagemPreview(null);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20"
                  />
                  {imagemPreview && (
                    <img
                      src={imagemPreview}
                      alt="Preview"
                      className="mt-2 w-full max-h-48 object-contain rounded-lg border border-border"
                    />
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Se vazio, uma imagem será gerada automaticamente
                  </p>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGerar}
                disabled={generating}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm
                           hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando vídeo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Gerar Vídeo (20 créditos)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview / Result */}
          <div className="space-y-4">
            {currentVideo ? (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Resultado
                </h2>

                <video
                  controls
                  className="w-full rounded-lg bg-black"
                  src={resolveUrl(currentVideo.video_url)}
                  poster={
                    currentVideo.thumbnail_url
                      ? resolveUrl(currentVideo.thumbnail_url)
                      : undefined
                  }
                />

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{currentVideo.duracao_segundos}s</span>
                  <span>{currentVideo.dimensoes}</span>
                  <span className="capitalize">
                    {currentVideo.tipo.replace("_", " ")}
                  </span>
                  <span>{currentVideo.formato}</span>
                </div>

                {currentVideo.copy_legenda && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Legenda sugerida
                      </label>
                      <button
                        onClick={() =>
                          handleCopyLegenda(currentVideo.copy_legenda!)
                        }
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {copied ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-foreground bg-muted/30 rounded-lg p-3">
                      {currentVideo.copy_legenda}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <a
                    href={resolveUrl(currentVideo.video_url)}
                    download
                    className="flex-1 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm
                               hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download MP4
                  </a>
                  <button
                    onClick={handleExportVideoDrive}
                    className="flex-1 py-2.5 rounded-lg border border-blue-500/30 text-blue-400 font-medium text-sm
                               hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <CloudUpload className="w-4 h-4" />
                    Exportar Drive
                  </button>
                  <button
                    onClick={() => {
                      setCurrentVideo(null);
                    }}
                    className="flex-1 py-2.5 rounded-lg border border-primary text-primary font-medium text-sm
                               hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Gerar Variação
                  </button>
                </div>
              </div>
            ) : generating ? (
              <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Gerando vídeo criativo...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Isso pode levar 30-60 segundos. O vídeo está sendo
                    renderizado com Remotion.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 flex flex-col items-center justify-center gap-3">
                <Video className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center">
                  Preencha o briefing e clique em &quot;Gerar Vídeo&quot; para
                  criar seu vídeo animado para Meta Ads.
                </p>
              </div>
            )}

            {/* History */}
            {!loadingHistorico && historico.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Histórico
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {historico.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setCurrentVideo(v)}
                      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                    >
                      {v.thumbnail_url ? (
                        <img
                          src={resolveUrl(v.thumbnail_url)}
                          alt={`Video ${v.id.slice(0, 8)}`}
                          className="w-full aspect-video object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-muted flex items-center justify-center">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div className="p-2 text-xs text-muted-foreground flex justify-between">
                        <span>{v.duracao_segundos}s</span>
                        <span className="capitalize">
                          {v.tipo.replace("_", " ")}
                        </span>
                        <span>{v.formato}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drive Export Dialog */}
      <Dialog open={driveExportOpen} onOpenChange={setDriveExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-blue-400" />
              Exportar Vídeo para Drive
            </DialogTitle>
            <DialogDescription>
              O vídeo será salvo em Creative Machine / {driveExportProduto || "..."} / Video N
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="drive-video-produto">Nome do produto</Label>
              <Input
                id="drive-video-produto"
                placeholder="Ex: Formação em Psicologia"
                value={driveExportProduto}
                onChange={(e) => setDriveExportProduto(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDriveExportOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmExportVideoDrive}
              loading={driveExporting}
              disabled={!driveExportProduto.trim()}
            >
              <CloudUpload className="w-4 h-4" />
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
