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
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuSeparator,
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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuarios");
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
      toast.success("Usuario criado com sucesso");
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("user");
      fetchUsers();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao criar usuario";
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
      toast.success("Funcao atualizada com sucesso");
      setEditRoleOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erro ao atualizar funcao";
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
            Voce nao tem permissao para acessar esta pagina. Apenas
            administradores podem gerenciar usuarios.
          </p>
          <Button
            variant="outline"
            className="mt-6"
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Gerenciamento de Usuarios
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as contas e permissoes
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Usuario
          </Button>
        </div>

        {/* Users list */}
        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Nenhum usuario encontrado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie o primeiro usuario para comecar
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                Novo Usuario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Usuario
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Email
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Funcao
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Data de Criacao
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
                        Acoes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
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
                                Editar Funcao
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
              {users.map((u) => (
                <Card key={u.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
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
                            Editar Funcao
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge
                        variant={
                          u.role === "admin" ? "default" : "secondary"
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
            <DialogTitle>Novo Usuario</DialogTitle>
            <DialogDescription>
              Crie uma nova conta de usuario para a plataforma
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
                placeholder="Minimo 6 caracteres"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Funcao</Label>
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
              <Button type="submit" loading={creating}>
                <Plus className="w-4 h-4" />
                Criar Usuario
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
            <DialogTitle>Editar Funcao</DialogTitle>
            <DialogDescription>
              Altere a funcao de{" "}
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
                    Funcao atual
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        editUser.role === "admin" ? "default" : "secondary"
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
                  <Label htmlFor="edit-role">Nova Funcao</Label>
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
                <Button type="submit" loading={updatingRole}>
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
