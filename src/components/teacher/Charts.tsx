import type { DrawShape, GeoAngle, GeoEdge, GeoPoint, StaticSpec } from "@/lib/charts";
import { SLICE_COLORS } from "@/lib/charts";

const CHART_STROKE = "currentColor";

export function StaticChart({ spec }: { spec: StaticSpec }) {
  switch (spec.kind) {
    case "image":
      return spec.url ? (
        <figure className="overflow-hidden rounded-2xl border border-border">
          <div className="relative">
            <img
              src={spec.url}
              alt={spec.caption || ""}
              className="w-full bg-background object-contain"
            />
            {(spec.labels ?? []).map((p) => (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div className="flex items-center gap-1">
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-primary-foreground shadow">
                    •
                  </span>
                  {p.text && (
                    <span className="whitespace-nowrap rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-semibold text-foreground shadow ring-1 ring-border">
                      {p.text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {spec.caption && (
            <figcaption className="p-3 text-sm text-muted-foreground">{spec.caption}</figcaption>
          )}
        </figure>
      ) : (
        <EmptyChart label="No image uploaded" />
      );
    case "table":
      return <TableChart spec={spec} />;
    case "bar":
      return <BarChart spec={spec} />;
    case "pie":
      return <PieChart spec={spec} />;
    case "line":
      return <LineChart spec={spec} />;
    case "lineplot":
      return <LinePlot spec={spec} />;
    case "stemleaf":
      return <StemLeaf spec={spec} />;
    case "coord":
      return <CoordChart spec={spec} />;
    case "numberline":
      return <NumberLineChart spec={spec} />;
    case "grid":
      return <BlankGrid spec={spec} />;
    case "fraction":
      return <FractionChart spec={spec} />;
    case "geometry":
      return <GeometryChart spec={spec} />;
  }
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function ChartFrame({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
      {title && <div className="mb-2 text-sm font-semibold">{title}</div>}
      {children}
    </div>
  );
}

function TableChart({ spec }: { spec: Extract<StaticSpec, { kind: "table" }> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-accent/40">
          <tr>
            {spec.headers.map((h, i) => (
              <th key={i} className="border-b border-border p-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, r) => (
            <tr key={r} className={r % 2 ? "bg-accent/20" : ""}>
              {spec.headers.map((_, c) => (
                <td key={c} className="border-b border-border/60 p-2">
                  {row[c] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {spec.caption && (
        <div className="p-3 text-xs text-muted-foreground">{spec.caption}</div>
      )}
    </div>
  );
}

function BarChart({ spec }: { spec: Extract<StaticSpec, { kind: "bar" }> }) {
  const max = Math.max(
    spec.max ?? 0,
    ...spec.categories.map((c) => c.value),
    1,
  );
  return (
    <ChartFrame title={spec.title}>
      <div className="flex h-48 items-end gap-2">
        {spec.categories.map((c, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="text-[10px] text-muted-foreground">
              {c.value}
              {spec.unit ?? ""}
            </div>
            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${(c.value / max) * 100}%`, minHeight: 2 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {spec.categories.map((c, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px]">
            {c.label}
          </div>
        ))}
      </div>
    </ChartFrame>
  );
}

function PieChart({ spec }: { spec: Extract<StaticSpec, { kind: "pie" }> }) {
  const total = spec.slices.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  let acc = 0;
  const R = 90;
  const CX = 100;
  const CY = 100;
  return (
    <ChartFrame title={spec.title}>
      <div className="flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 200 200" className="h-48 w-48">
          {spec.slices.map((s, i) => {
            const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
            acc += Math.max(0, s.value);
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
        <ul className="space-y-1 text-sm">
          {spec.slices.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">{((s.value / total) * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}

function LineChart({ spec }: { spec: Extract<StaticSpec, { kind: "line" }> }) {
  const pts = spec.points;
  if (pts.length === 0) return <EmptyChart label="No points" />;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys);
  const W = 320;
  const H = 200;
  const PAD = 32;
  const sx = (x: number) => PAD + ((x - xMin) / Math.max(0.001, xMax - xMin)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - yMin) / Math.max(0.001, yMax - yMin)) * (H - PAD * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join(" ");
  return (
    <ChartFrame title={spec.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-muted-foreground">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={CHART_STROKE} />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={CHART_STROKE} />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill="var(--primary)" />
        ))}
        {spec.xLabel && (
          <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-current text-[10px]">
            {spec.xLabel}
          </text>
        )}
        {spec.yLabel && (
          <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`} className="fill-current text-[10px]">
            {spec.yLabel}
          </text>
        )}
      </svg>
    </ChartFrame>
  );
}

function LinePlot({ spec }: { spec: Extract<StaticSpec, { kind: "lineplot" }> }) {
  const counts = new Map<number, number>();
  for (const v of spec.values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const min = spec.min;
  const max = spec.max;
  const W = 360;
  const H = 160;
  const PAD = 24;
  const step = (W - PAD * 2) / Math.max(1, max - min);
  const ticks: number[] = [];
  for (let i = min; i <= max; i++) ticks.push(i);
  return (
    <ChartFrame title={spec.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-muted-foreground">
        <line x1={PAD} y1={H - 40} x2={W - PAD} y2={H - 40} stroke={CHART_STROKE} strokeWidth={1.5} />
        {ticks.map((t) => {
          const x = PAD + (t - min) * step;
          const c = counts.get(t) ?? 0;
          return (
            <g key={t}>
              <line x1={x} y1={H - 40} x2={x} y2={H - 34} stroke={CHART_STROKE} />
              <text x={x} y={H - 20} textAnchor="middle" className="fill-current text-[10px]">
                {t}
              </text>
              {Array.from({ length: c }, (_, k) => (
                <text key={k} x={x} y={H - 46 - k * 12} textAnchor="middle" className="fill-[var(--primary)] text-[14px] font-bold">
                  ×
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}

function StemLeaf({ spec }: { spec: Extract<StaticSpec, { kind: "stemleaf" }> }) {
  const groups = new Map<number, number[]>();
  for (const v of spec.values.slice().sort((a, b) => a - b)) {
    const stem = Math.floor(v / 10);
    const leaf = Math.abs(v) % 10;
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem)!.push(leaf);
  }
  const stems = Array.from(groups.keys()).sort((a, b) => a - b);
  return (
    <ChartFrame title={spec.title}>
      <div className="rounded-lg border border-border">
        <div className="grid grid-cols-[80px_1fr] bg-accent/40 text-xs font-semibold">
          <div className="border-r border-border p-2">Stem</div>
          <div className="p-2">Leaf</div>
        </div>
        {stems.map((s) => (
          <div key={s} className="grid grid-cols-[80px_1fr] border-t border-border/70 text-sm font-mono">
            <div className="border-r border-border p-2 font-semibold">{s}</div>
            <div className="p-2">{(groups.get(s) ?? []).join(" ")}</div>
          </div>
        ))}
        {stems.length === 0 && (
          <div className="p-3 text-sm text-muted-foreground">No data.</div>
        )}
      </div>
    </ChartFrame>
  );
}

export function CoordinateGrid({
  xMin,
  xMax,
  yMin,
  yMax,
  shapes,
  onClick,
  overlay,
  height = 320,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  shapes: DrawShape[];
  onClick?: (x: number, y: number) => void;
  overlay?: React.ReactNode;
  height?: number;
}) {
  const W = 360;
  const H = height;
  const PAD = 24;
  const xSpan = Math.max(0.001, xMax - xMin);
  const ySpan = Math.max(0.001, yMax - yMin);
  const sx = (x: number) => PAD + ((x - xMin) / xSpan) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - yMin) / ySpan) * (H - PAD * 2);

  const handle = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const x = xMin + ((px - PAD) / (W - PAD * 2)) * xSpan;
    const y = yMin + ((H - PAD - py) / (H - PAD * 2)) * ySpan;
    onClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  const gridLines: React.ReactNode[] = [];
  for (let i = Math.ceil(xMin); i <= Math.floor(xMax); i++) {
    gridLines.push(
      <line
        key={`vx${i}`}
        x1={sx(i)}
        y1={PAD}
        x2={sx(i)}
        y2={H - PAD}
        stroke="var(--border)"
        strokeWidth={i === 0 ? 1.5 : 0.5}
      />,
    );
  }
  for (let j = Math.ceil(yMin); j <= Math.floor(yMax); j++) {
    gridLines.push(
      <line
        key={`hy${j}`}
        x1={PAD}
        y1={sy(j)}
        x2={W - PAD}
        y2={sy(j)}
        stroke="var(--border)"
        strokeWidth={j === 0 ? 1.5 : 0.5}
      />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full rounded-xl border border-border bg-background ${onClick ? "cursor-crosshair" : ""}`}
      onClick={handle}
    >
      {gridLines}
      {shapes.map((s, i) => (
        <ShapeSvg key={i} shape={s} sx={sx} sy={sy} vw={W} vh={H} />
      ))}

      {/* axis tick labels */}
      {Math.ceil(xMin) <= 0 && Math.floor(xMax) >= 0 && (
        <>
          {[Math.ceil(xMin), Math.floor(xMax)].map((n) => (
            <text key={`xl${n}`} x={sx(n)} y={sy(0) + 12} textAnchor="middle" className="fill-current text-[9px] text-muted-foreground">
              {n}
            </text>
          ))}
        </>
      )}
      {overlay}
    </svg>
  );
}

function ShapeSvg({
  shape,
  sx,
  sy,
}: {
  shape: DrawShape;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  const stroke = "var(--primary)";
  switch (shape.type) {
    case "point":
      return (
        <g>
          <circle cx={sx(shape.x)} cy={sy(shape.y)} r={4} fill={stroke} />
          {shape.label && (
            <text x={sx(shape.x) + 6} y={sy(shape.y) - 6} className="fill-current text-[10px]">
              {shape.label}
            </text>
          )}
        </g>
      );
    case "line": {
      // extend to edges by parameterization
      return (
        <line
          x1={sx(shape.x1)}
          y1={sy(shape.y1)}
          x2={sx(shape.x2)}
          y2={sy(shape.y2)}
          stroke={stroke}
          strokeWidth={2}
        />
      );
    }
    case "parabola": {
      // y = a (x - hx)^2 + hy passing through (px,py)
      const dx = shape.px - shape.hx;
      if (dx === 0) return null;
      const a = (shape.py - shape.hy) / (dx * dx);
      const pts: string[] = [];
      const N = 60;
      const range = Math.max(2, Math.abs(dx) * 3);
      for (let i = 0; i <= N; i++) {
        const x = shape.hx - range + (i / N) * range * 2;
        const y = a * (x - shape.hx) * (x - shape.hx) + shape.hy;
        pts.push(`${sx(x)},${sy(y)}`);
      }
      return <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2} />;
    }
    case "circle": {
      const r = Math.hypot(shape.rx - shape.cx, shape.ry - shape.cy);
      // draw as SVG ellipse to handle non-uniform scale
      const px = sx(shape.cx);
      const py = sy(shape.cy);
      const rxPx = sx(shape.cx + r) - px;
      const ryPx = py - sy(shape.cy + r);
      return <ellipse cx={px} cy={py} rx={rxPx} ry={ryPx} fill="none" stroke={stroke} strokeWidth={2} />;
    }
    case "ellipse": {
      const a = Math.hypot(shape.ax - shape.cx, shape.ay - shape.cy);
      const b = Math.hypot(shape.bx - shape.cx, shape.by - shape.cy);
      const px = sx(shape.cx);
      const py = sy(shape.cy);
      const rxPx = sx(shape.cx + a) - px;
      const ryPx = py - sy(shape.cy + b);
      return <ellipse cx={px} cy={py} rx={rxPx} ry={ryPx} fill="none" stroke={stroke} strokeWidth={2} />;
    }
    case "hyperbola": {
      const a = Math.hypot(shape.ax - shape.cx, shape.ay - shape.cy);
      const b = Math.hypot(shape.bx - shape.cx, shape.by - shape.cy);
      if (a <= 0 || b <= 0) return null;
      const N = 40;
      const branch = (sign: number) => {
        const pts: string[] = [];
        for (let i = -N; i <= N; i++) {
          const t = (i / N) * 1.5;
          const x = shape.cx + sign * a * Math.cosh(t);
          const y = shape.cy + b * Math.sinh(t);
          pts.push(`${sx(x)},${sy(y)}`);
        }
        return pts.join(" ");
      };
      return (
        <g fill="none" stroke={stroke} strokeWidth={2}>
          <polyline points={branch(1)} />
          <polyline points={branch(-1)} />
        </g>
      );
    }
    case "halfplane": {
      // Line through (x1,y1)-(x2,y2); shade the side above (larger y) or below (smaller y)
      // For a vertical line, "above" means the right side (larger x).
      const dx = shape.x2 - shape.x1;
      const dy = shape.y2 - shape.y1;
      const isVertical = Math.abs(dx) < 1e-9;
      // Build shaded polygon in math coords over an oversized bounding box, then project.
      // Since sx/sy are monotonic linear, straight math edges stay straight in svg.
      const BIG = 1e5;
      let poly: { x: number; y: number }[] = [];
      if (isVertical) {
        const xL = shape.x1;
        // "above" ⇒ right side
        const shadeRight = shape.above;
        const xFar = shadeRight ? BIG : -BIG;
        poly = [
          { x: xL, y: -BIG },
          { x: xL, y: BIG },
          { x: xFar, y: BIG },
          { x: xFar, y: -BIG },
        ];
      } else {
        const m = dy / dx;
        const b0 = shape.y1 - m * shape.x1;
        const yFar = shape.above ? BIG : -BIG;
        // Sample line across full x range
        const xL = -BIG;
        const xR = BIG;
        poly = [
          { x: xL, y: m * xL + b0 },
          { x: xR, y: m * xR + b0 },
          { x: xR, y: yFar },
          { x: xL, y: yFar },
        ];
      }
      const pts = poly.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
      // Boundary line — extend across visible range as well
      let bx1: number, by1: number, bx2: number, by2: number;
      if (isVertical) {
        bx1 = bx2 = sx(shape.x1);
        by1 = sy(-BIG);
        by2 = sy(BIG);
      } else {
        const m = dy / dx;
        const b0 = shape.y1 - m * shape.x1;
        bx1 = sx(-BIG); by1 = sy(m * -BIG + b0);
        bx2 = sx(BIG); by2 = sy(m * BIG + b0);
      }
      return (
        <g>
          <polygon points={pts} fill={stroke} fillOpacity={0.18} stroke="none" />
          <line
            x1={bx1}
            y1={by1}
            x2={bx2}
            y2={by2}
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray={shape.strict ? "5 4" : undefined}
          />
        </g>
      );
    }
  }
}


function CoordChart({ spec }: { spec: Extract<StaticSpec, { kind: "coord" }> }) {
  return (
    <ChartFrame title={spec.title}>
      <CoordinateGrid
        xMin={spec.xMin}
        xMax={spec.xMax}
        yMin={spec.yMin}
        yMax={spec.yMax}
        shapes={spec.shapes}
      />
    </ChartFrame>
  );
}

export function InteractiveBarPreview({
  categories,
  max,
  unit,
}: {
  categories: { label: string; target: number }[];
  max: number;
  unit?: string;
}) {
  const m = Math.max(max, ...categories.map((c) => c.target), 1);
  return (
    <div>
      <div className="flex h-40 items-end gap-2">
        {categories.map((c, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="text-[10px] text-muted-foreground">
              {c.target}
              {unit ?? ""}
            </div>
            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${(c.target / m) * 100}%`, minHeight: 2 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {categories.map((c, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px]">
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractivePieVisual({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 100;
  let acc = 0;
  const R = 90;
  const CX = 100;
  const CY = 100;
  return (
    <svg viewBox="0 0 200 200" className="h-48 w-48">
      {values.map((v, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += Math.max(0, v);
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = CX + R * Math.cos(start);
        const y1 = CY + R * Math.sin(start);
        const x2 = CX + R * Math.cos(end);
        const y2 = CY + R * Math.sin(end);
        const d = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
        return (
          <path
            key={i}
            d={d}
            fill={SLICE_COLORS[i % SLICE_COLORS.length]}
            stroke="var(--background)"
            strokeWidth={2}
          >
            <title>{labels[i]}</title>
          </path>
        );
      })}
    </svg>
  );
}

// ============================================================
// Number line
// ============================================================

function NumberLineChart({ spec }: { spec: Extract<StaticSpec, { kind: "numberline" }> }) {
  return (
    <ChartFrame title={spec.title}>
      <NumberLineSvg spec={spec} />
    </ChartFrame>
  );
}

export function NumberLineSvg({ spec }: { spec: Extract<StaticSpec, { kind: "numberline" }> }) {
  const W = 400;
  const H = 110;
  const PAD = 30;
  const step = spec.step > 0 ? spec.step : 1;
  const span = Math.max(0.001, spec.max - spec.min);
  const sx = (v: number) => PAD + ((v - spec.min) / span) * (W - PAD * 2);
  const y = H - 40;
  const ticks: number[] = [];
  for (let v = spec.min; v <= spec.max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-muted-foreground">
      <defs>
        <marker id="nl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      <line x1={PAD - 10} y1={y} x2={W - PAD + 10} y2={y} stroke="currentColor" strokeWidth={1.5} markerStart="url(#nl-arrow)" markerEnd="url(#nl-arrow)" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={sx(t)} y1={y - 6} x2={sx(t)} y2={y + 6} stroke="currentColor" />
          <text x={sx(t)} y={y + 20} textAnchor="middle" className="fill-current text-[10px]">{t}</text>
        </g>
      ))}
      {spec.intervals.map((iv, i) => {
        const x1 = sx(iv.from), x2 = sx(iv.to);
        return (
          <g key={`iv${i}`} className="text-[var(--primary)]">
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth={4} />
            <circle cx={x1} cy={y} r={5} fill={iv.closedLeft === false ? "var(--background)" : "currentColor"} stroke="currentColor" strokeWidth={2} />
            <circle cx={x2} cy={y} r={5} fill={iv.closedRight === false ? "var(--background)" : "currentColor"} stroke="currentColor" strokeWidth={2} />
            {iv.label && <text x={(x1 + x2) / 2} y={y - 12} textAnchor="middle" className="fill-current text-[10px] font-semibold">{iv.label}</text>}
          </g>
        );
      })}
      {(spec.rays ?? []).map((r, i) => {
        const start = sx(r.at);
        const end = r.direction === "right" ? W - PAD + 8 : PAD - 8;
        return (
          <g key={`ray${i}`} className="text-[var(--primary)]">
            <line x1={start} y1={y} x2={end} y2={y} stroke="currentColor" strokeWidth={4} markerEnd="url(#nl-arrow)" />
            <circle cx={start} cy={y} r={5} fill={r.closed ? "currentColor" : "var(--background)"} stroke="currentColor" strokeWidth={2} />
            {r.label && <text x={start + (r.direction === "right" ? 12 : -12)} y={y - 12} textAnchor={r.direction === "right" ? "start" : "end"} className="fill-current text-[10px] font-semibold">{r.label}</text>}
          </g>
        );
      })}
      {spec.marks.map((m, i) => (
        <g key={`mk${i}`} className="text-[var(--primary)]">
          <circle cx={sx(m.value)} cy={y} r={5} fill="currentColor" />
          {m.label && <text x={sx(m.value)} y={y - 12} textAnchor="middle" className="fill-current text-[10px] font-semibold">{m.label}</text>}
        </g>
      ))}

    </svg>
  );
}

// ============================================================
// Blank grid
// ============================================================

function BlankGrid({ spec }: { spec: Extract<StaticSpec, { kind: "grid" }> }) {
  const cell = 28;
  const W = spec.cols * cell + 20;
  const H = spec.rows * cell + 20;
  const lines: React.ReactNode[] = [];
  if (spec.style === "square") {
    for (let i = 0; i <= spec.cols; i++)
      lines.push(<line key={`v${i}`} x1={10 + i * cell} y1={10} x2={10 + i * cell} y2={10 + spec.rows * cell} stroke="var(--border)" strokeWidth={i === 0 || i === spec.cols ? 1.2 : 0.6} />);
    for (let j = 0; j <= spec.rows; j++)
      lines.push(<line key={`h${j}`} x1={10} y1={10 + j * cell} x2={10 + spec.cols * cell} y2={10 + j * cell} stroke="var(--border)" strokeWidth={j === 0 || j === spec.rows ? 1.2 : 0.6} />);
  } else if (spec.style === "dot") {
    for (let i = 0; i <= spec.cols; i++)
      for (let j = 0; j <= spec.rows; j++)
        lines.push(<circle key={`d${i}-${j}`} cx={10 + i * cell} cy={10 + j * cell} r={1.5} fill="var(--muted-foreground)" />);
  } else {
    // isometric: 60deg diagonals + horizontals
    const h = cell * Math.sqrt(3) / 2;
    for (let j = 0; j <= spec.rows; j++)
      lines.push(<line key={`ih${j}`} x1={10} y1={10 + j * h} x2={10 + spec.cols * cell} y2={10 + j * h} stroke="var(--border)" strokeWidth={0.6} />);
    for (let i = -spec.rows; i <= spec.cols + spec.rows; i++) {
      const x0 = 10 + i * cell;
      lines.push(<line key={`ia${i}`} x1={x0} y1={10} x2={x0 + spec.rows * h / Math.sqrt(3)} y2={10 + spec.rows * h} stroke="var(--border)" strokeWidth={0.6} />);
      lines.push(<line key={`ib${i}`} x1={x0} y1={10} x2={x0 - spec.rows * h / Math.sqrt(3)} y2={10 + spec.rows * h} stroke="var(--border)" strokeWidth={0.6} />);
    }
  }
  return (
    <ChartFrame title={spec.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {lines}
        {spec.showAxes && spec.style === "square" && (
          <>
            <line x1={10} y1={10 + spec.rows * cell} x2={10 + spec.cols * cell + 4} y2={10 + spec.rows * cell} stroke="currentColor" strokeWidth={1.5} />
            <line x1={10} y1={10} x2={10} y2={10 + spec.rows * cell} stroke="currentColor" strokeWidth={1.5} />
          </>
        )}
      </svg>
    </ChartFrame>
  );
}

// ============================================================
// Fraction chart
// ============================================================

function FractionChart({ spec }: { spec: Extract<StaticSpec, { kind: "fraction" }> }) {
  return (
    <ChartFrame title={spec.title}>
      <FractionRows rows={spec.rows} />
    </ChartFrame>
  );
}

export function FractionRows({ rows }: { rows: { label?: string; parts: number; shaded: number }[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const parts = Math.max(1, Math.floor(row.parts));
        const shaded = Math.max(0, Math.min(parts, Math.floor(row.shaded)));
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-right text-sm font-semibold">{row.label ?? `${shaded}/${parts}`}</div>
            <div className="flex h-8 flex-1 overflow-hidden rounded-md border border-border">
              {Array.from({ length: parts }, (_, k) => (
                <div
                  key={k}
                  className={k < shaded ? "bg-primary/70" : "bg-background"}
                  style={{ flex: 1, borderRight: k < parts - 1 ? "1px solid var(--border)" : "none" }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Geometry figure (freeform polygon builder)
// ============================================================

function GeometryChart({ spec }: { spec: Extract<StaticSpec, { kind: "geometry" }> }) {
  return (
    <ChartFrame title={spec.title}>
      <GeometrySvg points={spec.points} edges={spec.edges} angles={spec.angles} />
    </ChartFrame>
  );
}

export function GeometrySvg({
  points,
  edges,
  angles,
  onPointDown,
  activeId,
}: {
  points: GeoPoint[];
  edges: GeoEdge[];
  angles: GeoAngle[];
  onPointDown?: (id: string, e: React.PointerEvent) => void;
  activeId?: string | null;
}) {
  const W = 480, H = 360;
  const sx = (x: number) => (x / 100) * W;
  const sy = (y: number) => (y / 100) * H;
  const byId = new Map(points.map((p) => [p.id, p] as const));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none rounded-xl border border-border bg-background">
      {edges.map((e, i) => {
        const a = byId.get(e.a), b = byId.get(e.b);
        if (!a || !b) return null;
        return <EdgeSvg key={i} a={a} b={b} edge={e} sx={sx} sy={sy} />;
      })}
      {angles.map((ang, i) => {
        const v = byId.get(ang.at), f = byId.get(ang.from), t = byId.get(ang.to);
        if (!v || !f || !t) return null;
        return <AngleSvg key={i} vertex={v} from={f} to={t} angle={ang} sx={sx} sy={sy} />;
      })}
      {points.map((p) => (
        <g
          key={p.id}
          onPointerDown={onPointDown ? (e) => onPointDown(p.id, e) : undefined}
          style={{ cursor: onPointDown ? "grab" : undefined }}
        >
          <circle cx={sx(p.x)} cy={sy(p.y)} r={activeId === p.id ? 8 : 5} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
          {p.label && (
            <text x={sx(p.x) + 10} y={sy(p.y) - 8} className="fill-current text-[13px] font-semibold">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function EdgeSvg({ a, b, edge, sx, sy }: { a: GeoPoint; b: GeoPoint; edge: GeoEdge; sx: (n: number) => number; sy: (n: number) => number }) {
  const x1 = sx(a.x), y1 = sy(a.y), x2 = sx(b.x), y2 = sy(b.y);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  // curve control point offset perpendicular from midpoint
  const bulge = edge.curve ?? 0;
  const cx = mx + nx * bulge;
  const cy = my + ny * bulge;
  const marks: React.ReactNode[] = [];
  if (edge.parallel) {
    const count = edge.parallel;
    for (let k = 0; k < count; k++) {
      const off = (k - (count - 1) / 2) * 5;
      const px = (bulge ? cx : mx) + ux * off, py = (bulge ? cy : my) + uy * off;
      const p1x = px + ux * -4 + nx * 4, p1y = py + uy * -4 + ny * 4;
      const p2x = px + ux * -4 - nx * 4, p2y = py + uy * -4 - ny * 4;
      marks.push(<polyline key={`p${k}`} points={`${p1x},${p1y} ${px},${py} ${p2x},${p2y}`} fill="none" stroke="var(--primary)" strokeWidth={2} />);
    }
  }
  if (edge.tick) {
    const count = edge.tick;
    for (let k = 0; k < count; k++) {
      const off = (k - (count - 1) / 2) * 5;
      const px = (bulge ? cx : mx) + ux * off, py = (bulge ? cy : my) + uy * off;
      marks.push(<line key={`t${k}`} x1={px + nx * 6} y1={py + ny * 6} x2={px - nx * 6} y2={py - ny * 6} stroke="var(--primary)" strokeWidth={2} />);
    }
  }
  return (
    <g>
      {bulge ? (
        <path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke="currentColor" strokeWidth={2} />
      ) : (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={2} />
      )}
      {marks}
    </g>
  );
}


export function AngleSvg({ vertex, from, to, angle, sx, sy }: { vertex: GeoPoint; from: GeoPoint; to: GeoPoint; angle: GeoAngle; sx: (n: number) => number; sy: (n: number) => number }) {
  const vx = sx(vertex.x), vy = sy(vertex.y);
  const a1 = Math.atan2(sy(from.y) - vy, sx(from.x) - vx);
  const a2 = Math.atan2(sy(to.y) - vy, sx(to.x) - vx);
  const r = 22;
  if (angle.right) {
    // square marker
    const s = 14;
    const c1x = vx + Math.cos(a1) * s, c1y = vy + Math.sin(a1) * s;
    const c2x = vx + Math.cos(a2) * s, c2y = vy + Math.sin(a2) * s;
    const c3x = c1x + (c2x - vx), c3y = c1y + (c2y - vy);
    return (
      <polyline points={`${c1x},${c1y} ${c3x},${c3y} ${c2x},${c2y}`} fill="none" stroke="var(--primary)" strokeWidth={1.8} />
    );
  }
  // shortest sweep arc
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const sweep = delta > 0 ? 1 : 0;
  const x1 = vx + Math.cos(a1) * r, y1 = vy + Math.sin(a1) * r;
  const x2 = vx + Math.cos(a2) * r, y2 = vy + Math.sin(a2) * r;
  const large = Math.abs(delta) > Math.PI ? 1 : 0;
  const midA = a1 + delta / 2;
  const lx = vx + Math.cos(midA) * (r + 14);
  const ly = vy + Math.sin(midA) * (r + 14);
  return (
    <g>
      <path d={`M${x1},${y1} A${r},${r} 0 ${large} ${sweep} ${x2},${y2}`} fill="none" stroke="var(--primary)" strokeWidth={1.8} />
      {angle.label && <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-current text-[11px] font-semibold">{angle.label}</text>}
    </g>
  );
}
