## Goal

Remove all AI. Replace with **structured chart builders** for teachers, plus **truly interactive versions** students manipulate. Also add a fill‑in‑the‑label mode for uploaded diagrams.

## Cleanup

- Delete `src/lib/ai.functions.ts` and all imports/usages (`generateDiagram`, `generateInteractive`, "AI" tabs in editors, `Sparkles` UI).
- Keep the `model2d` and `interactive` block types (rename in the palette only).

## Static "2D Diagram" block (`model2d`)

Teacher first picks a **kind**, then fills in data. Renders as SVG/HTML in the lesson.

Kinds:

| Kind | Teacher inputs |
| --- | --- |
| `image` | Upload/URL + caption |
| `table` | Column headers + rows |
| `bar` | Categories: `{ label, value }[]`, y‑axis label, unit |
| `pie` | Slices: `{ label, value }[]` |
| `line` | Points `{ x, y }[]`, axis labels |
| `lineplot` | Number line: min/max, values `number[]` (dots stack) |
| `stemleaf` | Values `number[]` → auto stem/leaf table |
| `coord` | Grid range xMin/xMax/yMin/yMax + optional pre‑drawn shapes (points, line segments) |

Static renderers are SVG in a new file `src/components/teacher/Charts.tsx` shared with the interactive block.

## Interactive block (`interactive`)

Teacher writes **title + instructions**, picks a **kind**, and configures the answer key. Student must satisfy the completion rule before the "Submit" button unlocks.

Kinds:

- **`fill-image`** — Upload/URL of an image. Teacher clicks on the image to drop label pins; each pin has an `expectedText` (optional; if blank, any non‑empty text counts). Student sees pins with empty text boxes; must fill every box.
- **`bar`** — Existing bar‑drag with target + tolerance. Manually configured now (no AI generator).
- **`pie`** — Slices with target percentages. Student drags slice boundaries around the circle. Complete when every slice is within tolerance.
- **`line`** — Grid with target points. Student clicks to place points; must place one within tolerance of each target.
- **`lineplot`** — Number line with target counts per value (e.g. `{3: 2, 4: 1}` = two dots on 3, one on 4). Student clicks the number line to stack dots.
- **`coord`** — Free draw. Teacher enables which tools (point / line / parabola / circle / ellipse / hyperbola). Student picks a tool, clicks to place. Completion rule: teacher sets a minimum number of shapes (default 1). Actual correctness is teacher‑graded (shape data is saved on the submission and shown in the grading view).

### Fill‑image editor UX

Image displayed at fixed aspect; clicking places a pin at normalized (x, y) coordinates. Sidebar lists pins with optional expected text. Student sees pin dots overlaid on image, each with a small text input beside it.

### Data shapes (stored in block `data.spec`)

Uses a discriminated union on `kind`. Existing `bar-graph` spec is kept and mapped to `kind: "bar"`.

## Student player changes

- `hasAnswer` handles every kind with kind‑specific completion checks.
- The interactive renderer dispatches on `spec.kind`.
- Non‑interactive `model2d` renders a static chart via `Charts.tsx`.

## Files touched

- **Delete:** `src/lib/ai.functions.ts`
- **New:** `src/components/teacher/Charts.tsx` (SVG renderers shared by editor + player + grading)
- **Rewrite:** `Model2DBlockEditor` and `InteractiveBlockEditor` in `src/components/teacher/BlockEditor.tsx`; add kind pickers + config forms; remove AI UI
- **Update:** `src/components/teacher/LessonPlayer.tsx` — new dispatch for `model2d` and interactive kinds; new `hasAnswer` cases
- **Update:** `src/routes/students.tsx` — show interactive answers (points, sectors, drawn shapes, filled labels) in the grading detail view (read‑only)
- **Update:** `src/lib/types.ts` — leave block types; docs comment only

## Scope notes

- Conic drawing on the coordinate plane uses a **3‑click** interaction: for circle, click center then a point on the rim; for parabola, click vertex then one point; for ellipse/hyperbola, click center then two axis points. Rendered as SVG paths from those anchors — no equation editor.
- Everything is deterministic and offline; no server calls.
- Auto‑grading in `lesson.$slug.tsx` stays as is (only auto‑grades the objective question types); interactive completion is stored in `answers` for the teacher to review.

Ready to build?