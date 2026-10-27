/**
 * PWA Registration & Install Utility
 * Complies with strict constraints:
 * - Register ONLY in production
 * - Register ONLY when NOT inside an iframe (window.self === window.top)
 * - Captures beforeinstallprompt for in-app install button
 * - Detects iOS for Add-to-Home-Screen instructions
 */

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function initPwa() {
  if (typeof window === "undefined") return;

  // STRICT CONSTRAINT: Only register in production AND when NOT in an iframe
  const isDev = import.meta.env.DEV;
  const isIframe = window.self !== window.top;

  if (!isDev && !isIframe && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration skipped/failed:", err.message);
        });
    });
  }

  // Listen for beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((fn) => fn());
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((fn) => fn());
  });
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(() => !!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  });

  useEffect(() => {
    const handleUpdate = () => {
      setCanInstall(!!deferredPrompt);
    };
    installListeners.add(handleUpdate);
    return () => {
      installListeners.delete(handleUpdate);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        setCanInstall(false);
        setIsInstalled(true);
        return true;
      }
    } catch (e) {
      console.warn("Install prompt failed:", e);
    }
    return false;
  };

  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  return {
    canInstall,
    isInstalled,
    isIos,
    installApp
  };
}
