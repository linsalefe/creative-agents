"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Heart,
  Search,
  Plus,
  Upload,
  X,
  ImageIcon,
  Trash2,
  Layers,
  FolderOpen,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveUrl(url: string) {
  if (!url) return "";
  return url.startsWith("/static/") || url.startsWith("/uploads/")
    ? `${API_URL}${url}`
    : url;
}

interface Arte {
  id: number;
  filename: string;
  file_path: string;
  mime_type: string;
  analise_json: any;
  tags: string[];
  favorito: boolean;
  pasta: string | null;
  created_at: string | null;
}

export default function BibliotecaPage() {
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
      <BibliotecaContent />
    </Suspense>
  );
}

function BibliotecaContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [artes, setArtes] = useState<Arte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTag, setSearchTag] = useState("");
  const [pastaFilter, setPastaFilter] = useState("");
  const [favoritoFilter, setFavoritoFilter] = useState(
    searchParams.get("favorito") === "true"
  );
  const [pastas, setPastas] = useState<string[]>([]);

  // Detail dialog
  const [selectedArte, setSelectedArte] = useState<Arte | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadPasta, setUploadPasta] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const fetchArtes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTag.trim()) params.set("tag", searchTag.trim());
      if (pastaFilter) params.set("pasta", pastaFilter);
      if (favoritoFilter) params.set("favorito", "true");

      const query = params.toString();
      const { data } = await api.get(`/artes/${query ? `?${query}` : ""}`);
      setArtes(data);

      // Extract unique pastas
      const uniquePastas = Array.from(
        new Set(
          data
            .map((a: Arte) => a.pasta)
            .filter((p: string | null): p is string => !!p)
        )
      ) as string[];
      setPastas(uniquePastas);
    } catch {
      toast.error("Erro ao carregar artes");
    } finally {
      setLoading(false);
    }
  }, [searchTag, pastaFilter, favoritoFilter]);

  useEffect(() => {
    if (user) {
      fetchArtes();
    }
  }, [user, fetchArtes]);

  const toggleFavorito = async (arte: Arte, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/artes/${arte.id}/favorito`);
      setArtes((prev) =>
        prev.map((a) =>
          a.id === arte.id ? { ...a, favorito: !a.favorito } : a
        )
      );
      if (selectedArte?.id === arte.id) {
        setSelectedArte((prev) =>
          prev ? { ...prev, favorito: !prev.favorito } : null
        );
      }
      toast.success(arte.favorito ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch {
      toast.error("Erro ao atualizar favorito");
    }
  };

  const deleteArte = async (id: number) => {
    try {
      setDeleting(true);
      await api.delete(`/artes/${id}`);
      setArtes((prev) => prev.filter((a) => a.id !== id));
      setDetailOpen(false);
      setSelectedArte(null);
      toast.success("Arte excluida com sucesso");
    } catch {
      toast.error("Erro ao excluir arte");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const clearUploadFile = () => {
    setUploadFile(null);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadTags.trim()) formData.append("tags", uploadTags.trim());
      if (uploadPasta.trim()) formData.append("pasta", uploadPasta.trim());

      await api.post("/artes/upload", formData);
      toast.success("Arte enviada com sucesso");
      setUploadOpen(false);
      clearUploadFile();
      setUploadTags("");
      setUploadPasta("");
      fetchArtes();
    } catch {
      toast.error("Erro ao enviar arte");
    } finally {
      setUploading(false);
    }
  };

  const openDetail = (arte: Arte) => {
    setSelectedArte(arte);
    setDetailOpen(true);
  };

  const toggleFavoritoFilter = () => {
    const next = !favoritoFilter;
    setFavoritoFilter(next);
    const params = new URLSearchParams(window.location.search);
    if (next) {
      params.set("favorito", "true");
    } else {
      params.delete("favorito");
    }
    const query = params.toString();
    router.replace(`/biblioteca${query ? `?${query}` : ""}`, { scroll: false });
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Biblioteca de Artes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie e organize seus criativos
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4" />
            Nova Arte
          </Button>
        </div>

        {/* Pasta chips */}
        {pastas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPastaFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pastaFilter === ""
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Todas
            </button>
            {pastas.map((pasta) => (
              <button
                key={pasta}
                onClick={() =>
                  setPastaFilter(pastaFilter === pasta ? "" : pasta)
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pastaFilter === pasta
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <FolderOpen className="w-3 h-3" />
                {pasta}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tag..."
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={pastaFilter}
            onChange={(e) => setPastaFilter(e.target.value)}
            className="sm:w-48"
          >
            <option value="">Todas as pastas</option>
            {pastas.map((pasta) => (
              <option key={pasta} value={pasta}>
                {pasta}
              </option>
            ))}
          </Select>
          <Button
            variant={favoritoFilter ? "default" : "outline"}
            onClick={toggleFavoritoFilter}
            className="sm:w-auto"
          >
            <Heart
              className={`w-4 h-4 ${
                favoritoFilter ? "fill-current" : ""
              }`}
            />
            Favoritos
          </Button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-secondary animate-pulse"
              />
            ))}
          </div>
        ) : artes.length === 0 ? (
          /* Empty state */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Nenhuma arte na biblioteca
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece enviando sua primeira arte
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4" />
                Enviar Arte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {artes.map((arte) => (
              <div
                key={arte.id}
                className="group relative cursor-pointer rounded-lg overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-lg hover:border-primary/30"
                onClick={() => openDetail(arte)}
              >
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={resolveUrl(arte.file_path)}
                    alt={arte.filename}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Headline on hover */}
                  {arte.analise_json?.headline && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-sm font-medium line-clamp-2">
                        {arte.analise_json.headline}
                      </p>
                    </div>
                  )}
                  {/* Favorite button */}
                  <button
                    onClick={(e) => toggleFavorito(arte, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors z-10"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        arte.favorito ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Tags */}
                {arte.tags && arte.tags.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {arte.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {arte.tags.length > 3 && (
                      <Badge
                        variant="muted"
                        className="text-[10px] px-1.5 py-0"
                      >
                        +{arte.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Arte</DialogTitle>
            <DialogDescription>
              {selectedArte?.filename}
            </DialogDescription>
          </DialogHeader>

          {selectedArte && (
            <div className="space-y-4">
              {/* Large image preview */}
              <div className="rounded-lg overflow-hidden border border-border bg-secondary/30">
                <img
                  src={resolveUrl(selectedArte.file_path)}
                  alt={selectedArte.filename}
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>

              {/* Analysis details */}
              {selectedArte.analise_json && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Analise</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedArte.analise_json.headline && (
                        <DetailRow
                          label="Headline"
                          value={selectedArte.analise_json.headline}
                        />
                      )}
                      {selectedArte.analise_json.subheadline && (
                        <DetailRow
                          label="Subheadline"
                          value={selectedArte.analise_json.subheadline}
                        />
                      )}
                      {selectedArte.analise_json.tom && (
                        <DetailRow
                          label="Tom"
                          value={selectedArte.analise_json.tom}
                        />
                      )}
                      {selectedArte.analise_json.publico && (
                        <DetailRow
                          label="Publico"
                          value={selectedArte.analise_json.publico}
                        />
                      )}
                      {selectedArte.analise_json.estilo_visual && (
                        <DetailRow
                          label="Estilo Visual"
                          value={selectedArte.analise_json.estilo_visual}
                        />
                      )}
                      {selectedArte.analise_json.descricao_fundo && (
                        <DetailRow
                          label="Descricao do Fundo"
                          value={selectedArte.analise_json.descricao_fundo}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {selectedArte.tags && selectedArte.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedArte.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Favorite toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedArte.favorito ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFavorito(selectedArte)}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      selectedArte.favorito ? "fill-current" : ""
                    }`}
                  />
                  {selectedArte.favorito
                    ? "Favorito"
                    : "Adicionar aos Favoritos"}
                </Button>
              </div>

              {/* Actions */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    router.push("/variacoes");
                  }}
                >
                  <Layers className="w-4 h-4" />
                  Gerar Variacoes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteArte(selectedArte.id)}
                  loading={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open: boolean) => {
          setUploadOpen(open);
          if (!open) {
            clearUploadFile();
            setUploadTags("");
            setUploadPasta("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Nova Arte</DialogTitle>
            <DialogDescription>
              Faca upload de uma imagem para a biblioteca
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* File upload zone */}
            {!uploadPreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    dragging ? "bg-primary/20" : "bg-secondary"
                  }`}
                >
                  <Upload
                    className={`w-5 h-5 ${
                      dragging ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    <span className="text-primary font-medium">
                      Clique para selecionar
                    </span>{" "}
                    ou arraste uma imagem
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG ou PNG
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <div className="flex items-start gap-4 p-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {uploadFile?.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {uploadFile && (uploadFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearUploadFile}
                    className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tags input */}
            <div className="space-y-1.5">
              <Label htmlFor="upload-tags">Tags (separadas por virgula)</Label>
              <Input
                id="upload-tags"
                placeholder="Ex: lancamento, instagram, produto"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
              />
            </div>

            {/* Pasta input */}
            <div className="space-y-1.5">
              <Label htmlFor="upload-pasta">Pasta</Label>
              <Input
                id="upload-pasta"
                placeholder="Ex: Campanha Verao 2026"
                value={uploadPasta}
                onChange={(e) => setUploadPasta(e.target.value)}
                list="pastas-list"
              />
              {pastas.length > 0 && (
                <datalist id="pastas-list">
                  {pastas.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={uploading} disabled={!uploadFile}>
                <Upload className="w-4 h-4" />
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
