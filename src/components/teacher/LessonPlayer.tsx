import { type ReactNode, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Box, Lightbulb, MessageCircleQuestion, BookmarkCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Block, Lesson } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { MathPreview } from "./MathPreview";
import { cn } from "@/lib/utils";

const QUESTION_TYPES = new Set(["mcq", "checkbox", "truefalse", "short", "numeric"]);

function hasAnswer(block: Block, value: unknown): boolean {
  switch (block.type) {
    case "mcq":
    case "truefalse":
      return value !== undefined && value !== null;
    case "numeric":
      return typeof value === "number" && !Number.isNaN(value);
    case "checkbox":
      return Array.isArray(value) && (value as unknown[]).length > 0;
    case "short":
      return typeof value === "string" && value.trim().length > 0;
    default:
      return true;
  }
}

export function LessonPlayer({
  lesson,
  onFinish,
  headerExtra,
}: {
  lesson: Lesson;
  onFinish?: (studentName: string) => void;
  headerExtra?: ReactNode;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [nameGate, setNameGate] = useState(lesson.requireStudentName);
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const questionBlocks = useMemo(
    () => lesson.blocks.filter((b) => QUESTION_TYPES.has(b.type)),
    [lesson.blocks],
  );
  const total = questionBlocks.length || 1;
  const answered = questionBlocks.filter((b) => hasAnswer(b, answers[b.id])).length;
  const progress = questionBlocks.length
    ? Math.round((answered / total) * 100)
    : done
      ? 100
      : 0;

  const handleSubmit = () => {
    const missingIds = new Set<string>();
    for (const b of lesson.blocks) {
      const d = b.data as Record<string, unknown>;
      if (d.required && !hasAnswer(b, answers[b.id])) missingIds.add(b.id);
    }
    if (missingIds.size > 0) {
      setMissing(missingIds);
      toast.error(
        `Please answer ${missingIds.size} required question${missingIds.size > 1 ? "s" : ""}.`,
      );
      const first = document.getElementById(`block-${Array.from(missingIds)[0]}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMissing(new Set());
    setDone(true);
    onFinish?.(name);
  };

  if (nameGate) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-lift"
        >
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="mt-2 text-muted-foreground">Please enter your name to begin.</p>
          <Input
            className="mt-6 h-12 text-lg"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="mt-4 h-12 w-full text-base"
            onClick={() => name.trim() && setNameGate(false)}
            disabled={!name.trim()}
          >
            Start lesson
          </Button>
        </motion.div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full rounded-3xl border border-border bg-card p-10 shadow-lift"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-3xl">
            🎉
          </div>
          <h1 className="mt-4 text-3xl font-bold">Great work{name ? `, ${name}` : ""}!</h1>
          <p className="mt-2 text-muted-foreground">
            You finished <span className="font-medium">{lesson.title}</span>. Your teacher will
            see your completion.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setDone(false);
              setAnswers({});
              setMissing(new Set());
            }}
          >
            Review the lesson
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{lesson.title}</div>
              <div className="text-xs text-muted-foreground">
                {lesson.subject} · {lesson.gradeLevel} · {lesson.estimatedTime} min
                {questionBlocks.length > 0 && (
                  <>
                    {" "}
                    · {answered}/{questionBlocks.length} answered
                  </>
                )}
              </div>
            </div>
            {headerExtra}
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {lesson.description && (
          <p className="text-lg leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        {lesson.blocks.map((b) => (
          <div key={b.id} id={`block-${b.id}`}>
            <BlockRender
              block={b}
              value={answers[b.id]}
              onChange={(v) => {
                setAnswers((a) => ({ ...a, [b.id]: v }));
                if (missing.has(b.id)) {
                  setMissing((prev) => {
                    const next = new Set(prev);
                    next.delete(b.id);
                    return next;
                  });
                }
              }}
              isMissing={missing.has(b.id)}
            />
          </div>
        ))}
        <div className="pt-6">
          <Button size="lg" className="h-12 w-full text-base" onClick={handleSubmit}>
            Submit lesson
          </Button>
        </div>
      </article>
    </div>
  );
}

function BlockRender({
  block,
  value,
  onChange,
  isMissing,
}: {
  block: Block;
  value: unknown;
  onChange: (v: unknown) => void;
  isMissing: boolean;
}) {
  const d = block.data as Record<string, any>;
  switch (block.type) {
    case "heading":
      return <h2 className="text-2xl font-bold tracking-tight">{d.text}</h2>;
    case "paragraph":
      return <p className="text-lg leading-relaxed">{d.text}</p>;
    case "summary":
      return (
        <div className="flex gap-3 rounded-2xl border border-border bg-accent/50 p-4">
          <BookmarkCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="text-sm font-semibold">Summary</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.text}</p>
          </div>
        </div>
      );
    case "hint":
      return (
        <div className="flex gap-3 rounded-2xl border border-[oklch(0.78_0.15_75)/40%] bg-[oklch(0.78_0.15_75)/10%] p-4">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.55_0.15_75)]" />
          <div>
            <div className="text-sm font-semibold">Hint</div>
            <p className="mt-1 text-sm leading-relaxed">{d.text}</p>
          </div>
        </div>
      );
    case "reflection":
      return (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircleQuestion className="h-4 w-4 text-primary" /> Reflect
          </div>
          <p className="mt-2 text-base">{d.question}</p>
          <Textarea
            rows={3}
            placeholder="Your thoughts…"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="mt-3"
          />
        </div>
      );
    case "divider":
      return <hr className="border-border" />;
    case "image":
      return d.url ? (
        <figure className="overflow-hidden rounded-2xl border border-border">
          <img src={d.url} alt={d.caption || ""} className="w-full" />
          {d.caption && (
            <figcaption className="p-3 text-sm text-muted-foreground">{d.caption}</figcaption>
          )}
        </figure>
      ) : null;
    case "video":
      return d.url ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="aspect-video bg-black">
            {d.url.includes("youtube") || d.url.includes("youtu.be") ? (
              <iframe
                src={d.url.replace("watch?v=", "embed/")}
                className="h-full w-full"
                allowFullScreen
                title={d.caption || "Video"}
              />
            ) : (
              <video src={d.url} controls className="h-full w-full" />
            )}
          </div>
          {d.caption && <p className="p-3 text-sm text-muted-foreground">{d.caption}</p>}
        </div>
      ) : null;
    case "math":
      return (
        <div className="rounded-2xl bg-accent/60 p-6 text-center text-2xl">
          <MathPreview equation={d.equation ?? ""} />
        </div>
      );
    case "mcq":
      return (
        <QuestionCard question={d.question} required={d.required} isMissing={isMissing} explanation={d.explanation} showExplanation={value != null}>
          <RadioGroup
            value={value != null ? String(value) : undefined}
            onValueChange={(v) => onChange(Number(v))}
            className="space-y-2"
          >
            {(d.options as string[]).map((opt, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-accent/50"
              >
                <RadioGroupItem value={String(i)} />
                <span>{opt}</span>
              </label>
            ))}
          </RadioGroup>
        </QuestionCard>
      );
    case "checkbox": {
      const sel: number[] = Array.isArray(value) ? (value as number[]) : [];
      return (
        <QuestionCard question={d.question} required={d.required} isMissing={isMissing} explanation={d.explanation} showExplanation={sel.length > 0}>
          <div className="space-y-2">
            {(d.options as string[]).map((opt, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-accent/50"
              >
                <Checkbox
                  checked={sel.includes(i)}
                  onCheckedChange={(v) => {
                    const next = new Set(sel);
                    if (v) next.add(i);
                    else next.delete(i);
                    onChange(Array.from(next));
                  }}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </QuestionCard>
      );
    }
    case "truefalse":
      return (
        <QuestionCard question={d.question} required={d.required} isMissing={isMissing} explanation={d.explanation} showExplanation={value != null}>
          <RadioGroup
            value={value != null ? String(value) : undefined}
            onValueChange={(v) => onChange(v === "true")}
            className="flex gap-3"
          >
            {["true", "false"].map((v) => (
              <label
                key={v}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border p-4 font-medium transition hover:bg-accent/50"
              >
                <RadioGroupItem value={v} />
                {v === "true" ? "True" : "False"}
              </label>
            ))}
          </RadioGroup>
        </QuestionCard>
      );
    case "short":
      return (
        <QuestionCard question={d.question} required={d.required} isMissing={isMissing} explanation={d.explanation} showExplanation={typeof value === "string" && value.trim().length > 0}>
          <Textarea
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
          />
        </QuestionCard>
      );
    case "numeric":
      return (
        <QuestionCard question={d.question} required={d.required} isMissing={isMissing} explanation={d.explanation} showExplanation={typeof value === "number" && !Number.isNaN(value)}>
          <Input
            type="number"
            value={(value as number | undefined) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-12 text-lg"
            placeholder="Your answer"
          />
        </QuestionCard>
      );
    case "model3d":
      return (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Box className="h-4 w-4 text-primary" /> {d.name || "Interactive 3D Model"}
          </div>
          {d.description && (
            <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
          )}
          <div className="mt-4 grid place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-accent p-10 text-center">
            <Box className="h-10 w-10 text-primary" />
            <div className="mt-2 text-sm font-medium">3D preview coming soon</div>
          </div>
          {d.notes && (
            <div className="mt-4 rounded-xl border border-border bg-background/60 p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              <p className="leading-relaxed">{d.notes}</p>
            </div>
          )}
        </div>
      );
  }
}

function QuestionCard({
  question,
  children,
  required,
  isMissing,
  explanation,
  showExplanation,
}: {
  question: string;
  children: ReactNode;
  required?: boolean;
  isMissing?: boolean;
  explanation?: string;
  showExplanation?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft transition",
        isMissing ? "border-destructive ring-2 ring-destructive/30" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-medium">
          {question}
          {required && <span className="ml-1 text-destructive" aria-label="required">*</span>}
        </p>
        {required && (
          <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            Required
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
      {isMissing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> This question is required.
        </div>
      )}
      {showExplanation && explanation && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Explanation
          </div>
          <p className="leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
