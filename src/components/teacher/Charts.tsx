import type { DrawShape, StaticSpec } from "@/lib/charts";
import { SLICE_COLORS } from "@/lib/charts";

const CHART_STROKE = "currentColor";

export function StaticChart({ spec }: { spec: StaticSpec }) {
  switch (spec.kind) {
    case "image":
      return spec.url ? (
        <figure className="overflow-hidden rounded-2xl border border-border">
          <img
            src={spec.url}
            alt={spec.caption || ""}
            className="w-full bg-background object-contain"
          />
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
        <ShapeSvg key={i} shape={s} sx={sx} sy={sy} />
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
