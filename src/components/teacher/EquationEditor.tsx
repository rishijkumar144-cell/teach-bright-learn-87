import { useEffect, useRef, useState } from "react";
import { Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MathPreview } from "./MathPreview";

interface Template {
  label: string;
  latex: string;
  // Selection offset & length inside `latex` for placing cursor / selecting placeholder
  selStart?: number;
  selEnd?: number;
}

const GROUPS: { title: string; items: Template[] }[] = [
  {
    title: "Basic",
    items: [
      { label: "a/b", latex: "\\frac{a}{b}", selStart: 6, selEnd: 7 },
      { label: "x²", latex: "x^{2}", selStart: 3, selEnd: 4 },
      { label: "xⁿ", latex: "x^{n}", selStart: 3, selEnd: 4 },
      { label: "xₙ", latex: "x_{n}", selStart: 3, selEnd: 4 },
      { label: "√x", latex: "\\sqrt{x}", selStart: 6, selEnd: 7 },
      { label: "ⁿ√x", latex: "\\sqrt[n]{x}", selStart: 9, selEnd: 10 },
      { label: "|x|", latex: "|x|", selStart: 1, selEnd: 2 },
      { label: "(  )", latex: "\\left( x \\right)", selStart: 7, selEnd: 8 },
    ],
  },
  {
    title: "Operators",
    items: [
      { label: "×", latex: "\\times " },
      { label: "÷", latex: "\\div " },
      { label: "±", latex: "\\pm " },
      { label: "·", latex: "\\cdot " },
      { label: "≤", latex: "\\le " },
      { label: "≥", latex: "\\ge " },
      { label: "≠", latex: "\\ne " },
      { label: "≈", latex: "\\approx " },
      { label: "→", latex: "\\to " },
      { label: "∞", latex: "\\infty " },
    ],
  },
  {
    title: "Greek",
    items: [
      { label: "π", latex: "\\pi " },
      { label: "θ", latex: "\\theta " },
      { label: "α", latex: "\\alpha " },
      { label: "β", latex: "\\beta " },
      { label: "γ", latex: "\\gamma " },
      { label: "Δ", latex: "\\Delta " },
      { label: "μ", latex: "\\mu " },
      { label: "λ", latex: "\\lambda " },
      { label: "Σ", latex: "\\Sigma " },
      { label: "Ω", latex: "\\Omega " },
    ],
  },
  {
    title: "Calculus & Sums",
    items: [
      { label: "∑", latex: "\\sum_{i=1}^{n} ", selStart: 6, selEnd: 9 },
      { label: "∏", latex: "\\prod_{i=1}^{n} ", selStart: 7, selEnd: 10 },
      { label: "∫", latex: "\\int_{a}^{b} ", selStart: 6, selEnd: 7 },
      { label: "lim", latex: "\\lim_{x \\to \\infty} ", selStart: 6, selEnd: 19 },
      { label: "d/dx", latex: "\\frac{d}{dx}" },
      { label: "∂/∂x", latex: "\\frac{\\partial}{\\partial x}" },
    ],
  },
  {
    title: "Trig",
    items: [
      { label: "sin", latex: "\\sin " },
      { label: "cos", latex: "\\cos " },
      { label: "tan", latex: "\\tan " },
      { label: "log", latex: "\\log " },
      { label: "ln", latex: "\\ln " },
      { label: "eˣ", latex: "e^{x}", selStart: 3, selEnd: 4 },
    ],
  },
];

export function EquationEditor({
  onInsert,
  initial = "",
  trigger,
}: {
  onInsert: (latex: string) => void;
  initial?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setValue(initial || "");
  }, [open, initial]);

  const insertAtCursor = (t: Template) => {
    const ta = ref.current;
    if (!ta) {
      setValue((v) => v + t.latex);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + t.latex + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      if (t.selStart !== undefined && t.selEnd !== undefined) {
        ta.setSelectionRange(start + t.selStart, start + t.selEnd);
      } else {
        const pos = start + t.latex.length;
        ta.setSelectionRange(pos, pos);
      }
    });
  };

  const handleInsert = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setOpen(false);
      return;
    }
    onInsert(trimmed);
    setOpen(false);
    setValue("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="h-8">
            <Sigma className="h-3.5 w-3.5" /> Insert equation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-primary" /> Equation editor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-accent/30 p-4 min-h-[72px] flex items-center justify-center">
            {value.trim() ? (
              <MathPreview equation={value} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Click symbols below or type LaTeX — a live preview appears here.
              </span>
            )}
          </div>

          <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((t) => (
                    <button
                      key={t.label + t.latex}
                      type="button"
                      onClick={() => insertAtCursor(t)}
                      className="min-w-9 rounded-md border border-border bg-card px-2 py-1 text-sm hover:bg-accent"
                      title={t.latex}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              LaTeX source (optional — edit directly)
            </div>
            <Textarea
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={2}
              placeholder="e.g. \\frac{a}{b} + \\sqrt{x}"
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!value.trim()}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
