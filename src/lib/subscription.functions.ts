import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

export const FREE_WEEKLY_CREDITS = 100;

type ProfileCreditRow = {
  plus_until: string | null;
  ai_credits_used: number;
  ai_credits_week_start: string;
};

function isoMonday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Reads profile credit row, rolling over the weekly counter if needed.
 * Returns the fresh row.
 */
async function loadAndMaybeReset(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileCreditRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plus_until, ai_credits_used, ai_credits_week_start")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found");

  const weekStart = isoMonday();
  if (data.ai_credits_week_start !== weekStart) {
    const { error: uerr } = await supabase
      .from("profiles")
      .update({ ai_credits_used: 0, ai_credits_week_start: weekStart })
      .eq("id", userId);
    if (uerr) throw new Error(uerr.message);
    return { ...(data as ProfileCreditRow), ai_credits_used: 0, ai_credits_week_start: weekStart };
  }
  return data as ProfileCreditRow;
}

function isPlusActive(plus_until: string | null): boolean {
  if (!plus_until) return false;
  return new Date(plus_until).getTime() > Date.now();
}

/**
 * Server-side helper: enforces the free 100/week cap and increments usage.
 * Call this at the top of every AI server-function handler.
 * `context` must be the requireSupabaseAuth context (supabase + userId).
 */
export async function consumeAiCredit(context: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<void> {
  const row = await loadAndMaybeReset(context.supabase, context.userId);
  if (isPlusActive(row.plus_until)) return; // unlimited
  if (row.ai_credits_used >= FREE_WEEKLY_CREDITS) {
    throw new Error(
      `Weekly AI credit limit reached (${FREE_WEEKLY_CREDITS}/week). Upgrade to Questly Plus for unlimited AI, or wait until next Monday.`,
    );
  }
  const { error } = await context.supabase
    .from("profiles")
    .update({ ai_credits_used: row.ai_credits_used + 1 })
    .eq("id", context.userId);
  if (error) throw new Error(error.message);
}

// ============================================================
// Public server functions
// ============================================================

export const getMyCreditStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await loadAndMaybeReset(context.supabase, context.userId);
    const plus = isPlusActive(row.plus_until);
    return {
      isPlus: plus,
      plusUntil: row.plus_until,
      used: row.ai_credits_used,
      limit: FREE_WEEKLY_CREDITS,
      remaining: plus ? Infinity : Math.max(0, FREE_WEEKLY_CREDITS - row.ai_credits_used),
      weekStart: row.ai_credits_week_start,
    };
  });

/**
 * STUB: pretends to charge $3.99 and grants 30 days of Plus.
 * Replace with a real Paddle/Stripe webhook when payments are enabled.
 */
export const activatePlusStub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Extend from max(now, current plus_until)
    const { data } = await context.supabase
      .from("profiles")
      .select("plus_until")
      .eq("id", context.userId)
      .maybeSingle();
    const base = data?.plus_until && new Date(data.plus_until).getTime() > Date.now()
      ? new Date(data.plus_until)
      : new Date();
    base.setUTCDate(base.getUTCDate() + 30);
    const { error } = await context.supabase
      .from("profiles")
      .update({ plus_until: base.toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { plusUntil: base.toISOString() };
  });

export const cancelPlusStub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ plus_until: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
