import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateDiagram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      prompt: z.string().min(1).max(2000),
      style: z.enum(["diagram", "illustration", "chart", "infographic"]).optional(),
      previousUrl: z.string().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Step 1: use a strong chat model to rewrite the teacher's short prompt
    // into a rich, education-focused image brief.
    const briefResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert instructional illustrator. Rewrite the teacher's short request into a single detailed prompt for an image generator to produce a clean, educational 2D ${data.style ?? "diagram"}.

Requirements the prompt MUST enforce:
- Flat 2D vector-style illustration. No 3D, no photorealism, no perspective tricks.
- Clean thin outlines, high-contrast colors from a small palette (2-5 colors).
- Plain white or very light background.
- All labels rendered as crisp, correctly spelled English text with clear leader lines from each label to its part.
- Anatomically / scientifically / mathematically accurate. Include every part the teacher asked for and no extraneous elements.
- Centered composition, generous margins, no watermarks, no signatures, no borders.
- Aspect ratio ~4:3, suitable to display in a lesson at moderate size.

Return ONLY the final image prompt as plain text, no preamble, no quotes, no markdown.`,
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    let refined = data.prompt;
    if (briefResp.ok) {
      const bj = (await briefResp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const c = bj?.choices?.[0]?.message?.content?.trim();
      if (c && c.length > 20) refined = c;
    }

    // Step 2: generate the image with the higher-quality Nano Banana 2 model.
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
            content: refined,
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
    return { url, refinedPrompt: refined };
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
