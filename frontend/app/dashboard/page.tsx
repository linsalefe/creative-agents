"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { KPICard } from "@/components/dashboard/kpi-card";
import { HeroChart } from "@/components/dashboard/hero-chart";
import {
  ImageIcon,
  Layers,
  Heart,
  Calendar,
  Sparkles,
  Plus,
  Clock,
  MessageCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Stats {
  total_artes: number;
  total_variacoes: number;
  total_favoritas: number;
  artes_este_mes: number;
}

interface HistoricoItem {
  id: string;
  copy?: { headline?: string };
  imagem?: { criativo_final_url?: string; imagem_url?: string };
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function resolveUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("/static/") ? url : url;
}

function formatItemDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

/* ------------------------------------------------------------------ */
/*  KPI card config                                                    */
/* ------------------------------------------------------------------ */
const kpiConfig = [
  {
    key: "total_artes" as const,
    label: "Total de Artes",
    icon: ImageIcon,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    key: "total_variacoes" as const,
    label: "Variações Geradas",
    icon: Layers,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    key: "total_favoritas" as const,
    label: "Artes Favoritas",
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    key: "artes_este_mes" as const,
    label: "Artes este Mês",
    icon: Calendar,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
];

/* Mock chart data */
const chartData = [
  { name: "Seg", value: 3 },
  { name: "Ter", value: 7 },
  { name: "Qua", value: 5 },
  { name: "Qui", value: 12 },
  { name: "Sex", value: 9 },
  { name: "Sáb", value: 4 },
  { name: "Dom", value: 6 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    async function fetchStats() {
      try {
        const { data } = await api.get("/artes/stats");
        setStats(data);
      } catch {
        setStats({
          total_artes: 0,
          total_variacoes: 0,
          total_favoritas: 0,
          artes_este_mes: 0,
        });
      } finally {
        setLoadingStats(false);
      }
    }

    async function fetchHistorico() {
      try {
        const { data } = await api.get("/criativos/historico/");
        setHistorico(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch {
        setHistorico([]);
      } finally {
        setLoadingHistorico(false);
      }
    }

    fetchStats();
    fetchHistorico();
  }, [user]);

  // Don't render while checking auth
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
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* ==================== Greeting Header + CTA ==================== */}
        <div className="flex items-start justify-between">
          <GreetingHeader />
          <Link href="/chat">
            <Button className="active:scale-[0.98] transition-transform shadow-lg shadow-violet-600/20">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Criativo
            </Button>
          </Link>
        </div>

        {/* ==================== KPI Cards ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiConfig.map((kpi, i) => (
            loadingStats ? (
              <Card key={kpi.key} className="p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-16" />
              </Card>
            ) : (
              <KPICard
                key={kpi.key}
                label={kpi.label}
                value={stats?.[kpi.key] ?? 0}
                icon={kpi.icon}
                color={kpi.color}
                bg={kpi.bg}
                index={i}
              />
            )
          ))}
        </div>

        {/* ==================== Chart + Activity Feed ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Chart */}
          <div className="lg:col-span-3">
            <HeroChart data={chartData} title="Criativos por dia" />
          </div>

          {/* Activity feed */}
          <div className="lg:col-span-2">
            <Card className="p-5 border border-border h-full">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Atividade Recente
              </h3>
              {loadingHistorico ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nenhuma atividade ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Layers className="h-4 w-4 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">
                          {item.copy?.headline || "Criativo gerado"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ==================== Recent Variations ==================== */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Últimas Variações
          </h2>

          {loadingHistorico ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border border-border">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Nenhuma variação ainda
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Gere seu primeiro criativo para começar
                </p>
                <Link href="/chat">
                  <Button variant="outline" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Iniciar Chat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {historico.map((item) => {
                const imgUrl =
                  item.imagem?.criativo_final_url || item.imagem?.imagem_url;
                return (
                  <Card
                    key={item.id}
                    className="group overflow-hidden cursor-pointer border border-border hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                  >
                    {imgUrl ? (
                      <div className="aspect-video relative bg-muted overflow-hidden">
                        <img
                          src={resolveUrl(imgUrl)}
                          alt={item.copy?.headline || "Criativo"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.copy?.headline || "Sem título"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatItemDate(item.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== Floating Chat Button ==================== */}
      <Link
        href="/chat"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-primary hover:scale-110 active:scale-[0.98] transition-transform duration-200 shadow-lg"
        title="Chat com IA"
      >
        <Sparkles className="w-5 h-5" />
      </Link>
    </AppShell>
  );
}
