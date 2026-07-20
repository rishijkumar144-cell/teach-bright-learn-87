import type { Block, Difficulty, Lesson, LessonStatus, Submission } from "./types";

interface LessonRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  difficulty: string;
  estimated_time: number;
  thumbnail: string;
  objectives: string;
  blocks: unknown;
  status: string;
  require_student_name: boolean;
  one_response_per_email?: boolean;
  solution_timing?: string;
  visits: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface SubmissionRow {
  id: string;
  lesson_id: string;
  student_name: string;
  student_email?: string;
  answers: unknown;
  auto_score: number | null;
  auto_total: number | null;
  manual_score: number | null;
  manual_total: number | null;
  feedback: unknown;
  submitted_at: string;
  graded_at: string | null;
}

export function rowToLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    subject: row.subject,
    gradeLevel: row.grade_level,
    difficulty: (row.difficulty as Difficulty) || "Medium",
    estimatedTime: row.estimated_time,
    thumbnail: row.thumbnail,
    objectives: row.objectives,
    blocks: Array.isArray(row.blocks) ? (row.blocks as Block[]) : [],
    status: (row.status as LessonStatus) || "draft",
    requireStudentName: row.require_student_name,
    oneResponsePerEmail: !!row.one_response_per_email,
    solutionTiming: row.solution_timing === "end" ? "end" : "immediate",
    visits: row.visits,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : null,
  };
}

export function lessonToUpdate(l: Partial<Lesson>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (l.title !== undefined) out.title = l.title;
  if (l.description !== undefined) out.description = l.description;
  if (l.subject !== undefined) out.subject = l.subject;
  if (l.gradeLevel !== undefined) out.grade_level = l.gradeLevel;
  if (l.difficulty !== undefined) out.difficulty = l.difficulty;
  if (l.estimatedTime !== undefined) out.estimated_time = l.estimatedTime;
  if (l.thumbnail !== undefined) out.thumbnail = l.thumbnail;
  if (l.objectives !== undefined) out.objectives = l.objectives;
  if (l.blocks !== undefined) out.blocks = l.blocks;
  if (l.status !== undefined) out.status = l.status;
  if (l.requireStudentName !== undefined) out.require_student_name = l.requireStudentName;
  if (l.oneResponsePerEmail !== undefined) out.one_response_per_email = l.oneResponsePerEmail;
  if (l.solutionTiming !== undefined) out.solution_timing = l.solutionTiming;
  if (l.publishedAt !== undefined) {
    out.published_at = l.publishedAt ? new Date(l.publishedAt).toISOString() : null;
  }
  return out;
}

export function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    studentName: row.student_name,
    studentEmail: row.student_email ?? "",
    answers: (row.answers as Record<string, unknown>) ?? {},
    autoScore: row.auto_score,
    autoTotal: row.auto_total,
    manualScore: row.manual_score,
    manualTotal: row.manual_total,
    feedback: (row.feedback as Record<string, { score?: number; comment?: string }>) ?? {},
    submittedAt: new Date(row.submitted_at).getTime(),
    gradedAt: row.graded_at ? new Date(row.graded_at).getTime() : null,
  };
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || "lesson"}-${rand}`;
}
