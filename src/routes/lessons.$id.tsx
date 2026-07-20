import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Eye,
  Globe,
  Save,
  Loader2,
  Check,
  Copy,
  QrCode,
  ExternalLink,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { BlockList, BlockPalette, makeBlock } from "@/components/teacher/BlockEditor";
import { LessonPlayer } from "@/components/teacher/LessonPlayer";
import type { Block, BlockType, Difficulty, Lesson } from "@/lib/types";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/lessons/$id")({
  component: LessonEditor,
});

type SaveState = "saved" | "saving" | "dirty";

function LessonEditor() {
  const { id } = Route.useParams();
  const { getLesson, updateLesson, publishLesson, unpublishLesson, archiveLesson } = useStore();
  const navigate = useNavigate();
  const lesson = getLesson(id);

  const [draft, setDraft] = useState<Lesson | null>(lesson ?? null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  useEffect(() => {
    if (lesson && !draft) setDraft(lesson);
  }, [lesson, draft]);

  // Autosave with debounce — depend only on draft so the effect doesn't
  // cancel its own timeout when saveState transitions between renders.
  useEffect(() => {
    if (!draft) return;
    if (saveState !== "dirty") return;
    const t = setTimeout(async () => {
      setSaveState("saving");
      await updateLesson(draft.id, draft);
      setSaveState("saved");
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, updateLesson]);

  const patch = (p: Partial<Lesson>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setSaveState("dirty");
  };

  const addBlock = (t: BlockType) => {
    if (!draft) return;
    patch({ blocks: [...draft.blocks, makeBlock(t)] });
  };

  const setBlocks = (blocks: Block[]) => patch({ blocks });

  const publishUrl = useMemo(() => {
    if (typeof window === "undefined" || !draft) return "";
    return `${window.location.origin}/lesson/${draft.slug}`;
  }, [draft]);

  const publishDisplayPath = draft ? `/lesson/${draft.slug}` : "";

  if (!lesson || !draft) {
    return (
      <TeacherLayout>
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">Lesson not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/lessons">Back to lessons</Link>
          </Button>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/lessons" })} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{draft.title || "Untitled"}</h1>
              <StatusBadge status={draft.status} />
            </div>
            <SaveIndicator state={saveState} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          {draft.status === "published" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  unpublishLesson(draft.id);
                  patch({ status: "draft" });
                  toast.success("Lesson unpublished");
                }}
              >
                Unpublish
              </Button>
              <Button onClick={() => setPublishOpen(true)}>
                <Globe className="h-4 w-4" /> Share link
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                publishLesson(draft.id);
                patch({ status: "published", publishedAt: draft.publishedAt ?? Date.now() });
                setPublishOpen(true);
                toast.success("Lesson published!");
              }}
            >
              <Globe className="h-4 w-4" /> Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Palette */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card-soft p-4">
            <div className="mb-3 text-sm font-semibold">Blocks</div>
            <BlockPalette onAdd={addBlock} />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-4">
              <div className="card-soft p-5 mb-4">
                <Input
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Lesson title"
                  className="h-12 border-0 bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
                />
                <Textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Short description for students…"
                  rows={2}
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <BlockList blocks={draft.blocks} onChange={setBlocks} />
              <div className="mt-4">
                <QuickAdd onAdd={addBlock} />
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <div className="card-soft p-6 grid gap-5 sm:grid-cols-2">
                <Field label="Subject">
                  <Input value={draft.subject} onChange={(e) => patch({ subject: e.target.value })} />
                </Field>
                <Field label="Grade level">
                  <Input value={draft.gradeLevel} onChange={(e) => patch({ gradeLevel: e.target.value })} />
                </Field>
                <Field label="Estimated time (min)">
                  <Input
                    type="number"
                    value={draft.estimatedTime}
                    onChange={(e) => patch({ estimatedTime: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Difficulty">
                  <Select
                    value={draft.difficulty}
                    onValueChange={(v) => patch({ difficulty: v as Difficulty })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Thumbnail URL" full>
                  <Input
                    value={draft.thumbnail}
                    onChange={(e) => patch({ thumbnail: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Learning objectives" full>
                  <Textarea
                    rows={4}
                    value={draft.objectives}
                    onChange={(e) => patch({ objectives: e.target.value })}
                    placeholder="What will students learn?"
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="card-soft p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Require student name & email</div>
                    <p className="text-sm text-muted-foreground">
                      Ask students to enter their name and email before starting.
                    </p>
                  </div>
                  <Switch
                    checked={draft.requireStudentName}
                    onCheckedChange={(v) => patch({ requireStudentName: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">One response per email</div>
                    <p className="text-sm text-muted-foreground">
                      Prevent the same email from submitting more than once.
                    </p>
                  </div>
                  <Switch
                    checked={draft.oneResponsePerEmail}
                    onCheckedChange={(v) => patch({ oneResponsePerEmail: v })}
                  />
                </div>
                <div className="border-t border-border pt-5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      archiveLesson(draft.id);
                      patch({ status: "archived" });
                      toast.success("Lesson archived");
                    }}
                  >
                    <Archive className="h-4 w-4" /> Archive lesson
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-none w-screen h-dvh p-0 sm:rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Preview lesson</DialogTitle>
          </DialogHeader>
          <div className="absolute right-4 top-4 z-30">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close preview
            </Button>
          </div>
          <div className="h-full overflow-auto">
            <LessonPlayer lesson={draft} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish modal */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl px-8 py-10 sm:px-12 lg:px-16">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <Check className="h-4 w-4" />
              </motion.span>
              Lesson published
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Share this link with your students. No login required — they can start instantly.
            </p>
            <div className="rounded-xl border border-border bg-accent/40 p-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Student link
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-3">
                  <div className="truncate font-mono text-sm font-medium" title={publishUrl}>
                    {publishDisplayPath}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={publishUrl}>
                    Full link copied when you press Copy
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 sm:h-12 sm:px-5"
                  onClick={() => {
                    navigator.clipboard.writeText(publishUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" asChild>
                <a href={`/lesson/${draft.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open lesson
                </a>
              </Button>
              <Button variant="outline" onClick={() => toast.info("QR export coming soon")}>
                <QrCode className="h-4 w-4" /> QR code
              </Button>
            </div>
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-6">
              <div className="grid h-32 w-32 place-items-center rounded-xl bg-foreground/90 text-background">
                <QrCode className="h-14 w-14" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">QR code preview</p>
            </div>
            {draft.publishedAt && (
              <p className="text-center text-xs text-muted-foreground">
                Published on {new Date(draft.publishedAt).toLocaleString()}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (t: BlockType) => void }) {
  const quick: { t: BlockType; label: string }[] = [
    { t: "heading", label: "Heading" },
    { t: "paragraph", label: "Paragraph" },
    { t: "mcq", label: "Multiple Choice" },
    { t: "math", label: "Equation" },
    { t: "model3d", label: "3D Model" },
  ];
  return (
    <div className="rounded-2xl border border-dashed border-border p-3">
      <div className="mb-2 text-center text-xs font-medium text-muted-foreground">
        Quick add
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {quick.map((q) => (
          <Button key={q.t} variant="outline" size="sm" onClick={() => onAdd(q.t)}>
            + {q.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map = {
    saved: { icon: Check, label: "Saved", cls: "text-[oklch(0.55_0.15_160)]" },
    saving: { icon: Loader2, label: "Saving…", cls: "text-muted-foreground animate-spin" },
    dirty: { icon: Save, label: "Unsaved changes", cls: "text-[oklch(0.6_0.15_60)]" },
  } as const;
  const it = map[state];
  return (
    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <it.icon className={`h-3.5 w-3.5 ${state === "saving" ? "animate-spin" : ""} ${it.cls}`} />
      {it.label}
    </div>
  );
}
