"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    if (isStandalone()) return;
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      setPlatform("ios");
      setShowBanner(true);
    } else if (isAndroid()) {
      setPlatform("android");
      setShowBanner(true);
    }

    // Chrome/Edge on Android will fire this event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        handleDismiss();
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="flex items-center justify-between bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Download className="w-5 h-5 text-purple-400 shrink-0" />
        <div className="text-sm text-purple-200">
          {platform === "ios" ? (
            <span>
              Instale o app: toque em{" "}
              <Share className="w-4 h-4 inline-block -mt-0.5" />{" "}
              e depois <strong>&quot;Adicionar à Tela Inicial&quot;</strong>
            </span>
          ) : deferredPrompt ? (
            <span>Instale o app no seu celular!</span>
          ) : (
            <span>
              Instale o app: toque em{" "}
              <MoreVertical className="w-4 h-4 inline-block -mt-0.5" />{" "}
              e depois <strong>&quot;Instalar aplicativo&quot;</strong>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0 ml-2">
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
          >
            Instalar
          </button>
        )}
        <button onClick={handleDismiss}>
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
