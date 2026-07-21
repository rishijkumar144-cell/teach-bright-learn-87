// Shared types for the 2D Diagram (`model2d`) and Interactive (`interactive`)
// blocks. Everything is stored inside `block.data.spec` as a discriminated
// union on `kind`.

export type ToolKind =
  | "point"
  | "line"
  | "parabola"
  | "circle"
  | "ellipse"
  | "hyperbola"
  | "halfplane";


// ---------- Static 2D diagram ----------

export interface ImageLabel {
  id: string;
  x: number; // 0-100 percent
  y: number; // 0-100 percent
  text: string;
}

export type StaticSpec =
  | { kind: "image"; url: string; caption?: string; labels?: ImageLabel[] }
  | { kind: "table"; headers: string[]; rows: string[][]; caption?: string }
  | {
      kind: "bar";
      title: string;
      unit?: string;
      max?: number;
      categories: { label: string; value: number }[];
    }
  | { kind: "pie"; title: string; slices: { label: string; value: number }[] }
  | {
      kind: "line";
      title: string;
      xLabel?: string;
      yLabel?: string;
      points: { x: number; y: number }[];
    }
  | {
      kind: "lineplot";
      title: string;
      min: number;
      max: number;
      values: number[];
    }
  | { kind: "stemleaf"; title: string; values: number[] }
  | {
      kind: "coord";
      title: string;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      shapes: DrawShape[];
    }
  | {
      kind: "numberline";
      title: string;
      min: number;
      max: number;
      step: number;
      marks: { value: number; label?: string }[];
      intervals: { from: number; to: number; label?: string; closedLeft?: boolean; closedRight?: boolean }[];
    }
  | {
      kind: "grid";
      title: string;
      cols: number;
      rows: number;
      style: "square" | "dot" | "isometric";
      showAxes?: boolean;
    }
  | {
      kind: "fraction";
      title: string;
      rows: { label?: string; parts: number; shaded: number }[];
    }
  | {
      kind: "geometry";
      title: string;
      points: GeoPoint[];
      edges: GeoEdge[];
      angles: GeoAngle[];
    };

export interface GeoPoint {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface GeoEdge {
  a: string;
  b: string;
  parallel?: number;
  tick?: number;
  curve?: number; // bulge in svg-space px; 0/undefined = straight
}


export interface GeoAngle {
  at: string;
  from: string;
  to: string;
  label?: string;
  right?: boolean;
}

export type StaticKind = StaticSpec["kind"];

export type DrawShape =
  | { type: "point"; x: number; y: number; label?: string }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "parabola"; hx: number; hy: number; px: number; py: number }
  | { type: "circle"; cx: number; cy: number; rx: number; ry: number }
  | { type: "ellipse"; cx: number; cy: number; ax: number; ay: number; bx: number; by: number }
  | { type: "hyperbola"; cx: number; cy: number; ax: number; ay: number; bx: number; by: number }
  | { type: "halfplane"; x1: number; y1: number; x2: number; y2: number; above: boolean; strict?: boolean };


// ---------- Interactive ----------

export interface InteractivePin {
  id: string;
  x: number; // 0-100 percent of image width
  y: number; // 0-100 percent of image height
  answer?: string; // expected label; empty accepts any non-empty
  hint?: string;
}

export type InteractiveSpec =
  | {
      kind: "fill-image";
      title: string;
      instructions: string;
      imageUrl: string;
      pins: InteractivePin[];
    }
  | {
      kind: "bar";
      title: string;
      instructions: string;
      unit?: string;
      max: number;
      tolerance: number;
      categories: { label: string; target: number }[];
    }
  | {
      kind: "pie";
      title: string;
      instructions: string;
      tolerance: number;
      slices: { label: string; target: number }[];
    }
  | {
      kind: "line";
      title: string;
      instructions: string;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      tolerance: number;
      targets: { x: number; y: number }[];
    }
  | {
      kind: "lineplot";
      title: string;
      instructions: string;
      min: number;
      max: number;
      targets: number[]; // multiset of required values (repeats matter)
    }
  | {
      kind: "coord";
      title: string;
      instructions: string;
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      tools: ToolKind[];
      minShapes: number;
    }
  | {
      kind: "table";
      title: string;
      instructions: string;
      rows: number;
      cols: number;
      // grid[r][c] = { value: pre-filled text (shown to student when !blank),
      //               blank: true if student must fill this cell,
      //               answer: optional expected answer (case-insensitive) }
      cells: { value: string; blank: boolean; answer?: string }[][];
    };

export type InteractiveKind = InteractiveSpec["kind"];

// ---------- Answer completion checks ----------

export function fillImageComplete(
  spec: Extract<InteractiveSpec, { kind: "fill-image" }>,
  value: unknown,
): boolean {
  const v = (value as Record<string, string> | undefined) ?? {};
  return spec.pins.every((p) => {
    const answer = (v[p.id] ?? "").trim();
    if (!answer) return false;
    if (p.answer && p.answer.trim()) {
      return answer.toLowerCase() === p.answer.trim().toLowerCase();
    }
    return true;
  });
}

export function barComplete(
  spec: Extract<InteractiveSpec, { kind: "bar" }>,
  value: unknown,
): boolean {
  const vals = (value as number[] | undefined) ?? [];
  if (vals.length !== spec.categories.length) return false;
  const tol = spec.tolerance ?? 0;
  return spec.categories.every((c, i) => Math.abs((vals[i] ?? -Infinity) - c.target) <= tol);
}

export function pieComplete(
  spec: Extract<InteractiveSpec, { kind: "pie" }>,
  value: unknown,
): boolean {
  const vals = (value as number[] | undefined) ?? [];
  if (vals.length !== spec.slices.length) return false;
  const tol = spec.tolerance ?? 0;
  return spec.slices.every((s, i) => Math.abs((vals[i] ?? -Infinity) - s.target) <= tol);
}

export function lineComplete(
  spec: Extract<InteractiveSpec, { kind: "line" }>,
  value: unknown,
): boolean {
  const pts = (value as { x: number; y: number }[] | undefined) ?? [];
  if (pts.length < spec.targets.length) return false;
  const tol = spec.tolerance ?? 0;
  const used = new Set<number>();
  return spec.targets.every((t) => {
    const idx = pts.findIndex(
      (p, i) => !used.has(i) && Math.abs(p.x - t.x) <= tol && Math.abs(p.y - t.y) <= tol,
    );
    if (idx === -1) return false;
    used.add(idx);
    return true;
  });
}

export function lineplotComplete(
  spec: Extract<InteractiveSpec, { kind: "lineplot" }>,
  value: unknown,
): boolean {
  const got = (value as number[] | undefined) ?? [];
  const want = [...spec.targets].sort((a, b) => a - b);
  const has = [...got].sort((a, b) => a - b);
  if (want.length !== has.length) return false;
  return want.every((v, i) => v === has[i]);
}

export function coordComplete(
  spec: Extract<InteractiveSpec, { kind: "coord" }>,
  value: unknown,
): boolean {
  const shapes = (value as DrawShape[] | undefined) ?? [];
  return shapes.length >= Math.max(1, spec.minShapes || 1);
}

export function tableComplete(
  spec: Extract<InteractiveSpec, { kind: "table" }>,
  value: unknown,
): boolean {
  const v = (value as Record<string, string> | undefined) ?? {};
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      const cell = spec.cells[r]?.[c];
      if (!cell || !cell.blank) continue;
      const got = (v[`${r},${c}`] ?? "").trim();
      if (!got) return false;
      if (cell.answer && cell.answer.trim()) {
        if (got.toLowerCase() !== cell.answer.trim().toLowerCase()) return false;
      }
    }
  }
  return true;
}

export function interactiveComplete(spec: InteractiveSpec, value: unknown): boolean {
  switch (spec.kind) {
    case "fill-image":
      return fillImageComplete(spec, value);
    case "bar":
      return barComplete(spec, value);
    case "pie":
      return pieComplete(spec, value);
    case "line":
      return lineComplete(spec, value);
    case "lineplot":
      return lineplotComplete(spec, value);
    case "coord":
      return coordComplete(spec, value);
    case "table":
      return tableComplete(spec, value);
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const SLICE_COLORS = [
  "oklch(0.72 0.15 40)",
  "oklch(0.72 0.15 140)",
  "oklch(0.72 0.15 240)",
  "oklch(0.72 0.15 320)",
  "oklch(0.72 0.15 80)",
  "oklch(0.72 0.15 200)",
  "oklch(0.72 0.15 20)",
  "oklch(0.72 0.15 180)",
];
