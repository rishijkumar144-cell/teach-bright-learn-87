import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Zap } from "lucide-react";
import { getMyCreditStatus } from "@/lib/subscription.functions";
import { useStore } from "@/lib/store";

type Status = {
  isPlus: boolean;
  plusUntil: string | null;
  used: number;
  limit: number;
  remaining: number;
};

// Simple event bus so AI callers can nudge a refresh after consuming a credit.
const REFRESH_EVENT = "questly:credits:refresh";
export function pingCreditRefresh() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function CreditMeter() {
  const { sessionUserId } = useStore();
  const fetchStatus = useServerFn(getMyCreditStatus);
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionUserId) {
      setStatus(null);
      return;
    }
    try {
      const s = (await fetchStatus()) as Status;
      setStatus(s);
    } catch {
      /* ignore */
    }
  }, [sessionUserId, fetchStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener(REFRESH_EVENT, h);
    const t = window.setInterval(refresh, 30000);
    return () => {
      window.removeEventListener(REFRESH_EVENT, h);
      window.clearInterval(t);
    };
  }, [refresh]);

  if (!sessionUserId || !status) return null;

  if (status.isPlus) {
    return (
      <Link
        to="/upgrade"
        className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur hover:bg-primary/20"
        title={status.plusUntil ? `Plus until ${new Date(status.plusUntil).toLocaleDateString()}` : "Questly Plus"}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Plus
      </Link>
    );
  }

  const pct = Math.min(100, Math.round((status.used / status.limit) * 100));
  const low = status.remaining <= 10;

  return (
    <Link
      to="/upgrade"
      className="flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-xs shadow-sm backdrop-blur hover:bg-accent"
      title={`${status.remaining} AI credits left this week`}
    >
      <Zap className={`h-3.5 w-3.5 ${low ? "text-destructive" : "text-primary"}`} />
      <span className="font-medium tabular-nums">
        {status.remaining}/{status.limit}
      </span>
      <span className="hidden text-muted-foreground sm:inline">AI · week</span>
      <span className="relative ml-1 h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <span
          className={`absolute inset-y-0 left-0 ${low ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </Link>
  );
}
