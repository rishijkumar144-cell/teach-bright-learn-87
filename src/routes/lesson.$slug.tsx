import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { GraduationCap } from "lucide-react";
import { useStore } from "@/lib/store";
import { LessonPlayer } from "@/components/teacher/LessonPlayer";

export const Route = createFileRoute("/lesson/$slug")({
  component: StudentLessonView,
});

function StudentLessonView() {
  const { slug } = Route.useParams();
  const { getLessonBySlug, recordVisit, recordCompletion, hydrated } = useStore();
  const lesson = getLessonBySlug(slug);
  const visited = useRef(false);

  useEffect(() => {
    if (!hydrated || visited.current || !lesson) return;
    visited.current = true;
    recordVisit(slug);
  }, [hydrated, lesson, recordVisit, slug]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lesson || lesson.status !== "published") {
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
      onFinish={(name) => recordCompletion(slug, name)}
      headerExtra={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" /> Mathly
        </div>
      }
    />
  );
}
