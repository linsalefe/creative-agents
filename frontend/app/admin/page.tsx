"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Users, UserCheck, Image as ImageIcon, Layers, Plus,
  ShieldCheck, User as UserIcon, MoreHorizontal, Coins,
  Trash2, Power, PowerOff, Search,
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  credits: number;
  is_active: boolean;
  avatar_url?: string | null;
  created_at?: string | null;
}

interface Stats {
  total_users: number;
  active_users: number;
  total_artes: number;
  total_variacoes: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editCreditsOpen, setEditCreditsOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [createCredits, setCreateCredits] = useState(1000);
  const [newCredits, setNewCredits] = useState(0);
  const [newRole, setNewRole] = useState("user");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/auth/admin/stats"),
        api.get("/auth/users"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") fetchData();
  }, [user, fetchData]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActive = async (u: UserItem) => {
    try {
      await api.patch(`/auth/users/${u.id}/active`, { is_active: !u.is_active });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x))
      );
      toast.success(u.is_active ? "Usuario desativado" : "Usuario ativado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleSaveCredits = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await api.patch(`/auth/users/${selectedUser.id}/credits`, { credits: newCredits });
      setUsers((prev) => prev.map((x) => (x.id === selectedUser.id ? { ...x, credits: res.data.credits } : x)));
      toast.success("Creditos atualizados");
      setEditCreditsOpen(false);
    } catch {
      toast.error("Erro ao atualizar creditos");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await api.patch(`/auth/users/${selectedUser.id}/role`, { role: newRole });
      setUsers((prev) => prev.map((x) => (x.id === selectedUser.id ? { ...x, role: res.data.role } : x)));
      toast.success("Role atualizada");
      setEditRoleOpen(false);
    } catch {
      toast.error("Erro ao atualizar role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.delete(`/auth/users/${selectedUser.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== selectedUser.id));
      toast.success("Usuario deletado");
      setDeleteOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao deletar usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post("/auth/users", {
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
      });
      await api.patch(`/auth/users/${res.data.id}/credits`, { credits: createCredits });
      toast.success("Usuario criado com sucesso");
      setCreateOpen(false);
      setCreateName(""); setCreateEmail(""); setCreatePassword("");
      setCreateRole("user"); setCreateCredits(1000);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao criar usuario");
    } finally {
      setSaving(false);
    }
  };

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Controle total da plataforma</p>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Usuarios</span>
                  <div className="p-1.5 rounded-md bg-blue-500/10">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{stats.total_users}</p>
              </CardContent>
            </Card>
            <Card className="glass border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ativos</span>
                  <div className="p-1.5 rounded-md bg-green-500/10">
                    <UserCheck className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{stats.active_users}</p>
              </CardContent>
            </Card>
            <Card className="glass border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Artes</span>
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <ImageIcon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{stats.total_artes}</p>
              </CardContent>
            </Card>
            <Card className="glass border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Variacoes</span>
                  <div className="p-1.5 rounded-md bg-amber-500/10">
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{stats.total_variacoes}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <Card className="glass">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestao de Usuarios
                <Badge variant="secondary" className="ml-1">{users.length}</Badge>
              </CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" />
                  Novo Usuario
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden sm:table-cell">Email</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Creditos</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">Role</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{getInitials(u.name)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{u.email}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={
                            u.credits < 100 ? "destructive" :
                            u.credits < 300 ? "outline" : "secondary"
                          }
                          className={`font-mono gap-1 ${
                            u.credits >= 300 ? "text-green-400 border-green-500/30 bg-green-500/10" :
                            u.credits >= 100 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : ""
                          }`}
                        >
                          <Coins className="w-3 h-3" />
                          {u.credits.toLocaleString()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center hidden md:table-cell">
                        {u.role === "admin" ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <UserIcon className="w-3 h-3" />
                            User
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center hidden md:table-cell">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                            u.is_active
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {u.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                          {u.is_active ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(u);
                              setNewCredits(u.credits);
                              setEditCreditsOpen(true);
                            }}>
                              <Coins className="w-4 h-4 mr-2" />
                              Editar Creditos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setEditRoleOpen(true);
                            }}>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              Alterar Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(u)}>
                              {u.is_active ? <PowerOff className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                              {u.is_active ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                            {u.role !== "admin" && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setSelectedUser(u); setDeleteOpen(true); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum usuario encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Edit Credits */}
      <Dialog open={editCreditsOpen} onOpenChange={setEditCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Editar Creditos
            </DialogTitle>
            <DialogDescription>
              Usuario: <strong>{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Creditos</Label>
              <Input
                type="number"
                min={0}
                value={newCredits}
                onChange={(e) => setNewCredits(Number(e.target.value))}
                placeholder="1000"
              />
              <p className="text-xs text-muted-foreground">
                Valor atual: <strong>{selectedUser?.credits?.toLocaleString()}</strong> creditos
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCreditsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCredits} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Role */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
            <DialogDescription>Usuario: <strong>{selectedUser?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-3">
                {["user", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      newRole === r
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {r === "admin" ? "Admin" : "User"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Deletar Usuario</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar <strong>{selectedUser?.name}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create User */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Novo Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Joao Silva" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="joao@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Creditos iniciais</Label>
              <Input type="number" min={0} value={createCredits} onChange={(e) => setCreateCredits(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-3">
                {["user", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setCreateRole(r)}
                    className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      createRole === r
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {r === "admin" ? "Admin" : "User"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !createName || !createEmail || !createPassword}>
              {saving ? "Criando..." : "Criar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
