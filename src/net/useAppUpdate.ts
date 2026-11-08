import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
   Ship-and-forget updates.

   The whole app is a single HTML file, so "is there a new version?"
   is simply "did that file change?". We fingerprint it on launch and
   re-check periodically (and whenever the app is brought back to the
   foreground). No service worker, no version file to maintain — just
   redeploy and every installed copy picks it up.
------------------------------------------------------------------- */

const CHECK_INTERVAL_MS = 90_000;
const MIN_RECHECK_MS = 15_000;

/** Cheap, stable string hash (FNV-1a). */
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Identify the deployed build: prefer cheap headers, fall back to content. */
async function fetchSignature(): Promise<string | null> {
  try {
    const url = `${window.location.pathname}?_v=${Date.now()}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });
    if (!res.ok) return null;

    const etag = res.headers.get("etag");
    if (etag) return `e:${etag}`;
    const modified = res.headers.get("last-modified");
    if (modified) return `m:${modified}`;

    const text = await res.text();
    // ignore trivially-varying whitespace
    return `h:${hashString(text.replace(/\s+/g, " "))}`;
  } catch {
    return null; // offline — try again later
  }
}

export interface InstallState {
  /** Running from the home screen rather than a browser tab. */
  installed: boolean;
  /** Chrome/Android gave us a native install prompt we can fire. */
  canPrompt: boolean;
  /** iOS has no prompt API — show Share-sheet instructions instead. */
  isIOS: boolean;
  promptInstall: () => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useAppUpdate(idle: boolean) {
  const [updateReady, setUpdateReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const baseline = useRef<string | null>(null);
  const lastCheck = useRef(0);
  const idleRef = useRef(idle);
  idleRef.current = idle;
  // lets the polling closure bail out once an update has been spotted
  const updateReadyRef = useRef(false);
  updateReadyRef.current = updateReady;

  /* ------------------------------ update polling ------------------------------ */

  const check = useCallback(async (force = false) => {
    if (updateReadyRef.current) return;
    const now = Date.now();
    if (!force && now - lastCheck.current < MIN_RECHECK_MS) return;
    lastCheck.current = now;

    const sig = await fetchSignature();
    if (!sig) return;

    if (baseline.current === null) {
      baseline.current = sig;
      return;
    }
    if (sig !== baseline.current) setUpdateReady(true);
  }, []);

  useEffect(() => {
    void check(true);
    const id = window.setInterval(() => void check(), CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [check]);

  const applyUpdate = useCallback(() => {
    // cache-bust the document so the reload can't serve the stale build
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString(36));
    window.location.replace(url.toString());
  }, []);

  /* Nothing at stake? Slip the update in quietly instead of nagging. */
  useEffect(() => {
    if (!updateReady || !idle) return;
    const t = window.setTimeout(() => {
      if (idleRef.current) applyUpdate();
    }, 4000);
    return () => window.clearTimeout(t);
  }, [updateReady, idle, applyUpdate]);

  const checkNow = useCallback(async () => {
    setChecking(true);
    await check(true);
    setChecking(false);
  }, [check]);

  /* ------------------------------ install ------------------------------ */

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }, [deferred]);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(navigator as unknown as { standalone?: boolean }).standalone;

  const install: InstallState = {
    installed,
    canPrompt: deferred !== null,
    isIOS,
    promptInstall,
  };

  return { updateReady, applyUpdate, checkNow, checking, install };
}
