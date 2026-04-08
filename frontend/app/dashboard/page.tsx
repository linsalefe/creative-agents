"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ImageIcon,
  Layers,
  Heart,
  Calendar,
  Sparkles,
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
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(): string {
  const d = new Date();
  const weekdays = [
    "Domingo",
    "Segunda-feira",
    "Terca-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sabado",
  ];
  const months = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${weekdays[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveUrl(url: string): string {
  return url.startsWith("/static/") ? `${API_URL}${url}` : url;
}

/* ------------------------------------------------------------------ */
/*  KPI card config                                                    */
/* ------------------------------------------------------------------ */
const kpiConfig = [
  {
    key: "total_artes" as const,
    label: "Total de Artes",
    icon: ImageIcon,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    key: "total_variacoes" as const,
    label: "Variacoes Geradas",
    icon: Layers,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    key: "total_favoritas" as const,
    label: "Artes Favoritas",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    key: "artes_este_mes" as const,
    label: "Artes este Mes",
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
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
        // API may not have this endpoint yet — show zeroes
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
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ==================== Greeting Header ==================== */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate()}</p>
        </div>

        {/* ==================== KPI Cards ==================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up stagger-1" style={{ animationFillMode: "forwards" }}>
          {kpiConfig.map((kpi) => (
            <Card key={kpi.key} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    {loadingStats ? (
                      <>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-foreground">
                          {stats?.[kpi.key] ?? 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {kpi.label}
                        </p>
                      </>
                    )}
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg ${kpi.bgColor} flex items-center justify-center`}
                  >
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ==================== Recent Variations ==================== */}
        <div className="space-y-4 animate-slide-up stagger-2" style={{ animationFillMode: "forwards" }}>
          <h2 className="text-lg font-semibold text-foreground">
            Ultimas Variacoes
          </h2>

          {loadingHistorico ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Nenhuma variacao ainda
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gere seu primeiro criativo para comecar
                </p>
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
                    className="group overflow-hidden cursor-pointer hover:border-primary/30 transition-colors"
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
                        {item.copy?.headline || "Sem titulo"}
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-primary hover:scale-110 transition-transform duration-200 shadow-lg"
        title="Chat com IA"
      >
        <Sparkles className="w-5 h-5" />
      </Link>
    </AppShell>
  );
}
