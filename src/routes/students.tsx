import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

function StudentsPage() {
  const { activity, lessons } = useStore();

  const byStudent = new Map<string, { name: string; count: number; last: number }>();
  for (const a of activity) {
    const cur = byStudent.get(a.studentName) || { name: a.studentName, count: 0, last: 0 };
    cur.count += 1;
    cur.last = Math.max(cur.last, a.completedAt);
    byStudent.set(a.studentName, cur);
  }
  const students = Array.from(byStudent.values()).sort((a, b) => b.last - a.last);

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-muted-foreground">
          See who has completed your published lessons.
        </p>
      </div>

      <Card className="card-soft">
        <CardContent className="p-6">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No student activity yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Publish a lesson and share the link — completions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Lessons completed</th>
                    <th className="px-4 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s) => (
                    <tr key={s.name} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                            {s.name[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{s.count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(s.last, { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {activity.length > 0 && (
        <Card className="card-soft mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Recent completions</h2>
            <ul className="mt-4 divide-y divide-border">
              {activity.slice(0, 20).map((a) => {
                const l = lessons.find((x) => x.id === a.lessonId);
                return (
                  <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                    <span>
                      <span className="font-medium">{a.studentName}</span>{" "}
                      <span className="text-muted-foreground">finished</span>{" "}
                      <span className="font-medium">{l?.title ?? "a lesson"}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(a.completedAt, { addSuffix: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </TeacherLayout>
  );
}
