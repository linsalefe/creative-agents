"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  ShieldCheck,
  MoreHorizontal,
  UserCog,
  ShieldAlert,
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
}

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [creating, setCreating] = useState(false);

  // Edit role dialog
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editNewRole, setEditNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createName.trim() || !createEmail.trim() || !createPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (createPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      setCreating(true);
      await api.post("/auth/users", {
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      toast.success("Usuário criado com sucesso");
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("user");
      fetchUsers();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao criar usuário";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      setUpdatingRole(true);
      await api.patch(`/auth/users/${editUser.id}/role`, {
        role: editNewRole,
      });
      toast.success("Função atualizada com sucesso");
      setEditRoleOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao atualizar função";
      toast.error(message);
    } finally {
      setUpdatingRole(false);
    }
  };

  const openEditRole = (u: UserItem) => {
    setEditUser(u);
    setEditNewRole(u.role);
    setEditRoleOpen(true);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admin guard
  if (user.role !== "admin") {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Acesso Restrito
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Você não tem permissão para acessar esta página. Apenas
            administradores podem gerenciar usuários.
          </p>
          <Button
            variant="outline"
            className="mt-6 active:scale-[0.98]"
            onClick={() => router.push("/dashboard")}
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 px-6 py-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gerenciamento de Usuários
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as contas e permissões
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Users list */}
        {loading ? (
          <Card className="border border-border">
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Nenhum usuário encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie o primeiro usuário para começar
              </p>
              <Button onClick={() => setCreateOpen(true)} className="active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-white/[0.02]">
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Usuário
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Função
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Data de Criação
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        className={`border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-all duration-200 ${
                          mounted ? "animate-fade-in" : "opacity-0"
                        }`}
                        style={{ animationDelay: `${i * 50}ms`, animationFillMode: "forwards" }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 text-xs font-bold">
                              {getInitials(u.name)}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {u.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {u.email}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              u.role === "admin" ? "default" : "secondary"
                            }
                            className={
                              u.role === "admin"
                                ? "bg-violet-500/10 text-violet-400 border-0"
                                : "bg-gray-500/10 text-gray-400 border-0"
                            }
                          >
                            {u.role === "admin" && (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            )}
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(u.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditRole(u)}
                              >
                                <UserCog className="w-4 h-4" />
                                Editar Função
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {users.map((u, i) => (
                <Card
                  key={u.id}
                  className={`border border-border hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${
                    mounted ? "animate-fade-in" : "opacity-0"
                  }`}
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "forwards" }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 text-sm font-bold">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {u.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditRole(u)}>
                            <UserCog className="w-4 h-4" />
                            Editar Função
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge
                        variant={
                          u.role === "admin" ? "default" : "secondary"
                        }
                        className={
                          u.role === "admin"
                            ? "bg-violet-500/10 text-violet-400 border-0"
                            : "bg-gray-500/10 text-gray-400 border-0"
                        }
                      >
                        {u.role === "admin" && (
                          <ShieldCheck className="w-3 h-3 mr-1" />
                        )}
                        {u.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Criado em {formatDate(u.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create user dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open: boolean) => {
          setCreateOpen(open);
          if (!open) {
            setCreateName("");
            setCreateEmail("");
            setCreatePassword("");
            setCreateRole("user");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie uma nova conta de usuário para a plataforma
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                placeholder="Nome completo"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="email@exemplo.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Senha</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Função</Label>
              <Select
                id="create-role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={creating} className="active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog
        open={editRoleOpen}
        onOpenChange={(open: boolean) => {
          setEditRoleOpen(open);
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
            <DialogDescription>
              Altere a função de{" "}
              <span className="font-medium text-foreground">
                {editUser?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          {editUser && (
            <form onSubmit={handleEditRole} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">
                    Função atual
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        editUser.role === "admin" ? "default" : "secondary"
                      }
                      className={
                        editUser.role === "admin"
                          ? "bg-violet-500/10 text-violet-400 border-0"
                          : "bg-gray-500/10 text-gray-400 border-0"
                      }
                    >
                      {editUser.role === "admin" && (
                        <ShieldCheck className="w-3 h-3 mr-1" />
                      )}
                      {editUser.role}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="edit-role">Nova Função</Label>
                  <Select
                    id="edit-role"
                    value={editNewRole}
                    onChange={(e) => setEditNewRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditRoleOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={updatingRole} className="active:scale-[0.98]">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
