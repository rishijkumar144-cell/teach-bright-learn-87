import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callGateway(body: Record<string, unknown>): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI is rate-limited right now. Try again in a moment.");
    if (res.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in workspace billing.");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callJson<T>(system: string, user: string, shape: string): Promise<T> {
  const content = await callGateway({
    messages: [
      { role: "system", content: `${system}\n\nReturn ONLY valid JSON matching this shape: ${shape}. No markdown, no code fences, no commentary.` },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });
  // Strip any accidental code fences
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned) as T;
}

// ============================================================
// Block content generation
// ============================================================

const GenerateInput = z.object({
  kind: z.enum([
    "mcq",
    "truefalse",
    "short",
    "numeric",
    "open",
    "paragraph",
    "hint",
    "solution",
  ]),
  topic: z.string().min(1).max(500),
  subject: z.string().max(100).optional(),
  gradeLevel: z.string().max(100).optional(),
  context: z.string().max(2000).optional(),
});

export const generateBlockContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const audience = [data.subject, data.gradeLevel].filter(Boolean).join(", ");
    const audienceLine = audience ? `Target audience: ${audience}.` : "";
    const contextLine = data.context ? `Existing lesson context: """${data.context}"""` : "";
    const base = `You are an expert teacher creating clear, accurate, curriculum-aligned lesson content. ${audienceLine} ${contextLine}`;

    switch (data.kind) {
      case "mcq": {
        const result = await callJson<{
          question: string;
          options: string[];
          correct: number;
          explanation: string;
        }>(
          base,
          `Write ONE multiple-choice question about: ${data.topic}. Provide exactly 4 answer options, mark which index (0-3) is correct, and include a short explanation of why it is correct.`,
          `{ "question": string, "options": [string, string, string, string], "correct": 0|1|2|3, "explanation": string }`,
        );
        const options = (result.options ?? []).slice(0, 4);
        while (options.length < 4) options.push("");
        let correct = Math.max(0, Math.min(3, result.correct ?? 0));
        // Shuffle so the correct answer isn't biased to any particular slot
        const indices = [0, 1, 2, 3];
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const shuffledOptions = indices.map((i) => options[i]);
        correct = indices.indexOf(correct);
        return { question: result.question ?? "", options: shuffledOptions, correct, explanation: result.explanation ?? "" };
      }
      case "truefalse": {
        const result = await callJson<{
          question: string;
          correct: boolean;
          explanation: string;
        }>(
          base,
          `Write ONE true/false statement about: ${data.topic}. Say whether the statement is true or false, and explain why.`,
          `{ "question": string, "correct": boolean, "explanation": string }`,
        );
        return {
          question: result.question ?? "",
          correct: !!result.correct,
          explanation: result.explanation ?? "",
        };
      }
      case "short": {
        const result = await callJson<{
          question: string;
          answer: string;
          explanation: string;
        }>(
          base,
          `Write ONE short-answer question about: ${data.topic}. Provide the expected answer (a few words or a number) and a brief explanation.`,
          `{ "question": string, "answer": string, "explanation": string }`,
        );
        return {
          question: result.question ?? "",
          answer: result.answer ?? "",
          explanation: result.explanation ?? "",
        };
      }
      case "numeric": {
        const result = await callJson<{
          question: string;
          answer: number;
          explanation: string;
        }>(
          base,
          `Write ONE numeric-answer question about: ${data.topic}. The answer MUST be a single number. Include a brief explanation.`,
          `{ "question": string, "answer": number, "explanation": string }`,
        );
        return {
          question: result.question ?? "",
          answer: Number(result.answer) || 0,
          explanation: result.explanation ?? "",
        };
      }
      case "open": {
        const result = await callJson<{ question: string; explanation: string }>(
          base,
          `Write ONE open-ended prompt about: ${data.topic} that asks the student to explain their reasoning. Provide a model answer teachers can compare against.`,
          `{ "question": string, "explanation": string }`,
        );
        return {
          question: result.question ?? "",
          explanation: result.explanation ?? "",
        };
      }
      case "paragraph": {
        const content = await callGateway({
          messages: [
            {
              role: "system",
              content: `${base} Write a clear teaching article. Use plain paragraphs. You may include inline equations wrapped in single dollar signs like $x^2 + 2x + 1$. Do not use markdown headings or bullet points. Aim for 2-4 short paragraphs.`,
            },
            { role: "user", content: `Write an explanation article about: ${data.topic}` },
          ],
          temperature: 0.7,
        });
        return { text: content.trim() };
      }
      case "hint": {
        const content = await callGateway({
          messages: [
            {
              role: "system",
              content: `${base} Write a single short, encouraging hint (1-2 sentences) that nudges the student toward the answer without giving it away.`,
            },
            { role: "user", content: `Write a hint for a student working on: ${data.topic}` },
          ],
          temperature: 0.7,
        });
        return { text: content.trim() };
      }
      case "solution": {
        const content = await callGateway({
          messages: [
            {
              role: "system",
              content: `${base} Write a clear step-by-step solution explaining how to arrive at the correct answer. Use plain paragraphs and inline $…$ for equations. Keep it concise (3-6 sentences).`,
            },
            { role: "user", content: `Explain the solution for: ${data.topic}` },
          ],
          temperature: 0.6,
        });
        return { text: content.trim() };
      }
    }
  });

// ============================================================
// Student insights (persistent mistake history + AI analysis)
// ============================================================

const InsightsInput = z.object({
  studentEmail: z.string().min(1).max(200),
});

interface MistakeEntry {
  lessonTitle: string;
  subject: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  submittedAt: string;
}

export const generateStudentInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InsightsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load all lessons owned by this teacher
    const { data: lessons, error: lErr } = await supabase
      .from("lessons")
      .select("id, title, subject, blocks")
      .eq("owner_id", userId);
    if (lErr) throw new Error(lErr.message);
    const lessonMap = new Map<string, { title: string; subject: string; blocks: unknown }>();
    for (const l of lessons ?? []) {
      lessonMap.set(l.id, { title: l.title, subject: l.subject, blocks: l.blocks });
    }

    if (lessonMap.size === 0) {
      return { mistakes: [], summary: "No lessons yet — publish a lesson and gather submissions to see insights." };
    }

    // Load all submissions from this student for those lessons
    const lessonIds = Array.from(lessonMap.keys());
    const { data: subs, error: sErr } = await supabase
      .from("submissions")
      .select("id, lesson_id, answers, submitted_at, student_name")
      .eq("student_email", data.studentEmail)
      .in("lesson_id", lessonIds)
      .order("submitted_at", { ascending: false });
    if (sErr) throw new Error(sErr.message);

    const mistakes: MistakeEntry[] = [];
    let totalGraded = 0;
    let studentName = "";

    for (const s of subs ?? []) {
      const lesson = lessonMap.get(s.lesson_id);
      if (!lesson) continue;
      studentName = studentName || s.student_name || "";
      const blocks = Array.isArray(lesson.blocks) ? (lesson.blocks as { id: string; type: string; data: Record<string, unknown> }[]) : [];
      const answers = (s.answers as Record<string, unknown>) ?? {};

      for (const b of blocks) {
        const d = b.data ?? {};
        const ans = answers[b.id];
        if (ans === undefined || ans === null || ans === "") continue;

        let correct: string | null = null;
        let student = "";
        let wrong = false;

        if (b.type === "mcq" && typeof ans === "number") {
          totalGraded++;
          const opts = (d.options as string[]) ?? [];
          const c = d.correct as number;
          correct = opts[c] ?? "";
          student = opts[ans] ?? String(ans);
          wrong = ans !== c;
        } else if (b.type === "truefalse" && typeof ans === "boolean") {
          totalGraded++;
          correct = d.correct ? "True" : "False";
          student = ans ? "True" : "False";
          wrong = ans !== d.correct;
        } else if (b.type === "numeric" && typeof ans === "number") {
          totalGraded++;
          correct = String(d.answer ?? "");
          student = String(ans);
          wrong = Number(d.answer) !== ans;
        } else if (b.type === "short" && typeof ans === "string") {
          totalGraded++;
          const expected = String(d.answer ?? "").trim().toLowerCase();
          if (expected) {
            correct = String(d.answer);
            student = ans;
            wrong = ans.trim().toLowerCase() !== expected;
          }
        } else if (b.type === "checkbox" && Array.isArray(ans)) {
          totalGraded++;
          const opts = (d.options as string[]) ?? [];
          const c = ((d.correct as number[]) ?? []).slice().sort();
          const a = (ans as number[]).slice().sort();
          correct = c.map((i) => opts[i]).join(", ");
          student = a.map((i) => opts[i]).join(", ");
          wrong = c.length !== a.length || c.some((v, i) => v !== a[i]);
        }

        if (wrong && correct !== null) {
          mistakes.push({
            lessonTitle: lesson.title,
            subject: lesson.subject,
            question: String(d.question ?? d.text ?? ""),
            studentAnswer: student,
            correctAnswer: correct,
            submittedAt: String(s.submitted_at),
          });
        }
      }
    }

    if (mistakes.length === 0) {
      return {
        mistakes: [],
        summary: totalGraded === 0
          ? "This student has submitted work, but none of it is auto-gradable yet."
          : `${studentName || "This student"} answered ${totalGraded} auto-graded questions correctly. No weak spots detected.`,
      };
    }

    // Cap what we send to the model to keep the prompt tight
    const capped = mistakes.slice(0, 40);
    const bullets = capped.map((m, i) =>
      `${i + 1}. [${m.subject || "General"}] Lesson "${m.lessonTitle}"\n   Q: ${m.question}\n   Student answered: ${m.studentAnswer}\n   Correct: ${m.correctAnswer}`,
    ).join("\n");

    const summaryPrompt = `You are analyzing one student's mistake history to help their teacher.

Student: ${studentName || data.studentEmail}
Total mistakes: ${mistakes.length}

Mistakes:
${bullets}

Write a brief report FOR THE TEACHER (not the student). Include:
1. Top 2-3 concept areas the student struggles with most (be specific — e.g. "Distributive property", "Confusing area with perimeter").
2. One or two suggested reteach activities or focus topics.
3. Any patterns you notice (e.g. sign errors, mixing up formulas).

Keep it under 200 words. Use plain paragraphs, no markdown headings.`;

    const summary = await callGateway({
      messages: [
        { role: "system", content: "You are a helpful instructional coach writing brief, actionable insights for teachers." },
        { role: "user", content: summaryPrompt },
      ],
      temperature: 0.5,
    });

    return {
      mistakes,
      summary: summary.trim(),
      studentName,
      totalGraded,
    };
  });
