import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles, Check, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  activatePlusStub,
  cancelPlusStub,
  getMyCreditStatus,
} from "@/lib/subscription.functions";
import { pingCreditRefresh } from "@/components/CreditMeter";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Questly Plus — Unlimited AI" },
      { name: "description", content: "Upgrade to Questly Plus for unlimited AI credits." },
    ],
  }),
  component: UpgradePage,
});

type Status = {
  isPlus: boolean;
  plusUntil: string | null;
  used: number;
  limit: number;
  remaining: number;
};

function UpgradePage() {
  const { sessionUserId } = useStore();
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getMyCreditStatus);
  const activate = useServerFn(activatePlusStub);
  const cancel = useServerFn(cancelPlusStub);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionUserId) {
      navigate({ to: "/login" });
      return;
    }
    fetchStatus().then((s) => setStatus(s as Status)).catch(() => {});
  }, [sessionUserId, fetchStatus, navigate]);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      // Fake checkout delay to feel like a real provider
      await new Promise((r) => setTimeout(r, 900));
      await activate();
      const s = (await fetchStatus()) as Status;
      setStatus(s);
      pingCreditRefresh();
      toast.success("Welcome to Questly Plus! ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel Questly Plus? You'll drop back to 100 credits/week.")) return;
    setBusy(true);
    try {
      await cancel();
      const s = (await fetchStatus()) as Status;
      setStatus(s);
      pingCreditRefresh();
      toast.success("Subscription cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Questly Plus</h1>
          <p className="mt-2 text-muted-foreground">
            Unlimited AI for teachers and students.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Free card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Zap className="h-4 w-4" /> Free
            </div>
            <div className="mt-2 text-3xl font-bold">$0</div>
            <div className="text-xs text-muted-foreground">forever</div>
            <ul className="mt-4 space-y-2 text-sm">
              <Feature>100 AI credits per week</Feature>
              <Feature>All lesson features</Feature>
              <Feature>All study games</Feature>
              <Feature>Resets every Monday</Feature>
            </ul>
            {status && !status.isPlus && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs">
                You've used <b>{status.used}</b> / {status.limit} this week ·{" "}
                <b>{status.remaining}</b> left
              </div>
            )}
          </div>

          {/* Plus card */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-lift">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
              Best value
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> Plus
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">$3.99</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <Feature>Unlimited AI credits</Feature>
              <Feature>Study Buddy, analyzer, TTS</Feature>
              <Feature>AI lesson & game generation</Feature>
              <Feature>Cancel anytime</Feature>
            </ul>

            {status?.isPlus ? (
              <div className="mt-4 space-y-2">
                <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
                  ✨ Active
                  {status.plusUntil ? (
                    <> until {new Date(status.plusUntil).toLocaleDateString()}</>
                  ) : null}
                </div>
                <Button
                  onClick={handleCancel}
                  disabled={busy}
                  variant="outline"
                  className="w-full"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel subscription"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={busy}
                className="mt-4 w-full"
                size="lg"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  "Subscribe — $3.99/mo"
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <b>Demo mode:</b> This is a payment stub — no real card is charged. Toggle Plus on
          or off freely to test the experience.
        </p>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}
