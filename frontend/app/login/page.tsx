"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Sparkles, Eye, EyeOff, Layers, Brain } from "lucide-react";

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-[#060912]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already logged in — will redirect
  if (user) return null;

  const features = [
    { icon: Sparkles, label: "IA Generativa" },
    { icon: Layers, label: "Variações em Segundos" },
    { icon: Brain, label: "Brand Memory" },
  ];

  return (
    <div className="min-h-screen flex bg-[#060912] relative overflow-hidden">
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

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-500 opacity-[0.08] blur-3xl blob-drift" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-violet-600 opacity-[0.06] blur-3xl blob-drift-reverse" />
        <div className="absolute top-2/3 left-1/3 w-56 h-56 rounded-full bg-violet-400 opacity-[0.1] blur-3xl blob-drift" style={{ animationDelay: "3s" }} />

        {/* Content */}
        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div
            className={`flex items-center gap-3 mb-10 transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">
                Creative Machine
              </span>
              <span className="text-sm font-light text-violet-300 block">
                BY CENAT
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className={`text-4xl font-bold text-white leading-tight mb-3 transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Crie. Varie.
            <br />
            <span className="text-violet-400">Escale.</span>
          </h1>

          <p
            className={`text-gray-400 text-base mb-8 transition-all duration-700 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            Gere criativos de alta performance com inteligência artificial.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {features.map((feat, i) => (
              <div
                key={feat.label}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm transition-all duration-700 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${800 + i * 150}ms` }}
              >
                <feat.icon className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-gray-300 font-medium">
                  {feat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Trust signal */}
          <p
            className={`text-xs text-gray-500 mt-10 transition-all duration-700 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "1400ms" }}
          >
            Usado pelo CENAT e parceiros
          </p>
        </div>
      </div>

      {/* ==================== RIGHT SIDE — Form ==================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div
          className={`w-full max-w-md transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Creative Machine
            </span>
            <span className="text-sm font-light text-violet-300">BY CENAT</span>
          </div>

          {/* Glassmorphism card */}
          <div className="login-card-glow p-8 shadow-2xl shadow-black/40">
            <h2 className="text-[22px] font-bold text-white">
              Bem-vindo de volta
            </h2>
            <p className="text-gray-400 text-sm mt-1 mb-8">
              Entre para continuar
            </p>

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
                <label htmlFor="email" className="text-sm font-medium text-white/70">
                  Email
                </label>
                <div className="input-glow rounded-lg transition-all">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full h-11 px-4 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white text-sm placeholder:text-white/20 outline-none focus:border-violet-500/40 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white/70">
                  Senha
                </label>
                <div className="input-glow rounded-lg transition-all relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 px-4 pr-11 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white text-sm placeholder:text-white/20 outline-none focus:border-violet-500/40 transition-colors"
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
                className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25"
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
  );
}
