export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "video"
  | "mcq"
  | "checkbox"
  | "short"
  | "numeric"
  | "truefalse"
  | "open"
  | "math"
  | "model3d"
  | "hint"
  | "divider"
  | "summary"
  | "reflection"
  | "split";

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

export type Difficulty = "Easy" | "Medium" | "Hard";
export type LessonStatus = "draft" | "published" | "archived";

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: Difficulty;
  gradeLevel: string;
  subject: string;
  objectives: string;
  thumbnail: string;
  blocks: Block[];
  status: LessonStatus;
  requireStudentName: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  visits: number;
}

export interface Teacher {
  id: string;
  email: string;
  displayName: string;
  school: string;
}

export interface Submission {
  id: string;
  lessonId: string;
  lessonTitle?: string;
  studentName: string;
  answers: Record<string, unknown>;
  autoScore: number | null;
  autoTotal: number | null;
  manualScore: number | null;
  manualTotal: number | null;
  feedback: Record<string, { score?: number; comment?: string }>;
  submittedAt: number;
  gradedAt: number | null;
}
