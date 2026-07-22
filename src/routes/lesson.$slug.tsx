import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { rowToLesson } from "@/lib/lessonMap";
import type { Lesson, Block } from "@/lib/types";
import { LessonPlayer, type LessonAttemptResult } from "@/components/teacher/LessonPlayer";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/lesson/$slug")({
  component: StudentLessonView,
});

function isCorrect(b: Block, value: unknown): boolean {
  const d = b.data as Record<string, unknown>;
  switch (b.type) {
    case "mcq":
      return typeof value === "number" && value === d.correct;
    case "truefalse":
      return typeof value === "boolean" && value === d.correct;
    case "numeric":
      return typeof value === "number" && value === Number(d.answer);
    case "short":
      return (
        typeof value === "string" &&
        typeof d.answer === "string" &&
        (d.answer as string).trim().length > 0 &&
        value.trim().toLowerCase() === (d.answer as string).trim().toLowerCase()
      );
    case "checkbox": {
      if (!Array.isArray(value) || !Array.isArray(d.correct)) return false;
      const a = [...(value as number[])].sort();
      const b2 = [...(d.correct as number[])].sort();
      return a.length === b2.length && a.every((x, i) => x === b2[i]);
    }
    default:
      return false;
  }
}

function StudentLessonView() {
  const { slug } = Route.useParams();
  const { teacher, refreshSubmissions } = useStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error(error);
      setLesson(data ? rowToLesson(data) : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onFinish = async (result: LessonAttemptResult) => {
    if (!lesson) return;
    const { answers, studentName, studentEmail } = result;
    const email = (studentEmail || teacher?.email || "").trim().toLowerCase();

    if (lesson.oneResponsePerEmail && email) {
      const { data: existing, error: dupErr } = await supabase
        .from("submissions")
        .select("id")
        .eq("lesson_id", lesson.id)
        .eq("student_email", email)
        .maybeSingle();
      if (dupErr) console.error(dupErr);
      if (existing) {
        toast.error("This email has already submitted a response for this lesson.");
        return;
      }
    }

    const autoTypes = new Set(["mcq", "checkbox", "truefalse", "short", "numeric"]);
    let autoScore = 0;
    let autoTotal = 0;
    for (const b of lesson.blocks) {
      if (!autoTypes.has(b.type)) continue;
      autoTotal += 1;
      if (isCorrect(b, answers[b.id])) autoScore += 1;
    }
    const payload: Record<string, unknown> = {
      lesson_id: lesson.id,
      student_name: studentName || teacher?.displayName || "Anonymous",
      student_email: email,
      answers: answers,
      auto_score: autoScore,
      auto_total: autoTotal,
    };
    if (teacher?.role === "student") {
      payload.student_id = teacher.id;
    }
    const { error } = await supabase.from("submissions").insert(payload as never);
    if (error) {
      console.error(error);
      toast.error("Could not save your submission. Please try again.");
    } else {
      toast.success("Submitted!");
      if (teacher?.role === "student") refreshSubmissions();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Lesson unavailable</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          This lesson link may have expired or the teacher unpublished it. Please check with
          your teacher.
        </p>
      </div>
    );
  }

  return (
    <LessonPlayer
      lesson={lesson}
      onFinish={onFinish}
      headerExtra={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {teacher?.role === "student" && (
            <Link to="/student" className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-semibold text-foreground hover:bg-accent">
              <ArrowLeft className="h-3 w-3" /> Portal
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Questly</span>
        </div>
      }
    />
  );
}
