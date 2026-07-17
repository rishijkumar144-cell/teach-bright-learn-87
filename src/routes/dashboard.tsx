import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BookOpen,
  Globe,
  Eye,
  Users,
  Sparkles,
  ArrowRight,
  Clock,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { lessons, activity, teacher, createLesson } = useStore();
  const navigate = useNavigate();

  const published = lessons.filter((l) => l.status === "published");
  const totalVisits = lessons.reduce((a, l) => a + l.visits, 0);
  const totalStudents = new Set(activity.map((a) => a.studentName)).size;

  const stats = [
    { label: "Total Lessons", value: lessons.length, icon: BookOpen, tone: "bg-primary/10 text-primary" },
    { label: "Published", value: published.length, icon: Globe, tone: "bg-[oklch(0.7_0.15_160)/15%] text-[oklch(0.45_0.15_160)] dark:text-[oklch(0.8_0.15_160)]" },
    { label: "Student Visits", value: totalVisits, icon: Eye, tone: "bg-[oklch(0.78_0.15_75)/20%] text-[oklch(0.5_0.15_75)] dark:text-[oklch(0.85_0.15_75)]" },
    { label: "Total Students", value: totalStudents, icon: Users, tone: "bg-[oklch(0.65_0.2_25)/15%] text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.8_0.15_25)]" },
  ];

  const onCreate = () => {
    const l = createLesson();
    navigate({ to: "/lessons/$id", params: { id: l.id } });
  };

  const recent = [...lessons].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <TeacherLayout>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back, {teacher?.displayName?.split(" ")[0] || "Teacher"} 👋
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your teaching hub</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/lessons">
              <BookOpen className="h-4 w-4" /> All lessons
            </Link>
          </Button>
          <Button onClick={onCreate}>
            <Sparkles className="h-4 w-4" /> Create lesson
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="card-soft">
              <CardContent className="p-6">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="card-soft lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent lessons</h2>
              <Link
                to="/lessons"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyLessons onCreate={onCreate} />
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {recent.map((l) => (
                  <li key={l.id}>
                    <Link
                      to="/lessons/$id"
                      params={{ id: l.id }}
                      className="flex items-center gap-4 py-3 hover:bg-accent/40 rounded-lg -mx-2 px-2 transition"
                    >
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{l.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(l.updatedAt, { addSuffix: true })}
                          <span>•</span>
                          {l.blocks.length} blocks
                        </div>
                      </div>
                      <StatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            {activity.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Student completions will appear here.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {activity.slice(0, 6).map((a) => {
                  const lesson = lessons.find((l) => l.id === a.lessonId);
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {(a.studentName || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate">
                          <span className="font-medium">{a.studentName}</span> finished{" "}
                          <span className="text-muted-foreground">
                            {lesson?.title ?? "a lesson"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(a.completedAt, { addSuffix: true })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}

function EmptyLessons({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Create your first lesson</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Drag in headings, quizzes, and interactive blocks. Publish with one click.
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Sparkles className="h-4 w-4" /> Create lesson
      </Button>
    </div>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  const map = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    published: {
      label: "Published",
      cls: "bg-[oklch(0.7_0.15_160)/15%] text-[oklch(0.4_0.15_160)] dark:text-[oklch(0.85_0.15_160)]",
    },
    archived: { label: "Archived", cls: "bg-accent text-accent-foreground" },
  } as const;
  const it = map[status];
  return (
    <Badge variant="secondary" className={`${it.cls} rounded-full border-0`}>
      {it.label}
    </Badge>
  );
}
