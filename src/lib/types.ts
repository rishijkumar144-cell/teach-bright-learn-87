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
  | "math"
  | "model3d"
  | "hint"
  | "divider"
  | "summary"
  | "reflection";

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
  email: string;
  displayName: string;
  school: string;
  theme: "light" | "dark";
  notifications: boolean;
  dyslexiaFont: boolean;
  focusMode: boolean;
}

export interface StudentActivity {
  id: string;
  lessonId: string;
  studentName: string;
  completedAt: number;
}
