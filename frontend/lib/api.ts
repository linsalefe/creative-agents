import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

// Request interceptor — auto-attach token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        localStorage.removeItem("token");
        toast.error("Sessao expirada. Faca login novamente.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      }
    } else if (error.response?.status === 500) {
      toast.error("Erro interno do servidor");
    } else if (!error.response) {
      toast.error("Sem conexao com o servidor");
    }
    return Promise.reject(error);
  }
);

export default api;
