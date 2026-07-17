import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateDiagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ prompt: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a clear educational 2D diagram or illustration for a lesson. Use clean lines, high contrast, clear labels, and a plain background. Prompt: ${data.prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Rate limited. Please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      throw new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const json = (await resp.json()) as {
      choices?: Array<{
        message?: { images?: Array<{ image_url?: { url?: string } }> };
      }>;
    };
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("No image returned from AI");
    return { url };
  });

const InteractiveSpec = z.object({
  kind: z.literal("bar-graph"),
  title: z.string(),
  instructions: z.string(),
  unit: z.string().optional().default(""),
  max: z.number().positive(),
  tolerance: z.number().nonnegative().default(0),
  categories: z.array(z.object({ label: z.string(), target: z.number() })).min(2).max(10),
});

export type InteractiveSpecT = z.infer<typeof InteractiveSpec>;

export const generateInteractive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ prompt: z.string().min(1).max(2000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const system = `You design interactive educational widgets. Given a teacher's request, return ONLY strict JSON (no markdown, no prose) matching this schema:
{
  "kind": "bar-graph",
  "title": string,
  "instructions": string (what the student must do),
  "unit": string (e.g. "cm", "°C", ""),
  "max": number (the scale max, > any target),
  "tolerance": number (allowed +/- when checking correctness; 0 for exact),
  "categories": [ { "label": string, "target": number }, ... ] (2-8 entries)
}
Only "bar-graph" is supported. Make an adjustable bar graph where students drag bars to match the target values. Return JSON only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Rate limited. Please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      throw new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return valid JSON");
      parsed = JSON.parse(m[0]);
    }
    const spec = InteractiveSpec.parse(parsed);
    return { spec };
  });
