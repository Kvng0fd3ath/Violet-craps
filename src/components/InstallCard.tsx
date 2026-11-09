import { Download, Share, SquarePlus, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "../utils/cn";
import type { InstallState } from "../net/useAppUpdate";

export function InstallCard({
  install,
  onCheckUpdate,
  checking,
  updateReady,
  onApplyUpdate,
}: {
  install: InstallState;
  onCheckUpdate: () => void;
  checking: boolean;
  updateReady: boolean;
  onApplyUpdate: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">
        Install &amp; updates
      </div>

      <div className="mt-1.5 rounded-2xl border border-white/12 bg-white/[0.04] p-3.5">
        {install.installed ? (
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 flex-none text-emerald-400" />
            <div>
              <div className="text-[13px] font-bold text-white">Installed as an app</div>
              <div className="text-[11px] leading-4 text-purple-200/70">
                Updates download themselves — just open the app as usual. No new links, ever.
              </div>
            </div>
          </div>
        ) : install.canPrompt ? (
          <>
            <div className="text-[13px] font-bold text-white">Install Violet Felt</div>
            <p className="mt-0.5 text-[11px] leading-4 text-purple-200/70">
              Installs like a real app with its own icon — and it updates itself from then on.
            </p>
            <button
              type="button"
              onClick={install.promptInstall}
              className="btn-press mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-black text-purple-950 active:scale-[0.98]"
            >
              <Download size={15} strokeWidth={2.8} />
              Install app
            </button>
          </>
        ) : install.isIOS ? (
          <>
            <div className="text-[13px] font-bold text-white">Add to your Home Screen</div>
            <p className="mt-0.5 text-[11px] leading-4 text-purple-200/70">
              Then it opens full-screen like an app and updates on its own.
            </p>
            <ol className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2 text-[11.5px] font-semibold text-purple-100">
                <Share size={14} className="flex-none text-gold-300" />
                1. Tap the Share button in Safari
              </li>
              <li className="flex items-center gap-2 text-[11.5px] font-semibold text-purple-100">
                <SquarePlus size={14} className="flex-none text-gold-300" />
                2. Choose “Add to Home Screen”
              </li>
            </ol>
          </>
        ) : (
          <>
            <div className="text-[13px] font-bold text-white">Keep it one tap away</div>
            <p className="mt-0.5 text-[11px] leading-4 text-purple-200/70">
              Play right here in your browser, or use your browser menu to install the app if available.
            </p>
          </>
        )}

        {/* manual update check */}
        <button
          type="button"
          onClick={updateReady ? onApplyUpdate : onCheckUpdate}
          disabled={checking}
          className={cn(
            "mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[12px] font-bold transition active:scale-[0.98]",
            updateReady
              ? "border-gold-400/60 bg-gold-400/15 text-gold-200"
              : "border-white/15 bg-white/5 text-white/70"
          )}
        >
          <RefreshCw size={13} className={cn(checking && "animate-spin")} />
          {updateReady ? "Update now" : checking ? "Checking…" : "Check for updates"}
        </button>
      </div>
    </div>
  );
}
