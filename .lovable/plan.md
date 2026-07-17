# Mathly: real backend + full editor + grading

This turns the current local-storage prototype into a real product powered by Lovable Cloud (database + auth). Teachers sign in, build lessons that persist to the database, publish public links, and grade student submissions. Students open the public link, enter their name, work through the lesson, submit answers, and their results appear in the teacher's dashboard.

## What you get

**Real accounts & storage**
- Sign in / sign up via Lovable Cloud auth (email + password, plus Google if you want).
- Lessons, blocks, publishes, and student submissions live in a real database — no more losing work when you clear your browser.

**A working lesson editor**
- Add blocks: heading, article/paragraph, image, video (YouTube/Vimeo embed URL), math expression, hint (collapsible), divider, summary, reflection.
- Add questions: multiple choice, checkbox (multi-select), true/false, numeric, short answer, **open-ended (long text, teacher-graded)**.
- Every question supports: prompt, options/correct answer, optional hint, optional solution/explanation shown after submit.
- Autosave to database (debounced), reorder blocks, duplicate, delete.

**Public student lesson links**
- Publish → get a shareable URL: `/lesson/<slug>`.
- Student opens the link, enters their name (required when the teacher enabled it), works through the lesson, submits.
- Auto-graded questions score instantly. Open-ended answers are stored for the teacher to grade.

**Teacher dashboard & grading**
- Students page shows completions per lesson, name, score, submission time.
- Click a submission → see every answer, including open-ended text.
- Grade open-ended answers with a score + optional feedback.

**Accessibility toolbar (top right)**
- Floating control cluster next to the theme toggle:
  - Light/Dark toggle (already done)
  - Dyslexia-friendly font toggle
  - Focus mode (hides non-essential chrome)
  - Text size (Normal / Large / X-Large)
  - Line spacing (Normal / Relaxed)
  - Reduce motion toggle
- Settings persist per device (localStorage) so students on the public lesson page can adjust for themselves.

## Technical shape

- Backend: Lovable Cloud (Supabase). Enable it in step 1.
- Tables: `profiles`, `lessons`, `blocks` (ordered per lesson), `submissions` (one row per student attempt), `answers` (one row per question in a submission), `activity`.
- RLS: teachers can only see/edit their own lessons and submissions to them. Public `SELECT` policy on published lessons + their blocks (no answers/solutions leaked). Students submit anonymously via a server function that writes with the admin client after validating the lesson is published.
- Server functions handle: publish, load lesson for student, submit student attempt, list submissions, grade open-ended answer.
- Autosave uses TanStack Query mutations with debounced flush.
- Migrate the existing local-storage lessons into the database on first sign-in (best-effort import).

## Rollout order

1. Enable Lovable Cloud, add auth, create schema + RLS.
2. Wire teacher auth flow (replace the fake login with real Supabase auth).
3. Move lesson list + editor to the database (autosave).
4. Extend block editor with the new block/question types + hints/solutions.
5. Public student page: name gate, run lesson, submit answers.
6. Teacher submissions view + open-ended grading UI.
7. Accessibility toolbar top-right (theme + dyslexia + focus + text size + spacing + reduce motion).

## A few things to confirm before I start

1. **Auth methods** — email/password only, or add Google sign-in too?
2. **Existing local data** — should I try to import your current in-browser lessons into your account on first sign-in, or start fresh?
3. **Open-ended grading scale** — points out of the question's max (e.g. `/5`), or a simple rubric (Needs work / Good / Excellent)?
4. **Should any published lesson be viewable without a student name**, or is the name always required?
