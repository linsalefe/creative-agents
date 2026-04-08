"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Settings, User, Lock } from "lucide-react";

export default function ConfiguracoesPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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
