'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video, MapPin, Play, Download, Loader2, Clock, Layers,
} from 'lucide-react';
import AppShell from '@/components/app-shell';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { toast } from 'sonner';

interface MapVideoOutput {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  duracao_segundos: number;
  formato: string;
  dimensoes: string;
  copy_legenda: string | null;
  script: {
    duracao_segundos: number;
    estilo_mapa: string;
    keyframes: unknown[];
    overlays: unknown[];
    highlights: unknown[];
    fps: number;
  };
}

interface JobStatus {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  resultado: MapVideoOutput | null;
  erro: string | null;
}

const ESTILOS_MAPA = [
  { value: 'dark', label: 'Dark' },
  { value: 'satellite', label: 'Satélite' },
  { value: 'light', label: 'Light' },
  { value: 'streets', label: 'Ruas' },
];

const PLATAFORMAS = [
  { value: 'instagram_feed', label: 'Feed (1080x1080)' },
  { value: 'stories', label: 'Stories (1080x1920)' },
  { value: 'reels', label: 'Reels (1080x1920)' },
];

export default function VideosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form state
  const [produto, setProduto] = useState('');
  const [publico, setPublico] = useState('');
  const [contexto, setContexto] = useState('');
  const [latitude, setLatitude] = useState(-7.23);
  const [longitude, setLongitude] = useState(-35.88);
  const [estiloMapa, setEstiloMapa] = useState('dark');
  const [duracao, setDuracao] = useState(12);
  const [plataforma, setPlataforma] = useState('instagram_feed');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<MapVideoOutput | null>(null);
  const [historico, setHistorico] = useState<MapVideoOutput[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadHistorico();
  }, [user]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadHistorico = async () => {
    try {
      const res = await api.get('/videos/historico');
      setHistorico(res.data);
    } catch {
      // silent
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(4)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(4)));
        toast.success('Localização obtida!');
      },
      () => toast.error('Não foi possível obter localização')
    );
  };

  const handleGerar = async () => {
    if (!produto || !publico || !contexto) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setGenerating(true);
    setCurrentVideo(null);

    try {
      const res = await api.post('/videos/gerar', {
        produto,
        publico,
        contexto,
        latitude,
        longitude,
        estilo_mapa: estiloMapa,
        duracao_segundos: duracao,
        plataforma,
      });

      const id = res.data.job_id;
      setJobId(id);
      toast.success('Geração iniciada! Aguarde...');

      // Poll for completion
      pollRef.current = setInterval(async () => {
        try {
          const jobRes = await api.get(`/videos/jobs/${id}`);
          const job: JobStatus = jobRes.data;

          if (job.status === 'completed' && job.resultado) {
            if (pollRef.current) clearInterval(pollRef.current);
            setCurrentVideo(job.resultado);
            setGenerating(false);
            setJobId(null);
            setHistorico((prev) => [job.resultado!, ...prev]);
            toast.success('Vídeo gerado com sucesso!');
          } else if (job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setGenerating(false);
            setJobId(null);
            toast.error(job.erro || 'Erro na geração do vídeo');
          }
        } catch {
          // Keep polling
        }
      }, 5000);
    } catch (err: unknown) {
      setGenerating(false);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Erro ao iniciar geração');
    }
  };

  const getApiBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';
    return baseUrl.replace(/\/api$/, '');
  };

  if (authLoading || !user) return null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Vídeos Cartográficos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere vídeos animados de mapas reais para Meta Ads
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
                <label className="text-sm font-medium text-foreground">Produto *</label>
                <input
                  type="text"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  placeholder="Ex: Formação em Psicologia Clínica"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Público *</label>
                <input
                  type="text"
                  value={publico}
                  onChange={(e) => setPublico(e.target.value)}
                  placeholder="Ex: psicólogos e estudantes"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Contexto *</label>
                <textarea
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="Ex: lançamento de nova turma em Campina Grande"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Localização
                  </label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="text-xs text-primary hover:underline"
                  >
                    Usar minha localização
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Style options */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Estilo do Mapa
                  </label>
                  <select
                    value={estiloMapa}
                    onChange={(e) => setEstiloMapa(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {ESTILOS_MAPA.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Plataforma</label>
                  <select
                    value={plataforma}
                    onChange={(e) => setPlataforma(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {PLATAFORMAS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
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
                    Gerar Vídeo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview / Result */}
          <div className="space-y-4">
            {/* Video result */}
            {currentVideo ? (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Resultado
                </h2>

                <video
                  controls
                  className="w-full rounded-lg bg-black"
                  src={`${getApiBaseUrl()}${currentVideo.video_url}`}
                  poster={currentVideo.thumbnail_url ? `${getApiBaseUrl()}${currentVideo.thumbnail_url}` : undefined}
                />

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{currentVideo.duracao_segundos}s</span>
                  <span>{currentVideo.dimensoes}</span>
                  <span>{currentVideo.formato}</span>
                </div>

                {currentVideo.copy_legenda && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Legenda sugerida</label>
                    <p className="mt-1 text-sm text-foreground bg-muted/30 rounded-lg p-3">
                      {currentVideo.copy_legenda}
                    </p>
                  </div>
                )}

                <a
                  href={`${getApiBaseUrl()}${currentVideo.video_url}`}
                  download
                  className="w-full py-2.5 rounded-lg border border-border text-foreground font-medium text-sm
                             hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                </a>
              </div>
            ) : generating ? (
              <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Gerando vídeo cartográfico...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Isso pode levar alguns minutos. O mapa está sendo renderizado frame a frame.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 flex flex-col items-center justify-center gap-3">
                <Video className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center">
                  Preencha o briefing e clique em &quot;Gerar Vídeo&quot; para criar seu vídeo cartográfico animado.
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
                          src={`${getApiBaseUrl()}${v.thumbnail_url}`}
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
    </AppShell>
  );
}
