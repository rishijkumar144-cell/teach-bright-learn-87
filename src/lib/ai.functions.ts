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

    const style = data.style ?? "diagram";

    // Step 1: PLAN. A strong reasoning model analyses the teacher's request and
    // produces a structured JSON plan: subject, learning goal, every part that
    // must appear, the exact labels, spatial layout, color roles, and things to
    // avoid. This gives the image model something concrete instead of a vibe.
    const planSystem = `You are a senior instructional designer and scientific illustrator with expertise across biology, chemistry, physics, math, geography, history, and computer science. A teacher will give you a short request for a classroom ${style}. Think carefully about what a student actually needs to see to understand the concept, then output a strict JSON plan.

Think about:
- What is the underlying concept? What are common student misconceptions this image should NOT reinforce?
- What is the correct scientific/mathematical structure? Names, proportions, directions, orderings, units.
- What is the minimum set of parts to include? What labels are essential? Spell every label correctly.
- How should parts be arranged spatially so the relationship is obvious at a glance?
- What is a small, accessible color palette (2-5 colors) where color carries meaning (e.g. arteries red, veins blue)?

Return ONLY JSON matching this shape, no prose, no markdown fences:
{
  "subject": string,
  "learningGoal": string,
  "gradeLevel": string,
  "parts": [ { "name": string, "label": string, "role": string } ],
  "layout": string,           // describe positions: "heart centered, aorta arching up-right, ..."
  "arrows": string,           // any flow/direction arrows and what they show, or "none"
  "palette": [ string ],      // 2-5 named colors with meaning, e.g. "red = oxygenated blood"
  "avoid": [ string ],        // misconceptions or clutter to omit
  "styleNotes": string        // extra visual guidance specific to this topic
}`;

    const planResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: planSystem },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),

    });

    let plan: Record<string, unknown> | null = null;
    if (planResp.ok) {
      try {
        const pj = (await planResp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = pj?.choices?.[0]?.message?.content ?? "";
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) plan = JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        plan = null;
      }
    }

    // Step 2: WRITE PROMPT. Compile the plan into a single dense image-gen
    // prompt with rigid style rails.
    const rails = `Flat 2D vector ${style}, clean thin outlines, small accessible color palette with meaning, plain off-white background, centered composition with generous margins, every label rendered as crisp correctly-spelled English text with thin leader lines to its part, scientifically accurate proportions and relationships, no 3D, no photorealism, no perspective tricks, no watermarks, no signatures, no borders, no extraneous decoration, aspect ratio close to 4:3.`;

    let refined = `${data.prompt}. ${rails}`;
    if (plan) {
      const partsList = Array.isArray(plan.parts)
        ? (plan.parts as Array<{ name?: string; label?: string; role?: string }>)
            .map((p) => `- ${p.label ?? p.name ?? ""}${p.role ? ` (${p.role})` : ""}`)
            .join("\n")
        : "";
      const paletteList = Array.isArray(plan.palette) ? (plan.palette as string[]).join("; ") : "";
      const avoidList = Array.isArray(plan.avoid) ? (plan.avoid as string[]).join("; ") : "";
      refined = `Educational 2D ${style} for a ${plan.gradeLevel ?? "middle/high school"} lesson.
Subject: ${plan.subject ?? data.prompt}
Learning goal: ${plan.learningGoal ?? ""}

Required labeled parts (every one must appear, spelled exactly as written):
${partsList}

Layout: ${plan.layout ?? ""}
Arrows / flow: ${plan.arrows ?? "none"}
Color palette with meaning: ${paletteList}
Style notes: ${plan.styleNotes ?? ""}
Must avoid: ${avoidList}

Rendering rules: ${rails}`;
    }

    // Step 3: RENDER with Nano Banana 2 (higher quality).
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: refined }],
        modalities: ["image", "text"],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Rate limited. Please try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
      // Fallback to the older image model if the new one isn't available.
      const fb = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: refined }],
          modalities: ["image", "text"],
        }),
      });
      if (!fb.ok) throw new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
      const fbj = (await fb.json()) as {
        choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
      };
      const fbUrl = fbj?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!fbUrl) throw new Error("No image returned from AI");
      return { url: fbUrl, refinedPrompt: refined };
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
