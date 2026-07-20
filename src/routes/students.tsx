import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, ChevronDown, ChevronUp, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { Block, Submission } from "@/lib/types";

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

const OPEN_TYPES = new Set(["open", "reflection", "short"]);

function StudentsPage() {
  const { submissions, lessons, gradeSubmission, deleteSubmission } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<string | null>(null);


  const byStudent = useMemo(() => {
    const map = new Map<string, { name: string; count: number; last: number }>();
    for (const s of submissions) {
      const cur = map.get(s.studentName) || { name: s.studentName, count: 0, last: 0 };
      cur.count += 1;
      cur.last = Math.max(cur.last, s.submittedAt);
      map.set(s.studentName, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.last - a.last);
  }, [submissions]);

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
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(s.submittedAt, { addSuffix: true })}
                          </div>
                        </div>
                        {s.autoTotal ? (
                          <Badge variant="secondary" className="rounded-full">
                            Auto {s.autoScore}/{s.autoTotal}
                          </Badge>
                        ) : null}
                        {s.gradedAt ? (
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
    feedback?: Record<string, { score?: number; comment?: string }>;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<Record<string, { score?: number; comment?: string }>>(
    submission.feedback ?? {},
  );
  const openBlocks = blocks.filter((b) => OPEN_TYPES.has(b.type));
  const answers = submission.answers as Record<string, unknown>;

  const totalManual = openBlocks.length;
  const scoreManual = Object.values(feedback).reduce(
    (a, f) => a + (typeof f.score === "number" ? f.score : 0),
    0,
  );

  const save = async () => {
    await onGrade({
      manualScore: scoreManual,
      manualTotal: totalManual,
      feedback,
    });
    toast.success("Graded and saved");
  };

  return (
    <div className="border-t border-border bg-background/50 p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold">All answers</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {blocks
            .filter((b) => answers[b.id] !== undefined)
            .map((b) => {
              const d = b.data as Record<string, unknown>;
              const ans = answers[b.id];
              const label = (d.question ?? d.text ?? b.type) as string;
              let render: string;
              if (b.type === "mcq" && typeof ans === "number") {
                render = ((d.options as string[]) ?? [])[ans] ?? String(ans);
              } else if (b.type === "checkbox" && Array.isArray(ans)) {
                render = (ans as number[])
                  .map((i) => ((d.options as string[]) ?? [])[i] ?? i)
                  .join(", ");
              } else if (b.type === "truefalse") {
                render = ans ? "True" : "False";
              } else {
                render = String(ans);
              }
              return (
                <li key={b.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {b.type}
                  </div>
                  <div className="font-medium">{label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Answer: <span className="text-foreground">{render}</span>
                  </div>
                </li>
              );
            })}
        </ul>
      </div>

      {openBlocks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Grade open-ended answers</h3>
          <p className="text-xs text-muted-foreground">
            Score each answer out of 1 and leave optional feedback.
          </p>
          <ul className="mt-3 space-y-3">
            {openBlocks.map((b) => {
              const d = b.data as Record<string, unknown>;
              const val = answers[b.id];
              const fb = feedback[b.id] ?? {};
              return (
                <li key={b.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-medium">
                    {(d.question ?? d.text ?? "Open response") as string}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap rounded-lg bg-accent/40 p-3 text-sm">
                    {typeof val === "string" && val.trim() ? val : (
                      <span className="italic text-muted-foreground">No answer</span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                    <div>
                      <Label className="text-xs">Score (0–1)</Label>
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        max={1}
                        value={fb.score ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFeedback((prev) => ({
                            ...prev,
                            [b.id]: {
                              ...prev[b.id],
                              score: v === "" ? undefined : Number(v),
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
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Manual total: <span className="font-medium text-foreground">{scoreManual}</span> /{" "}
              {totalManual}
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

      {openBlocks.length === 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}
