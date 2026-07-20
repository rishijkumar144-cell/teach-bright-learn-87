import { useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Type,
  AlignLeft,
  Image as ImageIcon,
  Video,
  ListChecks,
  CheckSquare,
  TextCursorInput,
  Hash,
  ToggleLeft,
  Box,
  Lightbulb,
  Minus,
  BookmarkCheck,
  MessageCircleQuestion,
  GripVertical,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Upload,
  Sigma,
  SplitSquareVertical,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Table as TableIcon,
  Grid3x3,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { newBlockId } from "@/lib/store";
import type { Block, BlockType } from "@/lib/types";

export const GRADED_TYPES = new Set<BlockType>([
  "mcq",
  "checkbox",
  "truefalse",
  "short",
  "numeric",
  "open",
  "interactive",
]);

import { cn } from "@/lib/utils";
import { AiGenerateButton } from "./AiGenerateButton";
import { MathPreview } from "./MathPreview";
import { EquationEditor } from "./EquationEditor";
import type {
  DrawShape,
  InteractiveSpec,
  StaticKind,
  StaticSpec,
  ToolKind,
} from "@/lib/charts";
import { SLICE_COLORS, newId } from "@/lib/charts";
import {
  StaticChart,
  InteractiveBarPreview,
  InteractivePieVisual,
  CoordinateGrid,
} from "./Charts";

interface BlockDef {
  type: BlockType;
  label: string;
  icon: typeof Type;
  group: "content" | "media" | "question" | "interactive" | "layout";
  init: () => Record<string, unknown>;
}

export const BLOCK_DEFS: BlockDef[] = [
  { type: "heading", label: "Heading", icon: Type, group: "content", init: () => ({ text: "Heading", level: 2 }) },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft, group: "content", init: () => ({ text: "Write your content here…" }) },
  { type: "summary", label: "Summary", icon: BookmarkCheck, group: "content", init: () => ({ text: "Key takeaways from this section." }) },
  { type: "hint", label: "Hint", icon: Lightbulb, group: "content", init: () => ({ text: "Try breaking the problem into smaller steps." }) },
  { type: "divider", label: "Divider", icon: Minus, group: "layout", init: () => ({}) },
  { type: "split", label: "Page break", icon: SplitSquareVertical, group: "layout", init: () => ({ label: "Continue" }) },
  { type: "image", label: "Image", icon: ImageIcon, group: "media", init: () => ({ url: "", caption: "" }) },
  { type: "video", label: "Video", icon: Video, group: "media", init: () => ({ url: "", caption: "" }) },
  { type: "mcq", label: "Multiple Choice", icon: ListChecks, group: "question", init: () => ({ question: "What is 8 × 7?", options: ["54", "56", "64", "48"], correct: 1, explanation: "", required: false }) },
  { type: "checkbox", label: "Checkbox (Multi)", icon: CheckSquare, group: "question", init: () => ({ question: "Select all prime numbers.", options: ["2", "4", "5", "9"], correct: [0, 2], explanation: "", required: false }) },
  { type: "truefalse", label: "True / False", icon: ToggleLeft, group: "question", init: () => ({ question: "A triangle has 3 sides.", correct: true, explanation: "", required: false }) },
  { type: "short", label: "Short Answer", icon: TextCursorInput, group: "question", init: () => ({ question: "Explain what a variable is.", answer: "", explanation: "", required: false }) },
  { type: "open", label: "Open-ended", icon: MessageCircleQuestion, group: "question", init: () => ({ question: "Explain your reasoning in your own words.", explanation: "", required: false }) },
  { type: "numeric", label: "Numeric Answer", icon: Hash, group: "question", init: () => ({ question: "What is 12 + 15?", answer: 27, explanation: "", required: false }) },
  { type: "reflection", label: "Reflection", icon: MessageCircleQuestion, group: "content", init: () => ({ question: "What was the trickiest part for you?" }) },
  { type: "model2d", label: "2D Diagram", icon: BarChart3, group: "interactive", init: () => ({ spec: { kind: "bar", title: "New chart", categories: [{ label: "A", value: 3 }, { label: "B", value: 5 }, { label: "C", value: 2 }], max: 10, unit: "" } as StaticSpec, caption: "" }) },
  { type: "interactive", label: "Interactive Diagram", icon: Grid3x3, group: "interactive", init: () => ({ spec: { kind: "bar", title: "Match the targets", instructions: "Drag each bar to match its target.", unit: "", max: 10, tolerance: 0, categories: [{ label: "A", target: 4 }, { label: "B", target: 7 }] } as InteractiveSpec, required: true }) },
];

export function BlockPalette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const groups: Array<{ id: string; label: string }> = [
    { id: "content", label: "Content" },
    { id: "question", label: "Questions" },
    { id: "media", label: "Media" },
    { id: "interactive", label: "Interactive" },
    { id: "layout", label: "Layout" },
  ];
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_DEFS.filter((b) => b.group === g.id).map((b) => (
              <button
                key={b.type}
                onClick={() => onAdd(b.type)}
                className="group flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                  <b.icon className="h-4 w-4" />
                </span>
                <span className="truncate">{b.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlockList({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next);
  };

  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const duplicate = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const src = blocks[idx];
    const copy: Block = {
      ...src,
      id: newBlockId(),
      data: JSON.parse(JSON.stringify(src.data)),
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const update = (id: string, data: Record<string, unknown>) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b)));

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
  };
  const onDrop = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = blocks.findIndex((b) => b.id === dragId);
    const to = blocks.findIndex((b) => b.id === overId);
    if (from < 0 || to < 0) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setDragId(null);
  };

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Plus className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Add your first block</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Pick a block from the left panel to start building your lesson.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {blocks.map((b, i) => {
          const isCollapsed = collapsed.has(b.id);
          const def = BLOCK_DEFS.find((d) => d.type === b.type);
          return (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              draggable
              onDragStart={() => onDragStart(b.id)}
              onDragOver={(e) => onDragOver(e, b.id)}
              onDrop={(e) => onDrop(e, b.id)}
              className={cn(
                "group relative rounded-2xl border border-border bg-card p-4 shadow-soft transition",
                dragId === b.id && "opacity-50",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-1 opacity-40 transition group-hover:opacity-100">
                  <button
                    className="cursor-grab active:cursor-grabbing rounded p-1 hover:bg-accent"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1 hover:bg-accent disabled:opacity-30"
                    onClick={() => move(b.id, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded p-1 hover:bg-accent disabled:opacity-30"
                    onClick={() => move(b.id, 1)}
                    disabled={i === blocks.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  {isCollapsed ? (
                    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                      {def && <def.icon className="h-4 w-4" />}
                      <span className="font-medium text-foreground">{def?.label}</span>
                      <span className="truncate">· {blockSummary(b)}</span>
                    </div>
                  ) : (
                    <>
                      <BlockEditor block={b} onChange={(d) => update(b.id, d)} />
                      {GRADED_TYPES.has(b.type) && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-accent/30 px-3 py-2">
                          <Label className="text-xs font-medium">Points</Label>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            step={1}
                            value={
                              (b.data as Record<string, unknown>).points === undefined
                                ? 1
                                : Number((b.data as Record<string, unknown>).points)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? 0 : Math.max(0, Math.min(20, Math.round(Number(raw))));
                              update(b.id, { points: n });
                            }}
                            className="h-8 w-20"
                          />
                          <span className="text-xs text-muted-foreground">
                            Worth 0–20 points. Set to 0 for ungraded practice.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCollapsed(b.id)}
                    aria-label={isCollapsed ? "Expand block" : "Collapse block"}
                    className="text-muted-foreground"
                  >
                    {isCollapsed ? (
                      <ChevronsUpDown className="h-4 w-4" />
                    ) : (
                      <ChevronsDownUp className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => duplicate(b.id)}
                    aria-label="Duplicate block"
                    className="text-muted-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(b.id)}
                    aria-label="Delete block"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function blockSummary(b: Block): string {
  const d = b.data as Record<string, unknown>;
  const pick = (d.text ?? d.question ?? d.equation ?? d.name ?? d.url ?? "") as string;
  const s = String(pick).trim();
  return s ? (s.length > 60 ? s.slice(0, 60) + "…" : s) : "(empty)";
}

function BlockShell({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Type;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (d: Record<string, unknown>) => void }) {
  const def = BLOCK_DEFS.find((d) => d.type === block.type)!;
  const d = block.data as any;

  switch (block.type) {
    case "heading":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <Input
            value={d.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Heading text"
            className="h-11 text-lg font-semibold"
          />
        </BlockShell>
      );
    case "paragraph":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="paragraph"
              onGenerated={(r) => onChange({ text: String(r.text ?? "") })}
            />
          </div>
          <ParagraphEditor
            value={(d.text as string) ?? ""}
            onChange={(text) => onChange({ text })}
          />
        </BlockShell>
      );
    case "summary":
    case "hint":
    case "reflection": {
      const key = block.type === "reflection" ? "question" : "text";
      const placeholder = {
        summary: "Summarize what students should remember.",
        hint: "A helpful nudge for stuck students.",
        reflection: "Ask students to reflect on what they learned.",
      }[block.type];
      return (
        <BlockShell icon={def.icon} label={def.label}>
          {block.type === "hint" && (
            <div className="mb-2 flex justify-end">
              <AiGenerateButton
                kind="hint"
                onGenerated={(r) => onChange({ text: String(r.text ?? "") })}
              />
            </div>
          )}
          <Textarea
            value={d[key] ?? ""}
            onChange={(e) => onChange({ [key]: e.target.value })}
            placeholder={placeholder}
            rows={2}
          />
        </BlockShell>
      );
    }
    case "divider":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="my-2 h-px bg-border" />
        </BlockShell>
      );
    case "image":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <ImageBlockEditor d={d} onChange={onChange} />
        </BlockShell>
      );
    case "video":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="space-y-2">
            <Input
              value={d.url ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…/video.mp4 or YouTube URL"
            />
            <Input
              value={d.caption ?? ""}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Optional caption"
            />
          </div>
        </BlockShell>
      );
    case "split":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="text-sm font-medium">Page break</div>
            <p className="text-xs text-muted-foreground">
              Everything after this block starts a new page. Students must complete this page
              before they can move on.
            </p>
            <div className="mt-2">
              <Label className="text-xs">Next-page button label</Label>
              <Input
                value={(d.label as string) ?? ""}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder="Continue"
              />
            </div>
          </div>
        </BlockShell>
      );
    case "math":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="rounded-xl border border-dashed border-border bg-accent/30 p-3 text-xs text-muted-foreground">
            The standalone Math block is deprecated. Use a Paragraph block and click the{" "}
            <Sigma className="inline h-3 w-3" /> button to insert inline equations with{" "}
            <code className="font-mono">$…$</code>.
          </div>
          <div className="mt-2 min-h-[48px] rounded-xl bg-accent/60 p-3 text-center">
            <MathPreview equation={d.equation ?? ""} />
          </div>
        </BlockShell>
      );
    case "mcq":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="mcq"
              onGenerated={(r) =>
                onChange({
                  question: String(r.question ?? ""),
                  options: Array.isArray(r.options) ? r.options : [],
                  correct: typeof r.correct === "number" ? r.correct : 0,
                  explanation: String(r.explanation ?? ""),
                })
              }
            />
          </div>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Question"
            rows={2}
          />
          <div className="mt-3 space-y-2">
            {(d.options as string[]).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ correct: i })}
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-semibold",
                    d.correct === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                  aria-label={`Mark option ${i + 1} correct`}
                >
                  {d.correct === i ? "✓" : String.fromCharCode(65 + i)}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...(d.options as string[])];
                    opts[i] = e.target.value;
                    onChange({ options: opts });
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const opts = (d.options as string[]).filter((_, k) => k !== i);
                    onChange({ options: opts, correct: Math.min(d.correct, opts.length - 1) });
                  }}
                  aria-label="Remove option"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ options: [...(d.options as string[]), "New option"] })}
            >
              <Plus className="h-4 w-4" /> Add option
            </Button>
          </div>
          <QuestionExtras d={d} onChange={onChange} />
        </BlockShell>
      );
    case "checkbox":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Question"
            rows={2}
          />
          <div className="mt-3 space-y-2">
            {(d.options as string[]).map((opt, i) => {
              const correct = (d.correct as number[]).includes(i);
              return (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox
                    checked={correct}
                    onCheckedChange={(v) => {
                      const set = new Set(d.correct as number[]);
                      if (v) set.add(i);
                      else set.delete(i);
                      onChange({ correct: Array.from(set).sort() });
                    }}
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(d.options as string[])];
                      opts[i] = e.target.value;
                      onChange({ options: opts });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const opts = (d.options as string[]).filter((_, k) => k !== i);
                      onChange({
                        options: opts,
                        correct: (d.correct as number[]).filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)),
                      });
                    }}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ options: [...(d.options as string[]), "New option"] })}
            >
              <Plus className="h-4 w-4" /> Add option
            </Button>
          </div>
          <QuestionExtras d={d} onChange={onChange} />
        </BlockShell>
      );
    case "truefalse":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="truefalse"
              onGenerated={(r) =>
                onChange({
                  question: String(r.question ?? ""),
                  correct: !!r.correct,
                  explanation: String(r.explanation ?? ""),
                })
              }
            />
          </div>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Statement"
            rows={2}
          />
          <RadioGroup
            value={String(d.correct)}
            onValueChange={(v) => onChange({ correct: v === "true" })}
            className="mt-3 flex gap-4"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="true" /> True
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="false" /> False
            </label>
          </RadioGroup>
          <QuestionExtras d={d} onChange={onChange} />
        </BlockShell>
      );
    case "short":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="short"
              onGenerated={(r) =>
                onChange({
                  question: String(r.question ?? ""),
                  answer: String(r.answer ?? ""),
                  explanation: String(r.explanation ?? ""),
                })
              }
            />
          </div>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Question"
            rows={2}
          />
          <Input
            value={d.answer ?? ""}
            onChange={(e) => onChange({ answer: e.target.value })}
            placeholder="Expected answer (optional)"
            className="mt-2"
          />
          <QuestionExtras d={d} onChange={onChange} />
        </BlockShell>
      );
    case "open":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="open"
              onGenerated={(r) =>
                onChange({
                  question: String(r.question ?? ""),
                  explanation: String(r.explanation ?? ""),
                })
              }
            />
          </div>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Prompt for the student to write a long-form answer…"
            rows={2}
          />
          <div className="mt-3">
            <Label className="text-xs">Sample solution (shown after they submit)</Label>
            <Textarea
              rows={3}
              value={(d.explanation as string) ?? ""}
              onChange={(e) => onChange({ explanation: e.target.value })}
              placeholder="A model answer or key points the student can compare to…"
            />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-accent/30 p-3">
            <div>
              <div className="text-sm font-medium">Required</div>
              <p className="text-xs text-muted-foreground">
                Student must write and submit an answer before they can move on. You will grade
                it manually.
              </p>
            </div>
            <Switch
              checked={!!d.required}
              onCheckedChange={(v) => onChange({ required: v })}
            />
          </div>
        </BlockShell>
      );
    case "numeric":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <div className="mb-2 flex justify-end">
            <AiGenerateButton
              kind="numeric"
              onGenerated={(r) =>
                onChange({
                  question: String(r.question ?? ""),
                  answer: typeof r.answer === "number" ? r.answer : Number(r.answer) || 0,
                  explanation: String(r.explanation ?? ""),
                })
              }
            />
          </div>
          <Textarea
            value={d.question ?? ""}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Question"
            rows={2}
          />
          <Input
            type="number"
            value={d.answer ?? ""}
            onChange={(e) => onChange({ answer: Number(e.target.value) })}
            placeholder="Correct number"
            className="mt-2"
          />
          <QuestionExtras d={d} onChange={onChange} />
        </BlockShell>
      );
    case "model2d":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <Model2DBlockEditor d={d} onChange={onChange} />
        </BlockShell>
      );
    case "interactive":
      return (
        <BlockShell icon={def.icon} label={def.label}>
          <InteractiveBlockEditor d={d} onChange={onChange} />
        </BlockShell>
      );
  }
}

function QuestionExtras({
  d,
  onChange,
}: {
  d: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-accent/30 p-3">
      <div>
        <Label className="text-xs">Explanation (shown after answering)</Label>
        <Textarea
          rows={2}
          value={(d.explanation as string) ?? ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Explain the correct answer…"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Required</div>
          <p className="text-xs text-muted-foreground">
            Students must answer before submitting.
          </p>
        </div>
        <Switch
          checked={!!d.required}
          onCheckedChange={(v) => onChange({ required: v })}
        />
      </div>
    </div>
  );
}

export function AddBlockPopover({ onAdd }: { onAdd: (t: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="h-4 w-4" /> Add block
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="center">
        <BlockPalette
          onAdd={(t) => {
            onAdd(t);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function makeBlock(type: BlockType): Block {
  const def = BLOCK_DEFS.find((d) => d.type === type)!;
  return { id: newBlockId(), type, data: def.init() };
}

function ParagraphEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insertLatex = (latex: string) => {
    const snippet = `$${latex}$`;
    const ta = ref.current;
    if (!ta) {
      onChange((value ?? "") + " " + snippet);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <EquationEditor onInsert={insertLatex} />
        <span className="text-xs text-muted-foreground">
          Click to open the visual editor — no LaTeX required.
        </span>
      </div>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your paragraph… click Insert equation for math."
        rows={4}
      />
      {value.includes("$") && (
        <div className="mt-2 rounded-xl border border-border bg-accent/30 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </div>
          <ParagraphWithMath text={value} />
        </div>
      )}
    </div>
  );
}


export function ParagraphWithMath({ text }: { text: string }) {
  const parts = (text ?? "").split(/(\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length >= 2 && p.startsWith("$") && p.endsWith("$")) {
          return (
            <MathPreview
              key={i}
              equation={p.slice(1, -1)}
              displayMode={false}
              className="mx-0.5"
            />
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function ImageBlockEditor({
  d,
  onChange,
}: {
  d: Record<string, any>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ url: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Input
        value={d.url ?? ""}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="https://…/image.jpg"
      />
      <Input
        value={d.caption ?? ""}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Optional caption"
      />
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload image
        </Button>
      </div>
      {d.url && (
        <img
          src={d.url}
          alt={d.caption || ""}
          className="mt-2 max-h-60 rounded-xl border border-border object-cover"
        />
      )}
    </div>
  );
}


// ============================================================
// Static (Model2D) chart editor
// ============================================================

const STATIC_KINDS: { kind: StaticKind; label: string; Icon: typeof BarChart3 }[] = [
  { kind: "table", label: "Table", Icon: TableIcon },
  { kind: "bar", label: "Bar graph", Icon: BarChart3 },
  { kind: "pie", label: "Pie graph", Icon: PieIcon },
  { kind: "line", label: "Line graph", Icon: LineIcon },
  { kind: "lineplot", label: "Line plot", Icon: LineIcon },
  { kind: "stemleaf", label: "Stem & leaf", Icon: TableIcon },
  { kind: "coord", label: "Coordinate plane", Icon: Grid3x3 },
  { kind: "image", label: "Upload image", Icon: ImageIcon },
];

function defaultStaticSpec(kind: StaticKind): StaticSpec {
  switch (kind) {
    case "image":
      return { kind: "image", url: "", caption: "" };
    case "table":
      return { kind: "table", headers: ["Name", "Value"], rows: [["A", "10"], ["B", "20"]], caption: "" };
    case "bar":
      return { kind: "bar", title: "Bar graph", unit: "", max: 10, categories: [{ label: "A", value: 4 }, { label: "B", value: 7 }] };
    case "pie":
      return { kind: "pie", title: "Pie graph", slices: [{ label: "A", value: 40 }, { label: "B", value: 30 }, { label: "C", value: 30 }] };
    case "line":
      return { kind: "line", title: "Line graph", xLabel: "x", yLabel: "y", points: [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }] };
    case "lineplot":
      return { kind: "lineplot", title: "Line plot", min: 0, max: 10, values: [2, 3, 3, 4, 5, 5, 5, 6] };
    case "stemleaf":
      return { kind: "stemleaf", title: "Stem & leaf", values: [12, 15, 18, 21, 24, 27, 33, 35] };
    case "coord":
      return { kind: "coord", title: "Coordinate plane", xMin: -5, xMax: 5, yMin: -5, yMax: 5, shapes: [] };
  }
}

function Model2DBlockEditor({
  d,
  onChange,
}: {
  d: Record<string, any>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const spec: StaticSpec = (d.spec as StaticSpec) ?? defaultStaticSpec("bar");
  const setSpec = (next: StaticSpec) => onChange({ spec: next });
  const changeKind = (k: StaticKind) => setSpec(defaultStaticSpec(k));

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div>
        <Label className="text-xs">Chart type</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATIC_KINDS.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => changeKind(kind)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
                spec.kind === kind
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <StaticSpecEditor spec={spec} onChange={setSpec} />

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</div>
        <StaticChart spec={spec} />
      </div>

      <Input
        value={d.caption ?? ""}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function StaticSpecEditor({ spec, onChange }: { spec: StaticSpec; onChange: (s: StaticSpec) => void }) {
  switch (spec.kind) {
    case "image":
      return <StaticImageEditor spec={spec} onChange={onChange} />;
    case "table":
      return <StaticTableEditor spec={spec} onChange={onChange} />;
    case "bar":
      return <StaticBarEditor spec={spec} onChange={onChange} />;
    case "pie":
      return <StaticPieEditor spec={spec} onChange={onChange} />;
    case "line":
      return <StaticLineEditor spec={spec} onChange={onChange} />;
    case "lineplot":
      return <StaticLineplotEditor spec={spec} onChange={onChange} />;
    case "stemleaf":
      return <StaticStemLeafEditor spec={spec} onChange={onChange} />;
    case "coord":
      return <StaticCoordEditor spec={spec} onChange={onChange} />;
  }
}

function TitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Title" className="font-semibold" />;
}

function StaticImageEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "image" }>; onChange: (s: StaticSpec) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const upload = (f: File) => {
    if (f.size > 4 * 1024 * 1024) return toast.error("Image must be under 4MB");
    const r = new FileReader();
    r.onload = () => onChange({ ...spec, url: String(r.result) });
    r.readAsDataURL(f);
  };
  return (
    <div className="space-y-2">
      <Input value={spec.url} onChange={(e) => onChange({ ...spec, url: e.target.value })} placeholder="Image URL or upload" />
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4" /> Upload
      </Button>
    </div>
  );
}

function StaticTableEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "table" }>; onChange: (s: StaticSpec) => void }) {
  const setHeader = (i: number, v: string) => onChange({ ...spec, headers: spec.headers.map((h, k) => k === i ? v : h) });
  const setCell = (r: number, c: number, v: string) => onChange({ ...spec, rows: spec.rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row) });
  const addRow = () => onChange({ ...spec, rows: [...spec.rows, spec.headers.map(() => "")] });
  const addCol = () => onChange({ ...spec, headers: [...spec.headers, `Col ${spec.headers.length + 1}`], rows: spec.rows.map((r) => [...r, ""]) });
  const removeRow = (r: number) => onChange({ ...spec, rows: spec.rows.filter((_, k) => k !== r) });
  const removeCol = (c: number) => onChange({ ...spec, headers: spec.headers.filter((_, k) => k !== c), rows: spec.rows.map((r) => r.filter((_, k) => k !== c)) });
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent/40">
            <tr>
              {spec.headers.map((h, i) => (
                <th key={i} className="p-1">
                  <div className="flex items-center gap-1">
                    <Input value={h} onChange={(e) => setHeader(i, e.target.value)} className="h-8" />
                    <Button variant="ghost" size="icon" onClick={() => removeCol(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, r) => (
              <tr key={r}>
                {spec.headers.map((_, c) => (
                  <td key={c} className="p-1">
                    <Input value={row[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} className="h-8" />
                  </td>
                ))}
                <td><Button variant="ghost" size="icon" onClick={() => removeRow(r)}><Trash2 className="h-3 w-3" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Row</Button>
        <Button variant="outline" size="sm" onClick={addCol}><Plus className="h-4 w-4" /> Column</Button>
      </div>
    </div>
  );
}

function StaticBarEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "bar" }>; onChange: (s: StaticSpec) => void }) {
  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Max</Label><Input type="number" value={spec.max ?? 10} onChange={(e) => onChange({ ...spec, max: Number(e.target.value) })} /></div>
        <div><Label className="text-xs">Unit</Label><Input value={spec.unit ?? ""} onChange={(e) => onChange({ ...spec, unit: e.target.value })} /></div>
      </div>
      {spec.categories.map((c, i) => (
        <div key={i} className="flex gap-2">
          <Input value={c.label} onChange={(e) => onChange({ ...spec, categories: spec.categories.map((x, k) => k === i ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
          <Input type="number" value={c.value} onChange={(e) => onChange({ ...spec, categories: spec.categories.map((x, k) => k === i ? { ...x, value: Number(e.target.value) } : x) })} className="w-28" />
          <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, categories: spec.categories.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, categories: [...spec.categories, { label: "New", value: 0 }] })}><Plus className="h-4 w-4" /> Bar</Button>
    </div>
  );
}

function StaticPieEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "pie" }>; onChange: (s: StaticSpec) => void }) {
  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      {spec.slices.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input value={s.label} onChange={(e) => onChange({ ...spec, slices: spec.slices.map((x, k) => k === i ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
          <Input type="number" value={s.value} onChange={(e) => onChange({ ...spec, slices: spec.slices.map((x, k) => k === i ? { ...x, value: Number(e.target.value) } : x) })} className="w-24" placeholder="%" />
          <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, slices: spec.slices.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, slices: [...spec.slices, { label: "New", value: 10 }] })}><Plus className="h-4 w-4" /> Slice</Button>
    </div>
  );
}

function StaticLineEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "line" }>; onChange: (s: StaticSpec) => void }) {
  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={spec.xLabel ?? ""} onChange={(e) => onChange({ ...spec, xLabel: e.target.value })} placeholder="X axis label" />
        <Input value={spec.yLabel ?? ""} onChange={(e) => onChange({ ...spec, yLabel: e.target.value })} placeholder="Y axis label" />
      </div>
      {spec.points.map((p, i) => (
        <div key={i} className="flex gap-2">
          <Input type="number" value={p.x} onChange={(e) => onChange({ ...spec, points: spec.points.map((x, k) => k === i ? { ...x, x: Number(e.target.value) } : x) })} placeholder="x" />
          <Input type="number" value={p.y} onChange={(e) => onChange({ ...spec, points: spec.points.map((x, k) => k === i ? { ...x, y: Number(e.target.value) } : x) })} placeholder="y" />
          <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, points: spec.points.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, points: [...spec.points, { x: 0, y: 0 }] })}><Plus className="h-4 w-4" /> Point</Button>
    </div>
  );
}

function StaticLineplotEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "lineplot" }>; onChange: (s: StaticSpec) => void }) {
  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Min</Label><Input type="number" value={spec.min} onChange={(e) => onChange({ ...spec, min: Number(e.target.value) })} /></div>
        <div><Label className="text-xs">Max</Label><Input type="number" value={spec.max} onChange={(e) => onChange({ ...spec, max: Number(e.target.value) })} /></div>
      </div>
      <Label className="text-xs">Values (comma separated)</Label>
      <Input
        value={spec.values.join(", ")}
        onChange={(e) => onChange({ ...spec, values: e.target.value.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n)) })}
      />
    </div>
  );
}

function StaticStemLeafEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "stemleaf" }>; onChange: (s: StaticSpec) => void }) {
  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      <Label className="text-xs">Values (comma separated)</Label>
      <Input
        value={spec.values.join(", ")}
        onChange={(e) => onChange({ ...spec, values: e.target.value.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n)) })}
      />
    </div>
  );
}

function StaticCoordEditor({ spec, onChange }: { spec: Extract<StaticSpec, { kind: "coord" }>; onChange: (s: StaticSpec) => void }) {
  const [tool, setTool] = useState<ToolKind>("point");
  const [scratch, setScratch] = useState<Array<{ x: number; y: number }>>([]);

  const addShape = (s: DrawShape) => onChange({ ...spec, shapes: [...spec.shapes, s] });

  const onClick = (x: number, y: number) => {
    const need: Record<ToolKind, number> = { point: 1, line: 2, parabola: 2, circle: 2, ellipse: 3, hyperbola: 3 };
    const n = [...scratch, { x, y }];
    if (n.length < need[tool]) { setScratch(n); return; }
    setScratch([]);
    switch (tool) {
      case "point": addShape({ type: "point", x, y }); break;
      case "line": addShape({ type: "line", x1: n[0].x, y1: n[0].y, x2: n[1].x, y2: n[1].y }); break;
      case "parabola": addShape({ type: "parabola", hx: n[0].x, hy: n[0].y, px: n[1].x, py: n[1].y }); break;
      case "circle": addShape({ type: "circle", cx: n[0].x, cy: n[0].y, rx: n[1].x, ry: n[1].y }); break;
      case "ellipse": addShape({ type: "ellipse", cx: n[0].x, cy: n[0].y, ax: n[1].x, ay: n[1].y, bx: n[2].x, by: n[2].y }); break;
      case "hyperbola": addShape({ type: "hyperbola", cx: n[0].x, cy: n[0].y, ax: n[1].x, ay: n[1].y, bx: n[2].x, by: n[2].y }); break;
    }
  };

  return (
    <div className="space-y-2">
      <TitleField value={spec.title} onChange={(v) => onChange({ ...spec, title: v })} />
      <div className="grid grid-cols-4 gap-2">
        {(["xMin", "xMax", "yMin", "yMax"] as const).map((k) => (
          <div key={k}><Label className="text-xs">{k}</Label><Input type="number" value={spec[k]} onChange={(e) => onChange({ ...spec, [k]: Number(e.target.value) })} /></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["point", "line", "parabola", "circle", "ellipse", "hyperbola"] as ToolKind[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTool(t); setScratch([]); }}
            className={cn("rounded-md border px-2 py-1 text-xs capitalize", tool === t ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >
            {t}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => { onChange({ ...spec, shapes: [] }); setScratch([]); }}><Trash2 className="h-4 w-4" /> Clear</Button>
      </div>
      <p className="text-xs text-muted-foreground">Click on the grid to add {tool} ({scratch.length}/{({ point: 1, line: 2, parabola: 2, circle: 2, ellipse: 3, hyperbola: 3 } as Record<ToolKind, number>)[tool]} points).</p>
      <CoordinateGrid xMin={spec.xMin} xMax={spec.xMax} yMin={spec.yMin} yMax={spec.yMax} shapes={spec.shapes} onClick={onClick} />
    </div>
  );
}

// ============================================================
// Interactive editor
// ============================================================

const INTERACTIVE_KINDS: { kind: InteractiveSpec["kind"]; label: string; Icon: typeof BarChart3 }[] = [
  { kind: "bar", label: "Drag bars", Icon: BarChart3 },
  { kind: "pie", label: "Drag pie sectors", Icon: PieIcon },
  { kind: "line", label: "Plot line graph", Icon: LineIcon },
  { kind: "lineplot", label: "Plot line plot", Icon: LineIcon },
  { kind: "coord", label: "Coordinate plane", Icon: Grid3x3 },
  { kind: "fill-image", label: "Fill image labels", Icon: MapPin },
  { kind: "table", label: "Fill table cells", Icon: TableIcon },
];

function makeTableCells(rows: number, cols: number, prev?: { value: string; blank: boolean; answer?: string }[][]) {
  const out: { value: string; blank: boolean; answer?: string }[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: { value: string; blank: boolean; answer?: string }[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(prev?.[r]?.[c] ?? { value: "", blank: false });
    }
    out.push(row);
  }
  return out;
}

function defaultInteractiveSpec(kind: InteractiveSpec["kind"]): InteractiveSpec {
  switch (kind) {
    case "bar":
      return { kind: "bar", title: "Match the bars", instructions: "Drag bars to targets.", max: 10, tolerance: 0.5, unit: "", categories: [{ label: "A", target: 4 }, { label: "B", target: 7 }] };
    case "pie":
      return { kind: "pie", title: "Adjust sectors", instructions: "Drag sector boundaries to match targets.", tolerance: 3, slices: [{ label: "A", target: 30 }, { label: "B", target: 45 }, { label: "C", target: 25 }] };
    case "line":
      return { kind: "line", title: "Plot the line", instructions: "Click to plot the required points.", xMin: 0, xMax: 10, yMin: 0, yMax: 10, tolerance: 0.5, targets: [{ x: 1, y: 2 }, { x: 3, y: 6 }, { x: 5, y: 8 }] };
    case "lineplot":
      return { kind: "lineplot", title: "Plot the values", instructions: "Click each value on the number line.", min: 0, max: 10, targets: [3, 5, 5, 7] };
    case "coord":
      return { kind: "coord", title: "Draw the shape", instructions: "Use the tools to draw.", xMin: -5, xMax: 5, yMin: -5, yMax: 5, tools: ["point", "line"], minShapes: 1 };
    case "fill-image":
      return { kind: "fill-image", title: "Label the diagram", instructions: "Fill in every label.", imageUrl: "", pins: [] };
    case "table":
      return {
        kind: "table",
        title: "Complete the table",
        instructions: "Fill in every highlighted cell.",
        rows: 3,
        cols: 3,
        cells: makeTableCells(3, 3, [
          [{ value: "x", blank: false }, { value: "1", blank: false }, { value: "2", blank: false }],
          [{ value: "y", blank: false }, { value: "", blank: true, answer: "2" }, { value: "", blank: true, answer: "4" }],
          [{ value: "y = 2x", blank: false }, { value: "", blank: false }, { value: "", blank: false }],
        ]),
      };
  }
}

function InteractiveBlockEditor({
  d,
  onChange,
}: {
  d: Record<string, any>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const spec: InteractiveSpec = (d.spec as InteractiveSpec) ?? defaultInteractiveSpec("bar");
  const setSpec = (s: InteractiveSpec) => onChange({ spec: s });

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div>
        <Label className="text-xs">Interactive type</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INTERACTIVE_KINDS.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => setSpec(defaultInteractiveSpec(kind))}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition",
                spec.kind === kind ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <TitleField value={spec.title} onChange={(v) => setSpec({ ...spec, title: v } as InteractiveSpec)} />
      <Textarea rows={2} value={spec.instructions} onChange={(e) => setSpec({ ...spec, instructions: e.target.value } as InteractiveSpec)} placeholder="Instructions to students" />

      <InteractiveSpecEditor spec={spec} onChange={setSpec} />

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-accent/30 p-3">
        <div className="text-sm">Required to proceed</div>
        <Switch checked={d.required !== false} onCheckedChange={(v) => onChange({ required: v })} />
      </div>
    </div>
  );
}

function InteractiveSpecEditor({ spec, onChange }: { spec: InteractiveSpec; onChange: (s: InteractiveSpec) => void }) {
  switch (spec.kind) {
    case "bar":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Max</Label><Input type="number" value={spec.max} onChange={(e) => onChange({ ...spec, max: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Unit</Label><Input value={spec.unit ?? ""} onChange={(e) => onChange({ ...spec, unit: e.target.value })} /></div>
            <div><Label className="text-xs">Tolerance ±</Label><Input type="number" value={spec.tolerance} onChange={(e) => onChange({ ...spec, tolerance: Number(e.target.value) })} /></div>
          </div>
          {spec.categories.map((c, i) => (
            <div key={i} className="flex gap-2">
              <Input value={c.label} onChange={(e) => onChange({ ...spec, categories: spec.categories.map((x, k) => k === i ? { ...x, label: e.target.value } : x) })} />
              <Input type="number" value={c.target} onChange={(e) => onChange({ ...spec, categories: spec.categories.map((x, k) => k === i ? { ...x, target: Number(e.target.value) } : x) })} className="w-24" />
              <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, categories: spec.categories.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, categories: [...spec.categories, { label: "New", target: 0 }] })}><Plus className="h-4 w-4" /> Bar</Button>
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="mb-1 text-xs text-muted-foreground">Target preview</div>
            <InteractiveBarPreview categories={spec.categories} max={spec.max} unit={spec.unit} />
          </div>
        </div>
      );
    case "pie":
      return (
        <div className="space-y-2">
          <div><Label className="text-xs">Tolerance ± (percent)</Label><Input type="number" value={spec.tolerance} onChange={(e) => onChange({ ...spec, tolerance: Number(e.target.value) })} /></div>
          {spec.slices.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input value={s.label} onChange={(e) => onChange({ ...spec, slices: spec.slices.map((x, k) => k === i ? { ...x, label: e.target.value } : x) })} />
              <Input type="number" value={s.target} onChange={(e) => onChange({ ...spec, slices: spec.slices.map((x, k) => k === i ? { ...x, target: Number(e.target.value) } : x) })} className="w-24" placeholder="%" />
              <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, slices: spec.slices.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, slices: [...spec.slices, { label: "New", target: 10 }] })}><Plus className="h-4 w-4" /> Slice</Button>
          <p className="text-xs text-muted-foreground">Percents should total 100.</p>
          <div className="rounded-lg border border-border bg-background p-3">
            <InteractivePieVisual values={spec.slices.map((s) => s.target)} labels={spec.slices.map((s) => s.label)} />
          </div>
        </div>
      );
    case "line":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {(["xMin", "xMax", "yMin", "yMax"] as const).map((k) => (
              <div key={k}><Label className="text-xs">{k}</Label><Input type="number" value={spec[k]} onChange={(e) => onChange({ ...spec, [k]: Number(e.target.value) })} /></div>
            ))}
            <div><Label className="text-xs">Tolerance</Label><Input type="number" value={spec.tolerance} onChange={(e) => onChange({ ...spec, tolerance: Number(e.target.value) })} /></div>
          </div>
          <Label className="text-xs">Target points students must plot</Label>
          {spec.targets.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input type="number" value={p.x} onChange={(e) => onChange({ ...spec, targets: spec.targets.map((x, k) => k === i ? { ...x, x: Number(e.target.value) } : x) })} placeholder="x" />
              <Input type="number" value={p.y} onChange={(e) => onChange({ ...spec, targets: spec.targets.map((x, k) => k === i ? { ...x, y: Number(e.target.value) } : x) })} placeholder="y" />
              <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, targets: spec.targets.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...spec, targets: [...spec.targets, { x: 0, y: 0 }] })}><Plus className="h-4 w-4" /> Point</Button>
        </div>
      );
    case "lineplot":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min</Label><Input type="number" value={spec.min} onChange={(e) => onChange({ ...spec, min: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Max</Label><Input type="number" value={spec.max} onChange={(e) => onChange({ ...spec, max: Number(e.target.value) })} /></div>
          </div>
          <Label className="text-xs">Target values (comma separated)</Label>
          <Input
            value={spec.targets.join(", ")}
            onChange={(e) => onChange({ ...spec, targets: e.target.value.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n)) })}
          />
        </div>
      );
    case "coord":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {(["xMin", "xMax", "yMin", "yMax"] as const).map((k) => (
              <div key={k}><Label className="text-xs">{k}</Label><Input type="number" value={spec[k]} onChange={(e) => onChange({ ...spec, [k]: Number(e.target.value) })} /></div>
            ))}
          </div>
          <Label className="text-xs">Tools students can use</Label>
          <div className="flex flex-wrap gap-2">
            {(["point", "line", "parabola", "circle", "ellipse", "hyperbola"] as ToolKind[]).map((t) => {
              const on = spec.tools.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange({ ...spec, tools: on ? spec.tools.filter((x) => x !== t) : [...spec.tools, t] })}
                  className={cn("rounded-md border px-2 py-1 text-xs capitalize", on ? "border-primary bg-primary/10 text-primary" : "border-border")}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div><Label className="text-xs">Minimum shapes required</Label><Input type="number" value={spec.minShapes} onChange={(e) => onChange({ ...spec, minShapes: Number(e.target.value) })} /></div>
        </div>
      );
    case "fill-image":
      return <FillImageEditor spec={spec} onChange={onChange} />;
    case "table":
      return <TableInteractiveEditor spec={spec} onChange={onChange} />;
  }
}

function TableInteractiveEditor({
  spec,
  onChange,
}: {
  spec: Extract<InteractiveSpec, { kind: "table" }>;
  onChange: (s: InteractiveSpec) => void;
}) {
  const setSize = (rows: number, cols: number) => {
    const R = Math.max(1, Math.min(20, rows));
    const C = Math.max(1, Math.min(12, cols));
    onChange({ ...spec, rows: R, cols: C, cells: makeTableCells(R, C, spec.cells) });
  };
  const updateCell = (r: number, c: number, patch: Partial<{ value: string; blank: boolean; answer: string }>) => {
    const cells = spec.cells.map((row) => row.map((c) => ({ ...c })));
    cells[r][c] = { ...cells[r][c], ...patch };
    onChange({ ...spec, cells });
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Rows</Label>
          <Input type="number" min={1} max={20} value={spec.rows} onChange={(e) => setSize(Number(e.target.value), spec.cols)} />
        </div>
        <div>
          <Label className="text-xs">Columns</Label>
          <Input type="number" min={1} max={12} value={spec.cols} onChange={(e) => setSize(spec.rows, Number(e.target.value))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Click <strong>Blank</strong> on any cell to mark it as one students must fill.
        Cells shown in blue = student input. Optionally set an expected answer per blank cell.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {Array.from({ length: spec.rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: spec.cols }, (_, c) => {
                  const cell = spec.cells[r]?.[c] ?? { value: "", blank: false };
                  return (
                    <td key={c} className={cn("border border-border p-1 align-top", cell.blank ? "bg-primary/10" : "bg-background")}>
                      <div className="space-y-1">
                        <Input
                          value={cell.value}
                          onChange={(e) => updateCell(r, c, { value: e.target.value })}
                          placeholder={cell.blank ? "(hidden from student)" : "Cell text"}
                          className="h-8"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCell(r, c, { blank: !cell.blank })}
                            className={cn("rounded border px-1.5 py-0.5 text-[10px]", cell.blank ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                          >
                            {cell.blank ? "Blank ✓" : "Blank"}
                          </button>
                          {cell.blank && (
                            <Input
                              value={cell.answer ?? ""}
                              onChange={(e) => updateCell(r, c, { answer: e.target.value })}
                              placeholder="Answer (optional)"
                              className="h-7 text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FillImageEditor({
  spec,
  onChange,
}: {
  spec: Extract<InteractiveSpec, { kind: "fill-image" }>;
  onChange: (s: InteractiveSpec) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const upload = (f: File) => {
    if (f.size > 4 * 1024 * 1024) return toast.error("Image must be under 4MB");
    const r = new FileReader();
    r.onload = () => onChange({ ...spec, imageUrl: String(r.result) });
    r.readAsDataURL(f);
  };
  const addPin = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ ...spec, pins: [...spec.pins, { id: newId(), x, y, answer: "" }] });
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={spec.imageUrl} onChange={(e) => onChange({ ...spec, imageUrl: e.target.value })} placeholder="Image URL" />
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        <Button variant="outline" size="sm" onClick={() => ref.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
      </div>
      {spec.imageUrl && (
        <div className="relative inline-block cursor-crosshair overflow-hidden rounded-xl border border-border" onClick={addPin}>
          <img src={spec.imageUrl} alt="" className="max-h-96 w-auto" />
          {spec.pins.map((p, i) => (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {i + 1}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Click on the image to place a label pin. Enter the expected answer for each pin below (leave blank to accept any non-empty answer).</p>
      {spec.pins.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="w-6 text-center text-xs font-bold text-primary">{i + 1}</span>
          <Input value={p.answer ?? ""} onChange={(e) => onChange({ ...spec, pins: spec.pins.map((x) => x.id === p.id ? { ...x, answer: e.target.value } : x) })} placeholder="Expected label (optional)" />
          <Input value={p.hint ?? ""} onChange={(e) => onChange({ ...spec, pins: spec.pins.map((x) => x.id === p.id ? { ...x, hint: e.target.value } : x) })} placeholder="Hint (optional)" />
          <Button variant="ghost" size="icon" onClick={() => onChange({ ...spec, pins: spec.pins.filter((x) => x.id !== p.id) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
// _unused kept to silence lint for imported icons intentionally reserved
void SLICE_COLORS;

