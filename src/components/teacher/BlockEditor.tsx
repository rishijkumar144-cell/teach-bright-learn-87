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
  Info,
  Upload,
  Sigma,
  Sparkles,
  SplitSquareVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import { cn } from "@/lib/utils";
import { MathPreview } from "./MathPreview";
import { generateDiagram, generateInteractive } from "@/lib/ai.functions";

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
  { type: "model2d", label: "2D Diagram (AI)", icon: ImageIcon, group: "interactive", init: () => ({ url: "", caption: "", prompt: "" }) },
  { type: "interactive", label: "Interactive Diagram", icon: Box, group: "interactive", init: () => ({ prompt: "", spec: null, required: true }) },
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
                    <BlockEditor block={b} onChange={(d) => update(b.id, d)} />
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

  const insertEquation = () => {
    const ta = ref.current;
    const snippet = "$a^2 + b^2 = c^2$";
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
      const pos = start + 1;
      ta.setSelectionRange(pos, pos + snippet.length - 2);
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={insertEquation}
          className="h-8"
        >
          <Sigma className="h-3.5 w-3.5" /> Insert equation
        </Button>
        <span className="text-xs text-muted-foreground">
          Wrap LaTeX in <code className="font-mono">$…$</code> for inline math.
        </span>
      </div>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your paragraph… use $x^2$ for inline equations."
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
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const generate = useServerFn(generateDiagram);

  const run = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await generate({ data: { prompt: prompt.trim() } });
      onChange({ url: res.url, caption: d.caption || prompt.trim() });
      toast.success("Diagram generated");
      setAiOpen(false);
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        value={d.url ?? ""}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="https://…/image.jpg — or generate one with AI below"
      />
      <Input
        value={d.caption ?? ""}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Optional caption"
      />
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAiOpen((v) => !v)}
        >
          <Sparkles className="h-4 w-4" /> Generate diagram with AI
        </Button>
      </div>
      {aiOpen && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Label className="text-xs">Describe the diagram you want</Label>
          <Textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A labeled diagram of the water cycle with arrows for evaporation, condensation, and precipitation."
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={run} disabled={busy || !prompt.trim()}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate
                </>
              )}
            </Button>
          </div>
        </div>
      )}
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

function Model2DBlockEditor({
  d,
  onChange,
}: {
  d: Record<string, any>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [prompt, setPrompt] = useState((d.prompt as string) ?? "");
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateDiagram);

  const run = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await generate({ data: { prompt: prompt.trim() } });
      onChange({ url: res.url, prompt: prompt.trim(), caption: d.caption || prompt.trim() });
      toast.success("2D diagram generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> AI Diagram Chatbot
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Describe the 2D diagram you want and AI will draw it. Students see the finished image.
      </p>
      <Textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. A labeled diagram of a plant cell with nucleus, chloroplasts, and cell wall."
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={run} disabled={busy || !prompt.trim()}>
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> {d.url ? "Regenerate" : "Generate"}</>
          )}
        </Button>
        <Input
          value={d.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="Caption (optional)"
          className="flex-1"
        />
      </div>
      {d.url && (
        <img
          src={d.url}
          alt={d.caption || ""}
          className="mt-3 max-h-72 w-full rounded-xl border border-border object-contain bg-background"
        />
      )}
    </div>
  );
}

type BarSpec = {
  kind: "bar-graph";
  title: string;
  instructions: string;
  unit?: string;
  max: number;
  tolerance: number;
  categories: Array<{ label: string; target: number }>;
};

function InteractiveBlockEditor({
  d,
  onChange,
}: {
  d: Record<string, any>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [prompt, setPrompt] = useState((d.prompt as string) ?? "");
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateInteractive);
  const spec = d.spec as BarSpec | null;

  const run = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await generate({ data: { prompt: prompt.trim() } });
      onChange({ spec: res.spec, prompt: prompt.trim() });
      toast.success("Interactive diagram generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  const updateSpec = (patch: Partial<BarSpec>) => {
    if (!spec) return;
    onChange({ spec: { ...spec, ...patch } });
  };
  const updateCategory = (i: number, patch: Partial<{ label: string; target: number }>) => {
    if (!spec) return;
    const cats = spec.categories.map((c, k) => (k === i ? { ...c, ...patch } : c));
    onChange({ spec: { ...spec, categories: cats } });
  };

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> AI Interactive Builder
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Describe an interactive diagram (currently: adjustable bar graphs). Students must adjust
        the bars to match the target values before they can move on.
      </p>
      <Textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Bar graph of average monthly rainfall in Seattle (Jan–Jun), students match the correct heights."
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={run} disabled={busy || !prompt.trim()}>
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Building…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> {spec ? "Regenerate" : "Generate"}</>
          )}
        </Button>
      </div>

      {spec && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3">
          <Input
            value={spec.title}
            onChange={(e) => updateSpec({ title: e.target.value })}
            placeholder="Title"
            className="font-semibold"
          />
          <Textarea
            rows={2}
            value={spec.instructions}
            onChange={(e) => updateSpec({ instructions: e.target.value })}
            placeholder="Instructions to students"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={spec.max}
                onChange={(e) => updateSpec({ max: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Unit</Label>
              <Input
                value={spec.unit ?? ""}
                onChange={(e) => updateSpec({ unit: e.target.value })}
                placeholder="cm"
              />
            </div>
            <div>
              <Label className="text-xs">Tolerance ±</Label>
              <Input
                type="number"
                value={spec.tolerance}
                onChange={(e) => updateSpec({ tolerance: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Bars (label &amp; target value)</Label>
            {spec.categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={c.label}
                  onChange={(e) => updateCategory(i, { label: e.target.value })}
                  placeholder="Label"
                />
                <Input
                  type="number"
                  value={c.target}
                  onChange={(e) => updateCategory(i, { target: Number(e.target.value) })}
                  placeholder="Target"
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateSpec({
                      categories: spec.categories.filter((_, k) => k !== i),
                    } as Partial<BarSpec>)
                  }
                  aria-label="Remove bar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateSpec({
                  categories: [...spec.categories, { label: "New", target: 0 }],
                } as Partial<BarSpec>)
              }
            >
              <Plus className="h-4 w-4" /> Add bar
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-accent/30 p-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview (targets)
            </div>
            <BarGraphPreview spec={spec} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-accent/30 p-3">
        <div>
          <div className="text-sm font-medium">Required to proceed</div>
          <p className="text-xs text-muted-foreground">
            Students must match every bar (within tolerance) before moving to the next page.
          </p>
        </div>
        <Switch
          checked={d.required !== false}
          onCheckedChange={(v) => onChange({ required: v })}
        />
      </div>
    </div>
  );
}

function BarGraphPreview({ spec }: { spec: BarSpec }) {
  const max = Math.max(spec.max, ...spec.categories.map((c) => c.target), 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {spec.categories.map((c, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="text-[10px] text-muted-foreground">
            {c.target}
            {spec.unit ?? ""}
          </div>
          <div
            className="w-full rounded-t bg-primary/70"
            style={{ height: `${(c.target / max) * 100}%` }}
          />
          <div className="truncate text-[10px]">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export type { BarSpec };
