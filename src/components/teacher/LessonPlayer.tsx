import { type ReactNode, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Box, Lightbulb, MessageCircleQuestion, BookmarkCheck, AlertCircle, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Block, Lesson } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MathPreview } from "./MathPreview";
import { ParagraphWithMath } from "./BlockEditor";
import type { BarSpec } from "./BlockEditor";
import { cn } from "@/lib/utils";

const QUESTION_TYPES = new Set(["mcq", "checkbox", "truefalse", "short", "numeric", "open", "interactive"]);
const SUBMITTABLE_TYPES = new Set(["mcq", "checkbox", "truefalse", "short", "numeric", "open", "interactive"]);

export interface LessonAttemptResult {
  studentName: string;
  answers: Record<string, unknown>;
}

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
    case "open":
      return typeof value === "string" && value.trim().length > 0;
    default:
      return true;
  }
}

function paginate(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]];
  for (const b of blocks) {
    if (b.type === "split") {
      pages.push([]);
      // stash label on the previous page's split marker via a side channel? Keep split block on page end.
      pages[pages.length - 2].push(b);
    } else {
      pages[pages.length - 1].push(b);
    }
  }
  return pages.filter((p) => p.length > 0 || pages.length === 1);
}

export function LessonPlayer({
  lesson,
  onFinish,
  headerExtra,
}: {
  lesson: Lesson;
  onFinish?: (result: LessonAttemptResult) => void | Promise<void>;
  headerExtra?: ReactNode;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [nameGate, setNameGate] = useState(lesson.requireStudentName);
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [pageIdx, setPageIdx] = useState(0);

  const pages = useMemo(() => paginate(lesson.blocks), [lesson.blocks]);
  const currentPage = pages[pageIdx] ?? [];
  const isLastPage = pageIdx >= pages.length - 1;
  const splitBlock = currentPage.find((b) => b.type === "split");
  const pageBlocks = currentPage.filter((b) => b.type !== "split");

  const questionBlocks = useMemo(
    () => lesson.blocks.filter((b) => QUESTION_TYPES.has(b.type)),
    [lesson.blocks],
  );
  const total = questionBlocks.length || 1;
  const answered = questionBlocks.filter((b) => hasAnswer(b, answers[b.id])).length;
  const progress = questionBlocks.length ? Math.round((answered / total) * 100) : done ? 100 : 0;

  // Gate: on this page, every required question and every question with an
  // explanation must be submitted before advancing.
  const pageBlockers = pageBlocks.filter((b) => {
    if (!SUBMITTABLE_TYPES.has(b.type)) return false;
    const d = b.data as Record<string, unknown>;
    if (d.required) return true;
    // Also require submission for MCQ/checkbox/TF/short/numeric so students can't skip past the solution.
    return b.type !== "open" ? true : false;
  });
  const pageComplete = pageBlockers.every((b) => submitted[b.id]);
  const openRequiredMissing = pageBlocks.some((b) => {
    const d = b.data as Record<string, unknown>;
    return b.type === "open" && d.required && !submitted[b.id];
  });

  const handleNext = () => {
    if (!pageComplete || openRequiredMissing) {
      toast.error("Please submit all questions on this page before continuing.");
      return;
    }
    setPageIdx((i) => Math.min(i + 1, pages.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = () => {
    const missingIds = new Set<string>();
    for (const b of lesson.blocks) {
      const d = b.data as Record<string, unknown>;
      if (d.required && !hasAnswer(b, answers[b.id])) missingIds.add(b.id);
    }
    if (missingIds.size > 0) {
      setMissing(missingIds);
      toast.error(`Please answer ${missingIds.size} required question${missingIds.size > 1 ? "s" : ""}.`);
      return;
    }
    setMissing(new Set());
    setDone(true);
    onFinish?.({ studentName: name, answers });
  };

  const submitBlock = (b: Block) => {
    if (!hasAnswer(b, answers[b.id])) {
      const d = b.data as Record<string, unknown>;
      if (d.required || b.type === "open") {
        toast.error("Please answer before submitting.");
        return;
      }
    }
    setSubmitted((s) => ({ ...s, [b.id]: true }));
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
            You finished <span className="font-medium">{lesson.title}</span>. Your teacher will see your completion.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setDone(false);
              setAnswers({});
              setSubmitted({});
              setMissing(new Set());
              setPageIdx(0);
            }}
          >
            Review the lesson
          </Button>
        </motion.div>
      </div>
    );
  }

  const splitLabel = ((splitBlock?.data as Record<string, unknown> | undefined)?.label as string) || "Continue";

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{lesson.title}</div>
              <div className="text-xs text-muted-foreground">
                {lesson.subject} · {lesson.gradeLevel} · {lesson.estimatedTime} min
                {pages.length > 1 && (
                  <> · Page {pageIdx + 1} of {pages.length}</>
                )}
                {questionBlocks.length > 0 && (
                  <> · {answered}/{questionBlocks.length} answered</>
                )}
              </div>
            </div>
            {headerExtra}
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {pageIdx === 0 && lesson.description && (
          <p className="text-lg leading-relaxed text-muted-foreground">{lesson.description}</p>
        )}
        {pageBlocks.map((b) => (
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
              submitted={!!submitted[b.id]}
              onSubmit={() => submitBlock(b)}
            />
          </div>
        ))}
        <div className="pt-6">
          {!isLastPage ? (
            <Button
              size="lg"
              className="h-12 w-full text-base"
              onClick={handleNext}
              disabled={!pageComplete}
            >
              {pageComplete ? (
                <>
                  {splitLabel} <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Submit answers to continue
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full text-base" onClick={handleFinish}>
              Submit lesson
            </Button>
          )}
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
  submitted,
  onSubmit,
}: {
  block: Block;
  value: unknown;
  onChange: (v: unknown) => void;
  isMissing: boolean;
  submitted: boolean;
  onSubmit: () => void;
}) {
  const d = block.data as Record<string, any>;
  switch (block.type) {
    case "heading":
      return <h2 className="text-2xl font-bold tracking-tight">{d.text}</h2>;
    case "paragraph":
      return (
        <p className="text-lg leading-relaxed">
          <ParagraphWithMath text={d.text ?? ""} />
        </p>
      );
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
    case "split":
      return null;
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
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
        >
          <RadioGroup
            value={value != null ? String(value) : undefined}
            onValueChange={(v) => onChange(Number(v))}
            disabled={submitted}
            className="space-y-2"
          >
            {(d.options as string[]).map((opt, i) => {
              const isCorrect = submitted && i === Number(d.correct);
              const isChosenWrong = submitted && value === i && i !== Number(d.correct);
              return (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                    submitted && "cursor-default",
                    isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isChosenWrong && "border-destructive/50 bg-destructive/10",
                    !isCorrect && !isChosenWrong && "border-border hover:bg-accent/50",
                  )}
                >
                  <RadioGroupItem value={String(i)} disabled={submitted} />
                  <span>{opt}</span>
                </label>
              );
            })}
          </RadioGroup>
        </QuestionCard>
      );
    case "checkbox": {
      const sel: number[] = Array.isArray(value) ? (value as number[]) : [];
      const correct: number[] = Array.isArray(d.correct) ? (d.correct as number[]) : [];
      return (
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
        >
          <div className="space-y-2">
            {(d.options as string[]).map((opt, i) => {
              const isCorrect = submitted && correct.includes(i);
              const isChosenWrong = submitted && sel.includes(i) && !correct.includes(i);
              return (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
                    submitted && "cursor-default",
                    isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isChosenWrong && "border-destructive/50 bg-destructive/10",
                    !isCorrect && !isChosenWrong && "border-border hover:bg-accent/50",
                  )}
                >
                  <Checkbox
                    checked={sel.includes(i)}
                    disabled={submitted}
                    onCheckedChange={(v) => {
                      const next = new Set(sel);
                      if (v) next.add(i);
                      else next.delete(i);
                      onChange(Array.from(next));
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </QuestionCard>
      );
    }
    case "truefalse":
      return (
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
        >
          <RadioGroup
            value={value != null ? String(value) : undefined}
            onValueChange={(v) => onChange(v === "true")}
            disabled={submitted}
            className="flex gap-3"
          >
            {["true", "false"].map((v) => {
              const val = v === "true";
              const isCorrect = submitted && val === !!d.correct;
              const isChosenWrong = submitted && value === val && val !== !!d.correct;
              return (
                <label
                  key={v}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border p-4 font-medium transition",
                    submitted && "cursor-default",
                    isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                    isChosenWrong && "border-destructive/50 bg-destructive/10",
                    !isCorrect && !isChosenWrong && "border-border hover:bg-accent/50",
                  )}
                >
                  <RadioGroupItem value={v} disabled={submitted} />
                  {v === "true" ? "True" : "False"}
                </label>
              );
            })}
          </RadioGroup>
        </QuestionCard>
      );
    case "short":
      return (
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
          extra={
            submitted && d.answer ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Sample answer: <span className="font-medium">{d.answer}</span>
              </div>
            ) : null
          }
        >
          <Textarea
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
            disabled={submitted}
          />
        </QuestionCard>
      );
    case "open":
      return (
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
          submitLabel="Submit answer"
          footer={
            <p className="mt-2 text-xs text-muted-foreground">
              Open-ended · your teacher will read and grade this answer.
            </p>
          }
        >
          <Textarea
            rows={5}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write a detailed answer…"
            disabled={submitted}
          />
        </QuestionCard>
      );
    case "numeric":
      return (
        <QuestionCard
          question={d.question}
          required={d.required}
          isMissing={isMissing}
          explanation={d.explanation}
          submitted={submitted}
          onSubmit={onSubmit}
          canSubmit={hasAnswer(block, value)}
        >
          <Input
            type="number"
            value={(value as number | undefined) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-12 text-lg"
            placeholder="Your answer"
            disabled={submitted}
          />
        </QuestionCard>
      );
    case "model3d":
      return (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Box className="h-4 w-4 text-primary" /> {d.name || "Interactive 3D Model"}
          </div>
          {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
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
  submitted,
  onSubmit,
  canSubmit,
  submitLabel = "Submit",
  extra,
  footer,
}: {
  question: string;
  children: ReactNode;
  required?: boolean;
  isMissing?: boolean;
  explanation?: string;
  submitted?: boolean;
  onSubmit?: () => void;
  canSubmit?: boolean;
  submitLabel?: string;
  extra?: ReactNode;
  footer?: ReactNode;
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
      {footer}
      {isMissing && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> This question is required.
        </div>
      )}
      {!submitted && onSubmit && (
        <div className="mt-4">
          <Button onClick={onSubmit} disabled={!canSubmit} size="sm">
            {submitLabel}
          </Button>
        </div>
      )}
      {submitted && extra}
      {submitted && explanation && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {submitLabel === "Submit answer" ? "Sample solution" : "Explanation"}
          </div>
          <p className="leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
