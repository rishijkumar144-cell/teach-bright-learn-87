## Goal
Let students archive their completed lessons. Archived items move to a separate view and are excluded from the AI Analyzer.

## Changes

### 1. Database (migration)
- Add `archived boolean not null default false` column to `public.submissions`.
- No new policies needed — existing student update policy already scopes by `student_id`.

### 2. Types & store (`src/lib/types.ts`, `src/lib/lessonMap.ts`, `src/lib/store.tsx`)
- Add `archived: boolean` to `Submission`.
- Map DB column ⇄ field in `rowToSubmission`.
- Add `archiveSubmission(id, archived)` action in the store that updates the row and patches local state.

### 3. Student Completed tab (`src/routes/student.tsx`)
- Split `CompletedTab` into two sub-sections via inner tabs (or toggle): **Active** and **Archived**.
- Active list shows non-archived submissions with a new "Archive" button on each card.
- Archived list shows archived submissions with an "Unarchive" button.
- Empty states for each.

### 4. Analyzer (`src/lib/ai.functions.ts`)
- In `analyzeMyProgress`, filter query with `.eq("archived", false)` so archived submissions are ignored.

## Technical notes
- Archiving is a per-student action on their own submission row (RLS already permits it).
- Optimistic UI update in the store, revert on error via toast.
- No changes to teacher grading views — teachers still see all submissions.
