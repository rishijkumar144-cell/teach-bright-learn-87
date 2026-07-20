import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, ChevronDown, ChevronUp, Save, Trash2, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateStudentInsights } from "@/lib/ai.functions";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import type { Block, Submission } from "@/lib/types";
import { InteractiveWidget } from "@/components/teacher/InteractiveRunner";
import { GRADED_TYPES, ParagraphWithMath } from "@/components/teacher/BlockEditor";
import type { InteractiveSpec } from "@/lib/charts";

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

function blockPoints(b: Block): number {
  const p = (b.data as Record<string, unknown>).points;
  if (typeof p === "number" && Number.isFinite(p)) return Math.max(0, Math.min(20, p));
  return 1;
}


function StudentsPage() {
  const { submissions, lessons, gradeSubmission, deleteSubmission } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<string | null>(null);


  const byStudent = useMemo(() => {
    const map = new Map<string, { name: string; email: string; count: number; last: number }>();
    for (const s of submissions) {
      const cur = map.get(s.studentName) || { name: s.studentName, email: "", count: 0, last: 0 };
      cur.count += 1;
      cur.last = Math.max(cur.last, s.submittedAt);
      if (!cur.email && s.studentEmail) cur.email = s.studentEmail;
      map.set(s.studentName, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.last - a.last);
  }, [submissions]);

  const selectedStudentEmail = useMemo(() => {
    if (!studentFilter) return "";
    return byStudent.find((s) => s.name === studentFilter)?.email ?? "";
  }, [studentFilter, byStudent]);

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-muted-foreground">
          See who has completed your lessons and grade open-ended answers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-soft lg:col-span-1">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Students</h2>
            {byStudent.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Publish a lesson and share the link.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {byStudent.map((s) => {
                  const active = studentFilter === s.name;
                  return (
                    <li key={s.name}>
                      <button
                        type="button"
                        onClick={() => setStudentFilter(active ? null : s.name)}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                          active ? "bg-primary/10 ring-1 ring-primary/40" : "bg-accent/40 hover:bg-accent/60"
                        }`}
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                          {s.name[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.count} submission{s.count === 1 ? "" : "s"} ·{" "}
                            {formatDistanceToNow(s.last, { addSuffix: true })}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

            )}
          </CardContent>
        </Card>

        {studentFilter && (
          <div className="lg:col-span-1 lg:col-start-1">
            <StudentInsights
              studentName={studentFilter}
              studentEmail={selectedStudentEmail}
            />
          </div>
        )}

        <Card className="card-soft lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Submissions</h2>
            {submissions.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No submissions yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Share a published lesson link — student submissions appear here.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {submissions
                  .filter((s) => !studentFilter || s.studentName === studentFilter)
                  .map((s) => {

                  const lesson = lessons.find((l) => l.id === s.lessonId);
                  const open = expanded === s.id;
                  return (
                    <li
                      key={s.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <button
                        onClick={() => setExpanded(open ? null : s.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30"
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                          {s.studentName[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate">
                            <span className="font-medium">{s.studentName}</span>{" "}
                            <span className="text-muted-foreground text-sm">
                              — {lesson?.title ?? "Deleted lesson"}
                            </span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.studentEmail ? <span>{s.studentEmail} · </span> : null}
                            {formatDistanceToNow(s.submittedAt, { addSuffix: true })}
                          </div>
                        </div>
                        {s.gradedAt && s.manualTotal && s.manualTotal > 0 ? (
                          <Badge className="rounded-full bg-[oklch(0.7_0.15_160)/15%] text-[oklch(0.4_0.15_160)] dark:text-[oklch(0.85_0.15_160)] border-0">
                            {Math.round(((s.manualScore ?? 0) / s.manualTotal) * 1000) / 10}%
                          </Badge>
                        ) : s.gradedAt ? (
                          <Badge className="rounded-full bg-[oklch(0.7_0.15_160)/15%] text-[oklch(0.4_0.15_160)] dark:text-[oklch(0.85_0.15_160)] border-0">
                            Graded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">
                            Needs review
                          </Badge>
                        )}
                        {open ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {open && lesson && (
                        <SubmissionDetail
                          submission={s}
                          blocks={lesson.blocks}
                          onGrade={(patch) => gradeSubmission(s.id, patch)}
                          onDelete={async () => {
                            await deleteSubmission(s.id);
                            toast.success("Submission deleted");
                            setExpanded(null);
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}

function SubmissionDetail({
  submission,
  blocks,
  onGrade,
  onDelete,
}: {
  submission: Submission;
  blocks: Block[];
  onGrade: (patch: {
    manualScore?: number | null;
    manualTotal?: number | null;
    feedback?: Record<string, { score?: number; comment?: string; excused?: boolean }>;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<
    Record<string, { score?: number; comment?: string; excused?: boolean }>
  >(submission.feedback ?? {});
  const [showFull, setShowFull] = useState(false);
  const gradedBlocks = blocks.filter((b) => GRADED_TYPES.has(b.type));
  const answers = submission.answers as Record<string, unknown>;

  const earned = gradedBlocks.reduce((sum, b) => {
    const fb = feedback[b.id];
    if (fb?.excused) return sum;
    return sum + (typeof fb?.score === "number" ? fb.score : 0);
  }, 0);
  const totalPossible = gradedBlocks.reduce((sum, b) => {
    const fb = feedback[b.id];
    if (fb?.excused) return sum;
    return sum + blockPoints(b);
  }, 0);
  const percent = totalPossible > 0 ? Math.round((earned / totalPossible) * 1000) / 10 : null;

  const save = async () => {
    await onGrade({
      manualScore: earned,
      manualTotal: totalPossible,
      feedback,
    });
    toast.success("Graded and saved");
  };

  const renderAnswer = (b: Block): React.ReactNode => {
    const d = b.data as Record<string, unknown>;
    const ans = answers[b.id];
    const hasAns =
      ans !== undefined &&
      ans !== null &&
      ans !== "" &&
      !(Array.isArray(ans) && ans.length === 0) &&
      !(typeof ans === "object" && !Array.isArray(ans) && Object.keys(ans as object).length === 0);
    if (!hasAns) return <span className="italic text-muted-foreground">No answer (skipped)</span>;
    if (b.type === "interactive" && d.spec) {
      return (
        <div className="mt-2 rounded-lg border border-border bg-background p-3">
          <InteractiveWidget
            spec={d.spec as InteractiveSpec}
            value={ans}
            onChange={() => {}}
            disabled
          />
        </div>
      );
    }
    if (b.type === "mcq" && typeof ans === "number") {
      return ((d.options as string[]) ?? [])[ans] ?? String(ans);
    }
    if (b.type === "checkbox" && Array.isArray(ans)) {
      return (ans as number[])
        .map((i) => ((d.options as string[]) ?? [])[i] ?? i)
        .join(", ");
    }
    if (b.type === "truefalse") return ans ? "True" : "False";
    if (typeof ans === "object") {
      return (
        <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-accent/40 p-2 text-xs">
          {JSON.stringify(ans, null, 2)}
        </pre>
      );
    }
    return String(ans);
  };

  const renderSolution = (b: Block): React.ReactNode => {
    const d = b.data as Record<string, unknown>;
    switch (b.type) {
      case "mcq": {
        const opts = (d.options as string[]) ?? [];
        const idx = d.correct as number | undefined;
        if (typeof idx !== "number") return null;
        return <span>{opts[idx] ?? `Option ${idx + 1}`}</span>;
      }
      case "checkbox": {
        const opts = (d.options as string[]) ?? [];
        const arr = (d.correct as number[]) ?? [];
        if (!arr.length) return null;
        return <span>{arr.map((i) => opts[i] ?? `Option ${i + 1}`).join(", ")}</span>;
      }
      case "truefalse":
        if (typeof d.correct !== "boolean") return null;
        return <span>{d.correct ? "True" : "False"}</span>;
      case "numeric":
        if (d.answer === undefined || d.answer === "") return null;
        return <span>{String(d.answer)}</span>;
      case "short":
        if (!d.answer) return null;
        return <span>{String(d.answer)}</span>;
      case "open":
      case "reflection":
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="border-t border-border bg-background/50 p-5 space-y-5">
      {submission.studentEmail && (
        <div className="text-sm text-muted-foreground">
          Email: <span className="text-foreground">{submission.studentEmail}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Full response</h3>
          <Button variant="outline" size="sm" onClick={() => setShowFull((v) => !v)}>
            {showFull ? (
              <>
                <EyeOff className="h-4 w-4" /> Hide full response
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Show full response
              </>
            )}
          </Button>
        </div>
        {showFull && (
          <ul className="mt-3 space-y-2 text-sm">
            {blocks
              .filter((b) =>
                ["mcq", "checkbox", "short", "numeric", "truefalse", "open", "reflection", "interactive"].includes(
                  b.type,
                ),
              )
              .map((b) => {
                const d = b.data as Record<string, unknown>;
                const label = (d.question ?? d.text ?? b.type) as string;
                const rendered = renderAnswer(b);
                const isInteractive = b.type === "interactive";
                return (
                  <li key={b.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {b.type}
                    </div>
                    <div className="whitespace-pre-wrap font-medium">{label}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {isInteractive ? (
                        rendered
                      ) : (
                        <>Answer: <span className="text-foreground">{rendered}</span></>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {gradedBlocks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Grade questions</h3>
          <p className="text-xs text-muted-foreground">
            Enter points earned for each question, or mark it excused to exclude it from the total.
          </p>
          <ul className="mt-3 space-y-3">
            {gradedBlocks.map((b) => {
              const d = b.data as Record<string, unknown>;
              const fb = feedback[b.id] ?? {};
              const max = blockPoints(b);
              const excused = !!fb.excused;
              return (
                <li key={b.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {b.type} · worth {max} pt{max === 1 ? "" : "s"}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-base font-medium leading-relaxed">
                        {(d.question ?? d.text ?? "Question") as string}
                      </div>
                      {typeof d.description === "string" && d.description.trim() ? (
                        <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {d.description as string}
                        </div>
                      ) : null}
                    </div>
                    <label className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5">
                      <Switch
                        checked={excused}
                        onCheckedChange={(v) =>
                          setFeedback((prev) => ({
                            ...prev,
                            [b.id]: { ...prev[b.id], excused: v },
                          }))
                        }
                      />
                      <span className="text-xs font-medium">Excused</span>
                    </label>
                  </div>

                  <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                    Student answer
                  </div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg bg-accent/40 p-3 text-sm">
                    {renderAnswer(b)}
                  </div>

                  {(() => {
                    const sol = renderSolution(b);
                    const explanation = typeof d.explanation === "string" ? d.explanation.trim() : "";
                    if (!sol && !explanation) return null;
                    return (
                      <>
                        <div className="mt-3 text-xs uppercase tracking-wide text-[oklch(0.45_0.15_160)] dark:text-[oklch(0.8_0.15_160)]">
                          Correct answer
                        </div>
                        <div className="mt-1 space-y-2 rounded-lg border border-[oklch(0.7_0.15_160)/30%] bg-[oklch(0.7_0.15_160)/8%] p-3 text-sm">
                          {sol && <div className="font-medium">{sol}</div>}
                          {explanation && (
                            <div className="whitespace-pre-wrap text-muted-foreground">
                              {explanation}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  <div
                    className={`mt-3 grid gap-3 sm:grid-cols-[160px_1fr] ${
                      excused ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <Label className="text-xs">Points earned (0–{max})</Label>
                      <Input
                        type="number"
                        step={0.5}
                        min={0}
                        max={max}
                        disabled={excused}
                        value={fb.score ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFeedback((prev) => ({
                            ...prev,
                            [b.id]: {
                              ...prev[b.id],
                              score:
                                v === ""
                                  ? undefined
                                  : Math.max(0, Math.min(max, Number(v))),
                            },
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Feedback</Label>
                      <Textarea
                        rows={2}
                        value={fb.comment ?? ""}
                        onChange={(e) =>
                          setFeedback((prev) => ({
                            ...prev,
                            [b.id]: { ...prev[b.id], comment: e.target.value },
                          }))
                        }
                        placeholder="Optional feedback for the student"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-accent/30 p-4">
            <div className="text-sm">
              <div className="text-muted-foreground">
                Earned{" "}
                <span className="font-semibold text-foreground">{earned}</span>{" "}
                / {totalPossible} non-excused points
              </div>
              <div className="mt-0.5 text-2xl font-bold tracking-tight">
                {percent === null ? "—" : `${percent}%`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button onClick={save}>
                <Save className="h-4 w-4" /> Save grade
              </Button>
            </div>
          </div>
        </div>
      )}

      {gradedBlocks.length === 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

interface Mistake {
  lessonTitle: string;
  subject: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  submittedAt: string;
}

interface InsightsResult {
  mistakes: Mistake[];
  summary: string;
  studentName?: string;
  totalGraded?: number;
}

function StudentInsights({ studentName, studentEmail }: { studentName: string; studentEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const run = useServerFn(generateStudentInsights);

  async function generate() {
    if (!studentEmail) {
      setError("This student has no email on file. Enable 'One response per email' or ask the student to enter an email on new submissions.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await run({ data: { studentEmail } });
      setResult(r as InsightsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setBusy(false);
    }
  }

  const visibleMistakes = result?.mistakes ? (showAll ? result.mistakes : result.mistakes.slice(0, 5)) : [];

  return (
    <Card className="card-soft">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Insights
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Analyze {studentName}'s mistakes across all their submissions and get suggested focus areas.
            </p>
            {studentEmail && (
              <p className="mt-1 text-xs text-muted-foreground">Tracking by: {studentEmail}</p>
            )}
          </div>
          <Button onClick={generate} disabled={busy || !studentEmail} size="sm">
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {result ? "Regenerate" : "Analyze"}</>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-accent/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coach's summary
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"><ParagraphWithMath text={result.summary} /></p>
            </div>

            {result.mistakes.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mistake history ({result.mistakes.length})
                  </div>
                  {result.mistakes.length > 5 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? "Show top 5" : "Show all"}
                    </Button>
                  )}
                </div>
                <ul className="space-y-2">
                  {visibleMistakes.map((m, i) => (
                    <li key={i} className="rounded-xl border border-border bg-card p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {m.subject ? `${m.subject} · ` : ""}{m.lessonTitle}
                      </div>
                      <div className="mt-1 font-medium"><ParagraphWithMath text={m.question} /></div>
                      <div className="mt-1 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <div className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">
                          <span className="font-semibold">Answered:</span> <ParagraphWithMath text={String(m.studentAnswer ?? "")} />
                        </div>
                        <div className="rounded-lg bg-[oklch(0.7_0.15_160)/15%] px-2 py-1 text-[oklch(0.4_0.15_160)] dark:text-[oklch(0.85_0.15_160)]">
                          <span className="font-semibold">Correct:</span> <ParagraphWithMath text={String(m.correctAnswer ?? "")} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

