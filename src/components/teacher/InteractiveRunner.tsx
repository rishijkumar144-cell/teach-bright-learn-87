import { useState } from "react";
import { CheckCircle2, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type {
  DrawShape,
  InteractiveSpec,
  ToolKind,
} from "@/lib/charts";
import { SLICE_COLORS } from "@/lib/charts";
import { CoordinateGrid } from "./Charts";

function interactiveAttempted(spec: InteractiveSpec, value: unknown): boolean {
  switch (spec.kind) {
    case "fill-image": {
      const v = (value as Record<string, string> | undefined) ?? {};
      return spec.pins.every((p) => (v[p.id] ?? "").trim().length > 0);
    }
    case "bar":
    case "pie":
      return Array.isArray(value) && (value as number[]).length > 0;
    case "line":
      return Array.isArray(value) && (value as unknown[]).length > 0;
    case "lineplot":
      return Array.isArray(value) && (value as unknown[]).length > 0;
    case "coord":
      return Array.isArray(value) && (value as unknown[]).length >= Math.max(1, spec.minShapes || 1);
    case "table": {
      const v = (value as Record<string, string> | undefined) ?? {};
      for (let r = 0; r < spec.rows; r++) {
        for (let c = 0; c < spec.cols; c++) {
          const cell = spec.cells[r]?.[c];
          if (!cell || !cell.blank) continue;
          if (!(v[`${r},${c}`] ?? "").trim()) return false;
        }
      }
      return true;
    }
  }
}

export function InteractiveRunner({
  spec,
  value,
  onChange,
  onSubmit,
  submitted,
  isMissing,
}: {
  spec: InteractiveSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  onSubmit: () => void;
  submitted: boolean;
  isMissing?: boolean;
}) {
  const canSubmit = interactiveAttempted(spec, value);
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft transition",
        isMissing ? "border-destructive ring-2 ring-destructive/30" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{spec.title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{spec.instructions}</p>
        </div>
        {submitted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Submitted
          </span>
        )}
      </div>
      <div className="mt-4">
        <InteractiveWidget spec={spec} value={value} onChange={onChange} disabled={submitted} />
      </div>
      {!submitted && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

export function InteractiveWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: InteractiveSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  switch (spec.kind) {
    case "bar":
      return <BarWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "pie":
      return <PieWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "line":
      return <LineWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "lineplot":
      return <LineplotWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "coord":
      return <CoordWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "fill-image":
      return <FillImageWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
    case "table":
      return <TableWidget spec={spec} value={value} onChange={onChange} disabled={disabled} />;
  }
}

function BarWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "bar" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const vals: number[] = Array.isArray(value)
    ? (value as number[])
    : new Array(spec.categories.length).fill(0);
  const tol = spec.tolerance ?? 0;
  return (
    <div>
      <div className="flex h-56 items-end gap-3">
        {spec.categories.map((c, i) => {
          const v = vals[i] ?? 0;
          const heightPct = Math.min(100, (v / Math.max(spec.max, 1)) * 100);
          const matched = Math.abs(v - c.target) <= tol;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="text-xs font-medium">
                {v}
                {spec.unit ?? ""}
              </div>
              <div className="relative h-40 w-full rounded-md bg-accent">
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 rounded-md transition-all",
                    disabled ? (matched ? "bg-emerald-500" : "bg-destructive") : "bg-primary/70",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-3">
        {spec.categories.map((c, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <Slider
              value={[vals[i] ?? 0]}
              min={0}
              max={spec.max}
              step={Math.max(1, Math.round(spec.max / 100))}
              disabled={disabled}
              onValueChange={(nv) => {
                const next = [...vals];
                next[i] = nv[0] ?? 0;
                while (next.length < spec.categories.length) next.push(0);
                onChange(next);
              }}
            />
            <div className="truncate text-[11px]">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "pie" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const equal = Math.round(100 / spec.slices.length);
  const initial: number[] = Array.isArray(value)
    ? (value as number[])
    : spec.slices.map(() => equal);
  const vals = initial.length === spec.slices.length ? initial : spec.slices.map(() => equal);
  const total = vals.reduce((a, b) => a + b, 0) || 1;

  const setSlice = (i: number, v: number) => {
    const next = [...vals];
    next[i] = Math.max(0, Math.min(100, v));
    onChange(next);
  };

  let acc = 0;
  const R = 90;
  const CX = 100;
  const CY = 100;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <svg viewBox="0 0 200 200" className="h-48 w-48">
        {vals.map((v, i) => {
          const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
          acc += Math.max(0, v);
          const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const large = end - start > Math.PI ? 1 : 0;
          const x1 = CX + R * Math.cos(start);
          const y1 = CY + R * Math.sin(start);
          const x2 = CX + R * Math.cos(end);
          const y2 = CY + R * Math.sin(end);
          const d = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
          return <path key={i} d={d} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="var(--background)" strokeWidth={2} />;
        })}
      </svg>
      <div className="flex-1 space-y-2">
        {spec.slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
            <span className="w-24 truncate text-sm">{s.label}</span>
            <Slider
              className="flex-1"
              value={[vals[i] ?? 0]}
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              onValueChange={(nv) => setSlice(i, nv[0] ?? 0)}
            />
            <span className="w-10 text-right text-xs tabular-nums">{vals[i] ?? 0}%</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Slices must total 100% (currently {total}%).</p>
      </div>
    </div>
  );
}

function LineWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "line" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const pts = (value as { x: number; y: number }[] | undefined) ?? [];
  const pointShapes: DrawShape[] = pts.map((p) => ({ type: "point", x: p.x, y: p.y }));
  const targets: DrawShape[] = spec.targets.map((t) => ({ type: "point", x: t.x, y: t.y, label: "•" }));
  // Auto-connect: once the student has plotted at least the required number of
  // points, draw the connecting polyline (sorted by x) so the "line" is visible.
  const connectors: DrawShape[] = [];
  if (pts.length >= spec.targets.length && pts.length >= 2) {
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      connectors.push({
        type: "line",
        x1: sorted[i].x, y1: sorted[i].y,
        x2: sorted[i + 1].x, y2: sorted[i + 1].y,
      });
    }
  }
  return (
    <div>
      <CoordinateGrid
        xMin={spec.xMin}
        xMax={spec.xMax}
        yMin={spec.yMin}
        yMax={spec.yMax}
        shapes={disabled ? [...targets, ...connectors, ...pointShapes] : [...connectors, ...pointShapes]}
        onClick={disabled ? undefined : (x, y) => onChange([...pts, { x, y }])}
      />
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Plotted: {pts.length} / needed {spec.targets.length}{pts.length >= spec.targets.length && pts.length >= 2 ? " — line drawn" : ""}</span>
        <Button size="sm" variant="ghost" disabled={disabled || pts.length === 0} onClick={() => onChange([])}>
          <Trash2 className="h-3 w-3" /> Clear
        </Button>
      </div>
    </div>
  );
}

function LineplotWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "lineplot" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const vals = (value as number[] | undefined) ?? [];
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const ticks: number[] = [];
  for (let i = spec.min; i <= spec.max; i++) ticks.push(i);

  const W = 360;
  const H = 160;
  const PAD = 24;
  const step = (W - PAD * 2) / Math.max(1, spec.max - spec.min);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full rounded-xl border border-border bg-background", !disabled && "cursor-crosshair")}
        onClick={(e) => {
          if (disabled) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const x = spec.min + Math.round((px - PAD) / step);
          if (x < spec.min || x > spec.max) return;
          onChange([...vals, x]);
        }}
      >
        <line x1={PAD} y1={H - 40} x2={W - PAD} y2={H - 40} stroke="currentColor" strokeWidth={1.5} className="text-muted-foreground" />
        {ticks.map((t) => {
          const x = PAD + (t - spec.min) * step;
          const c = counts.get(t) ?? 0;
          return (
            <g key={t}>
              <line x1={x} y1={H - 40} x2={x} y2={H - 34} stroke="currentColor" className="text-muted-foreground" />
              <text x={x} y={H - 20} textAnchor="middle" className="fill-current text-[10px] text-muted-foreground">{t}</text>
              {Array.from({ length: c }, (_, k) => (
                <text key={k} x={x} y={H - 46 - k * 12} textAnchor="middle" className="fill-[var(--primary)] text-[14px] font-bold">×</text>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Placed: {vals.length}</span>
        <Button size="sm" variant="ghost" disabled={disabled || vals.length === 0} onClick={() => onChange([])}>
          <Trash2 className="h-3 w-3" /> Clear
        </Button>
      </div>
    </div>
  );
}

function CoordWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "coord" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const shapes = (value as DrawShape[] | undefined) ?? [];
  const availableTools = spec.tools.length ? spec.tools : (["point", "line"] as ToolKind[]);
  const [tool, setTool] = useState<ToolKind>(availableTools[0]);
  const [scratch, setScratch] = useState<Array<{ x: number; y: number }>>([]);
  const [shadeAbove, setShadeAbove] = useState(true);
  const [shadeStrict, setShadeStrict] = useState(false);
  const need: Record<ToolKind, number> = { point: 1, line: 2, parabola: 2, circle: 2, ellipse: 3, hyperbola: 3, halfplane: 2 };

  const onClick = (x: number, y: number) => {
    if (disabled) return;
    const n = [...scratch, { x, y }];
    if (n.length < need[tool]) { setScratch(n); return; }
    setScratch([]);
    let shape: DrawShape;
    switch (tool) {
      case "point": shape = { type: "point", x, y }; break;
      case "line": shape = { type: "line", x1: n[0].x, y1: n[0].y, x2: n[1].x, y2: n[1].y }; break;
      case "parabola": shape = { type: "parabola", hx: n[0].x, hy: n[0].y, px: n[1].x, py: n[1].y }; break;
      case "circle": shape = { type: "circle", cx: n[0].x, cy: n[0].y, rx: n[1].x, ry: n[1].y }; break;
      case "ellipse": shape = { type: "ellipse", cx: n[0].x, cy: n[0].y, ax: n[1].x, ay: n[1].y, bx: n[2].x, by: n[2].y }; break;
      case "hyperbola": shape = { type: "hyperbola", cx: n[0].x, cy: n[0].y, ax: n[1].x, ay: n[1].y, bx: n[2].x, by: n[2].y }; break;
      case "halfplane": shape = { type: "halfplane", x1: n[0].x, y1: n[0].y, x2: n[1].x, y2: n[1].y, above: shadeAbove, strict: shadeStrict }; break;
    }
    onChange([...shapes, shape]);
  };

  const toolHelp: Record<ToolKind, { steps: string[]; tip?: string }> = {
    point: {
      steps: ["Click anywhere on the grid to drop a point."],
    },
    line: {
      steps: [
        "Click any point the line passes through.",
        "Click a second point on the line — the line will extend through both.",
      ],
    },
    parabola: {
      steps: [
        "Click the vertex (the tip of the parabola).",
        "Click any other point on the curve — the parabola opens up or down through it.",
      ],
      tip: "A parabola y = a(x − h)² + k is fully defined by its vertex (h, k) and one more point.",
    },
    circle: {
      steps: [
        "Click the center of the circle.",
        "Click any point on the edge — the distance to the center becomes the radius.",
      ],
      tip: "All points on a circle are the same distance (radius) from the center.",
    },
    ellipse: {
      steps: [
        "Click the center of the ellipse.",
        "Click one end of the horizontal (major) axis — this sets the horizontal radius a.",
        "Click one end of the vertical (minor) axis — this sets the vertical radius b.",
      ],
      tip: "An ellipse x²/a² + y²/b² = 1 needs a center and both radii. Click a point that is directly right/left of the center for the second click, and directly above/below for the third.",
    },
    hyperbola: {
      steps: [
        "Click the center of the hyperbola.",
        "Click a vertex on the horizontal axis — sets the horizontal distance a.",
        "Click a point on the vertical axis — sets the conjugate distance b.",
      ],
      tip: "A hyperbola x²/a² − y²/b² = 1 opens left/right from its center. The second click controls how wide the opening is; the third controls how steep the asymptotes are.",
    },
    halfplane: {
      steps: [
        "Choose which side to shade (above / below) and whether the line is included.",
        "Click two points to define the boundary line.",
        "The chosen side of the line will fill in as the solution region.",
      ],
      tip: "For y > mx + b or y ≥ mx + b, shade Above with strict (dashed) or inclusive (solid). For y < mx + b use Below. For a vertical line x = c, Above shades the right side.",
    },
  };

  const help = toolHelp[tool];
  const scratchShapes: DrawShape[] = scratch.map((p) => ({ type: "point", x: p.x, y: p.y, label: "·" }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {availableTools.map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => { setTool(t); setScratch([]); }}
            className={cn("rounded-md border px-2 py-1 text-xs capitalize", tool === t ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >
            {t}
          </button>
        ))}
        <Button size="sm" variant="ghost" disabled={disabled || shapes.length === 0} onClick={() => { onChange([]); setScratch([]); }}>
          <Trash2 className="h-3 w-3" /> Clear
        </Button>
      </div>
      {tool === "halfplane" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
          <span className="font-semibold">Shade:</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShadeAbove(true)}
            className={cn("rounded-md border px-2 py-1", shadeAbove ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >Above / right of line</button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShadeAbove(false)}
            className={cn("rounded-md border px-2 py-1", !shadeAbove ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >Below / left of line</button>
          <span className="ml-2 font-semibold">Boundary:</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShadeStrict(false)}
            className={cn("rounded-md border px-2 py-1", !shadeStrict ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >Inclusive (≤ / ≥)</button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShadeStrict(true)}
            className={cn("rounded-md border px-2 py-1", shadeStrict ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >Strict (&lt; / &gt;)</button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-accent/30 p-3 text-xs">
        <div className="mb-1 font-semibold capitalize">How to draw a {tool}</div>
        <ol className="list-decimal space-y-0.5 pl-4">
          {help.steps.map((s, i) => (
            <li key={i} className={cn(scratch.length === i && "font-semibold text-primary")}>{s}</li>
          ))}
        </ol>
        {help.tip && <p className="mt-2 text-muted-foreground">{help.tip}</p>}
        <p className="mt-2 text-muted-foreground">
          Click {scratch.length}/{need[tool]} for this {tool}. The shape appears automatically once you finish. Need at least {spec.minShapes} shape{spec.minShapes === 1 ? "" : "s"} total.
        </p>
      </div>
      <CoordinateGrid
        xMin={spec.xMin}
        xMax={spec.xMax}
        yMin={spec.yMin}
        yMax={spec.yMax}
        shapes={[...shapes, ...scratchShapes]}
        onClick={onClick}
      />
    </div>
  );
}

function TableWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "table" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const answers = (value as Record<string, string> | undefined) ?? {};
  const set = (r: number, c: number, v: string) => onChange({ ...answers, [`${r},${c}`]: v });
  const rows = Math.max(1, spec.rows);
  const cols = Math.max(1, spec.cols);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => {
                const cell = spec.cells[r]?.[c] ?? { value: "", blank: false };
                if (cell.blank) {
                  const key = `${r},${c}`;
                  return (
                    <td key={c} className="border border-border bg-primary/5 p-1 align-top">
                      <Input
                        value={answers[key] ?? ""}
                        onChange={(e) => set(r, c, e.target.value)}
                        disabled={disabled}
                        placeholder="Your answer"
                        className="h-8 border-dashed"
                      />
                    </td>
                  );
                }
                return (
                  <td key={c} className="border border-border bg-accent/30 p-2 align-top text-foreground">
                    {cell.value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FillImageWidget({
  spec,
  value,
  onChange,
  disabled,
}: {
  spec: Extract<InteractiveSpec, { kind: "fill-image" }>;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const answers = (value as Record<string, string> | undefined) ?? {};
  const set = (id: string, v: string) => onChange({ ...answers, [id]: v });
  if (!spec.imageUrl) {
    return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No image configured.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="relative inline-block overflow-hidden rounded-xl border border-border">
        <img src={spec.imageUrl} alt="" className="max-h-96 w-auto" />
        {spec.pins.map((p, i) => {
          const filled = !!(answers[p.id] ?? "").trim();
          return (
            <div
              key={p.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-bold shadow",
                filled ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground",
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        {spec.pins.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            <Input
              value={answers[p.id] ?? ""}
              onChange={(e) => set(p.id, e.target.value)}
              placeholder={p.hint || "Your answer"}
              disabled={disabled}
              className="flex-1"
            />
          </div>
        ))}
        {spec.pins.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> No labels to fill.
          </p>
        )}
      </div>
    </div>
  );
}
