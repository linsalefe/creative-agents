"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sparkles, Eye, EyeOff, Zap, Clock, Brain } from "lucide-react";

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao fazer login";
      const axiosDetail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(axiosDetail || message);
    } finally {
      setLoading(false);
    }
  };

  // Don't render while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already logged in — will redirect
  if (user) return null;

  return (
    <div className="min-h-screen flex bg-[#0a0f1a] relative overflow-hidden">
      {/* ==================== LEFT SIDE — Branding ==================== */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center px-16">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(139,92,246,0.12), transparent 70%)",
          }}
        />

        {/* Floating blobs */}
        <div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-purple-500 opacity-[0.08] blur-3xl"
          style={{ animation: "blob-drift 12s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-purple-600 opacity-[0.06] blur-3xl"
          style={{ animation: "blob-drift 16s ease-in-out infinite reverse" }}
        />
        <div
          className="absolute top-2/3 left-1/3 w-56 h-56 rounded-full bg-violet-400 opacity-[0.1] blur-3xl"
          style={{ animation: "blob-drift 10s ease-in-out infinite 2s" }}
        />

        {/* Logo + title */}
        <div className="relative z-10 text-center space-y-6">
          <div
            className="flex items-center justify-center gap-4 opacity-0 animate-fade-in stagger-1"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
          </div>

          <div
            className="opacity-0 animate-fade-in stagger-2"
            style={{ animationFillMode: "forwards" }}
          >
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Creative Machine
            </h1>
            <p className="text-purple-300/60 text-sm mt-2 tracking-widest uppercase">
              by CENAT
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { icon: Brain, label: "IA Generativa", delay: "stagger-3" },
              { icon: Zap, label: "Variacoes em Segundos", delay: "stagger-4" },
              { icon: Clock, label: "Brand Memory", delay: "stagger-5" },
            ].map((feature) => (
              <div
                key={feature.label}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/15 bg-purple-500/5 text-purple-300/80 text-sm opacity-0 animate-fade-in ${feature.delay}`}
                style={{ animationFillMode: "forwards" }}
              >
                <feature.icon className="w-3.5 h-3.5" />
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== RIGHT SIDE — Form ==================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div
          className="w-full max-w-md opacity-0 animate-fade-in stagger-2"
          style={{ animationFillMode: "forwards" }}
        >
          {/* Mobile logo (shown only on small screens) */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Creative Machine</h1>
            <p className="text-purple-300/50 text-xs mt-1 tracking-widest uppercase">
              by CENAT
            </p>
          </div>

          {/* Card with animated border glow */}
          <div className="login-card-glow rounded-xl p-[1px]">
            <div className="bg-[#0a0f1a] rounded-xl p-8">
              {/* Card header */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white">
                  Bem-vindo de volta
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Entre para continuar
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-white/70"
                  >
                    Email
                  </label>
                  <div className="input-glow rounded-lg transition-shadow">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full h-11 px-4 rounded-lg border border-white/[0.06] bg-white/[0.03] text-white text-sm placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-white/70"
                  >
                    Senha
                  </label>
                  <div className="input-glow rounded-lg transition-shadow relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 px-4 pr-11 rounded-lg border border-white/[0.06] bg-white/[0.03] text-white text-sm placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
