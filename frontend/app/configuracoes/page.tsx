"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Lock, Coins, Bell, HardDrive, Loader2, Check, X, Link } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Suspense } from "react";

function ConfiguracoesContent() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Push notifications
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveDisconnecting, setDriveDisconnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Check Drive status on load
  useEffect(() => {
    if (user) {
      checkDriveStatus();
    }
  }, [user]);

  // Check ?drive=connected param
  useEffect(() => {
    if (searchParams.get("drive") === "connected") {
      checkDriveStatus();
      toast.success("Google Drive conectado com sucesso!");
      // Clean up URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("drive");
      const query = params.toString();
      router.replace(`/configuracoes${query ? `?${query}` : ""}`, { scroll: false });
    }
  }, [searchParams]);

  const checkDriveStatus = async () => {
    try {
      setDriveLoading(true);
      const { data } = await api.get("/drive/status");
      setDriveConnected(data.connected);
    } catch {
      // silent
    } finally {
      setDriveLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setDriveConnecting(true);
      const { data } = await api.post("/drive/connect");
      if (data.redirect_url) {
        window.open(data.redirect_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Erro ao conectar Google Drive");
    } finally {
      setDriveConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      setDriveDisconnecting(true);
      await api.post("/drive/disconnect");
      setDriveConnected(false);
      toast.success("Google Drive desconectado");
    } catch {
      toast.error("Erro ao desconectar Google Drive");
    } finally {
      setDriveDisconnecting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      toast.error("O email é obrigatório");
      return;
    }

    try {
      setSavingProfile(true);
      const { data } = await api.patch("/auth/profile", {
        name: name.trim(),
        email: email.trim(),
      });
      updateUser({ name: data.name || name.trim(), email: data.email || email.trim() });
      toast.success("Perfil atualizado com sucesso");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao atualizar perfil";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Informe a senha atual");
      return;
    }
    if (!newPassword) {
      toast.error("Informe a nova senha");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      setSavingPassword(true);
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao alterar senha";
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 px-6 py-8 animate-fade-in">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seu perfil e preferências
            </p>
          </div>
        </div>

        {/* Credits section */}
        <Card className="border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="w-5 h-5 text-primary" />
              Seus Creditos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold font-mono">{user?.credits?.toLocaleString() ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-1">creditos disponiveis</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Cada arte gerada consome <strong>10 creditos</strong>
                </p>
              </div>
              <div className={`p-4 rounded-full ${(user?.credits ?? 0) < 100 ? 'bg-red-500/10' : (user?.credits ?? 0) < 300 ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                <Coins className={`w-8 h-8 ${(user?.credits ?? 0) < 100 ? 'text-red-400' : (user?.credits ?? 0) < 300 ? 'text-amber-400' : 'text-green-400'}`} />
              </div>
            </div>
            {(user?.credits ?? 0) < 100 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs text-red-400 font-medium">Creditos baixos! Entre em contato com o administrador.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integrations section */}
        <Card className="border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link className="w-5 h-5 text-primary" />
              Integrações
            </CardTitle>
            <CardDescription>
              Conecte serviços externos para exportar seus criativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Google Drive</p>
                  {driveLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Verificando...
                    </p>
                  ) : driveConnected ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Conectado
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Exporte criativos direto para o Drive
                    </p>
                  )}
                </div>
              </div>
              {!driveLoading && (
                driveConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectDrive}
                    loading={driveDisconnecting}
                    className="active:scale-[0.98] transition-transform"
                  >
                    <X className="w-3 h-3" />
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleConnectDrive}
                    loading={driveConnecting}
                    className="active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20"
                  >
                    <HardDrive className="w-3 h-3" />
                    Conectar
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications section */}
        <Card className="border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba alertas quando seus criativos ficarem prontos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupported ? (
              <p className="text-sm text-muted-foreground">
                Seu navegador não suporta notificações push
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isSubscribed ? "Notificações: Ativas" : "Notificações: Desativadas"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSubscribed
                      ? "Você receberá alertas de criativos e vídeos prontos"
                      : "Ative para receber alertas quando seus criativos ficarem prontos"}
                  </p>
                </div>
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                  className="active:scale-[0.98] transition-transform"
                >
                  {pushLoading ? "..." : isSubscribed ? "Desativar" : "Ativar"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile section */}
        <Card className="border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-4 h-4 text-violet-400" />
              Perfil
            </CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nome</Label>
                <Input
                  id="profile-name"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="pt-2">
                <Button type="submit" loading={savingProfile} className="active:scale-[0.98] transition-transform shadow-lg shadow-violet-600/20">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change password section */}
        <Card className="border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-4 h-4 text-violet-400" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mantenha sua conta segura atualizando sua senha regularmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="pt-2">
                <Button type="submit" loading={savingPassword} className="active:scale-[0.98] transition-transform shadow-lg shadow-violet-600/20">
                  Alterar Senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function ConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </AppShell>
      }
    >
      <ConfiguracoesContent />
    </Suspense>
  );
}
