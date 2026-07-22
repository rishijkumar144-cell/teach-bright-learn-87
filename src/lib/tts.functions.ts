import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TTS_URL = "https://ai.gateway.lovable.dev/v1/audio/speech";

const Input = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().optional(),
});

export const speakText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice ?? "alloy",
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
      if (res.status === 429) throw new Error("Voice service rate-limited. Try again shortly.");
      throw new Error(`TTS failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return { audio: base64, mime: "audio/mpeg" };
  });
