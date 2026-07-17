import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Copy, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/published")({
  component: PublishedPage,
});

function PublishedPage() {
  const { lessons, unpublishLesson } = useStore();
  const published = lessons.filter((l) => l.status === "published");

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Published lessons</h1>
        <p className="mt-1 text-muted-foreground">
          Manage everything students can currently access.
        </p>
      </div>

      <Card className="card-soft">
        <CardContent className="p-6">
          {published.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Nothing published yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Open a lesson and hit Publish to share it with students.
              </p>
              <Button asChild className="mt-5">
                <Link to="/lessons">Go to lessons</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">Lesson</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Published</th>
                    <th className="px-3 py-3">Visits</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {published.map((l) => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/lesson/${l.slug}`;
                    return (
                      <tr key={l.id} className="hover:bg-accent/30">
                        <td className="px-3 py-3">
                          <Link
                            to="/lessons/$id"
                            params={{ id: l.id }}
                            className="font-medium hover:text-primary"
                          >
                            {l.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {l.subject} · {l.gradeLevel}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {format(l.createdAt, "MMM d, yyyy")}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {l.publishedAt ? format(l.publishedAt, "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-3 py-3 font-medium">{l.visits}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(url);
                                toast.success("Link copied");
                              }}
                              aria-label="Copy link"
                            >
                              <Copy className="h-4 w-4" /> Copy
                            </Button>
                            <Button size="sm" variant="ghost" asChild aria-label="Open">
                              <a href={`/lesson/${l.slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" /> Open
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                unpublishLesson(l.id);
                                toast.success("Lesson unpublished");
                              }}
                            >
                              <Eye className="h-4 w-4" /> Unpublish
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TeacherLayout>
  );
}
