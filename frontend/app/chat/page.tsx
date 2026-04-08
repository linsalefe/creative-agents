"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/app-shell";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, ImagePlus, X, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagem_url?: string | null;
  created_at: string;
}

const SUGGESTION_CHIPS = [
  "Gerar arte para curso",
  "Analisar minha biblioteca",
  "Criar variações",
];

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Load chat history
  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-resize textarea
  const adjustTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, []);

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const { data } = await api.get("/chat/history");
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSendMessage(content?: string) {
    const text = content || input.trim();
    if (!text && !selectedFile) return;

    if (selectedFile) {
      await handleUploadImage(text);
      return;
    }

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    try {
      const { data } = await api.post("/chat/message", { content: text });
      const assistantMessage: ChatMessage = {
        id: data.id || `resp-${Date.now()}`,
        role: "assistant",
        content: data.content || data.message || data.response || "",
        imagem_url: data.imagem_url || null,
        created_at: data.created_at || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(text);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleUploadImage(caption?: string) {
    if (!selectedFile) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: caption || `[Imagem: ${selectedFile.name}]`,
      imagem_url: filePreview,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    clearFile();
    setSending(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (caption) formData.append("content", caption);

      const { data } = await api.post("/chat/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const assistantMessage: ChatMessage = {
        id: data.id || `resp-${Date.now()}`,
        role: "assistant",
        content: data.content || data.message || data.response || "",
        imagem_url: data.imagem_url || null,
        created_at: data.created_at || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error("Erro ao enviar imagem. Tente novamente.");
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  }

  function clearFile() {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function getUserInitials() {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

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
      <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] lg:h-screen">
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        >
          {/* Loading history skeleton */}
          {loadingHistory && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-end gap-2 justify-start">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-16 w-[60%] rounded-2xl rounded-bl-sm" />
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-12 w-[50%] rounded-2xl rounded-br-sm" />
              </div>
              <div className="flex items-end gap-2 justify-start">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-20 w-[65%] rounded-2xl rounded-bl-sm" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loadingHistory && messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">
                Olá! Sou o assistente criativo.
              </p>
              <p className="text-sm text-muted-foreground mb-8 max-w-md">
                Como posso ajudar?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    className="px-4 py-2.5 rounded-xl border border-dashed border-violet-500/20 hover:bg-violet-500/5 text-sm text-foreground transition-all duration-200 active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 text-violet-400" />
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {!loadingHistory && (
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {/* AI Avatar */}
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mb-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-violet-600/10 border border-violet-500/10 rounded-2xl rounded-br-sm"
                        : "bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-sm"
                    }`}
                  >
                    {/* Image thumbnail */}
                    {msg.imagem_url && (
                      <a
                        href={msg.imagem_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2"
                      >
                        <img
                          src={msg.imagem_url}
                          alt="Imagem"
                          className="rounded-xl max-w-full max-h-[300px] object-cover shadow-lg hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                        />
                      </a>
                    )}

                    {/* Text content */}
                    {msg.content && (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p
                      className={`text-[10px] text-muted-foreground mt-1.5 ${
                        msg.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>

                  {/* User Avatar */}
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0 mb-1 text-violet-400 text-xs font-bold">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator (typing) */}
              {sending && (
                <div className="flex items-end gap-2 justify-start animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0a0e18] p-4">
          <div className="max-w-2xl mx-auto">
            {/* File preview */}
            {filePreview && (
              <div className="flex items-center gap-3 mb-3 p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <span className="text-sm text-foreground truncate flex-1">
                  {selectedFile?.name}
                </span>
                <button
                  onClick={clearFile}
                  className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2">
              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors mb-0.5"
                title="Enviar imagem"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                disabled={sending}
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/30 disabled:opacity-50 resize-none transition-colors"
                style={{ minHeight: "44px" }}
              />

              {/* Send button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={sending || (!input.trim() && !selectedFile)}
                className="flex-shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all mb-0.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
