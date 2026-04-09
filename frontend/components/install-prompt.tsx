"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="flex items-center justify-between bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 text-purple-400" />
        <span className="text-sm text-purple-200">
          Instale o app no seu celular!
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
        >
          Instalar
        </button>
        <button onClick={() => setShowBanner(false)}>
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
