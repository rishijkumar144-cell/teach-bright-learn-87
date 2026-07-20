import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateBlockContent } from "@/lib/ai.functions";

type Kind =
  | "mcq"
  | "truefalse"
  | "short"
  | "numeric"
  | "open"
  | "paragraph"
  | "hint"
  | "solution";

interface Props {
  kind: Kind;
  subject?: string;
  gradeLevel?: string;
  context?: string;
  onGenerated: (result: Record<string, unknown>) => void;
  label?: string;
  size?: "sm" | "default";
}

const LABELS: Record<Kind, string> = {
  mcq: "multiple-choice question",
  truefalse: "true/false question",
  short: "short-answer question",
  numeric: "numeric question",
  open: "open-ended prompt",
  paragraph: "teaching paragraph",
  hint: "hint",
  solution: "solution explanation",
};

export function AiGenerateButton({
  kind,
  subject,
  gradeLevel,
  context,
  onGenerated,
  label,
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateBlockContent);

  async function run() {
    if (!topic.trim()) {
      toast.error("Enter a topic to generate.");
      return;
    }
    setBusy(true);
    try {
      const result = await generate({
        data: { kind, topic: topic.trim(), subject, gradeLevel, context },
      });
      onGenerated(result as Record<string, unknown>);
      toast.success("Generated with AI");
      setOpen(false);
      setTopic("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {label ?? "Generate with AI"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Generate {LABELS[kind]}
          </DialogTitle>
          <DialogDescription>
            Describe the topic. The AI will draft the {LABELS[kind]} — you can edit it after.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Topic</Label>
            <Input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) run();
              }}
              placeholder="e.g. Pythagorean theorem, photosynthesis, causes of WWI"
            />
          </div>
          {(subject || gradeLevel) && (
            <p className="text-xs text-muted-foreground">
              Context: {[subject, gradeLevel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy || !topic.trim()}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
