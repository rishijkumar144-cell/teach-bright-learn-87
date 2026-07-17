import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Sparkles, Search, MoreVertical, Trash2, Copy, Archive, Eye } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/lessons")({
  component: LessonsList,
});

function LessonsList() {
  const { lessons, createLesson, deleteLesson, archiveLesson } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "published" | "archived">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = lessons
    .filter((l) => (tab === "all" ? true : l.status === tab))
    .filter((l) => l.title.toLowerCase().includes(q.toLowerCase()));

  const onCreate = async () => {
    const l = await createLesson();
    if (l) navigate({ to: "/lessons/$id", params: { id: l.id } });
  };

  return (
    <TeacherLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lessons</h1>
          <p className="mt-1 text-muted-foreground">Craft, edit, and publish your lessons.</p>
        </div>
        <Button onClick={onCreate}>
          <Sparkles className="h-4 w-4" /> New lesson
        </Button>
      </div>

      <Card className="card-soft">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search lessons…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center mt-6">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No lessons here yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Start with a blank canvas and add blocks as you go.
              </p>
              <Button onClick={onCreate} className="mt-5">
                Create lesson
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-lift hover:-translate-y-0.5">
                    <Link
                      to="/lessons/$id"
                      params={{ id: l.id }}
                      className="block aspect-[16/9] bg-gradient-to-br from-primary/20 via-primary/10 to-accent"
                    >
                      <div className="flex h-full items-end p-4">
                        <StatusBadge status={l.status} />
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        to="/lessons/$id"
                        params={{ id: l.id }}
                        className="line-clamp-2 font-semibold hover:text-primary transition"
                      >
                        {l.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {l.description || "No description yet."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-accent px-2 py-0.5">{l.subject}</span>
                        <span className="rounded-full bg-accent px-2 py-0.5">{l.gradeLevel}</span>
                        <span className="rounded-full bg-accent px-2 py-0.5">{l.difficulty}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>Updated {formatDistanceToNow(l.updatedAt, { addSuffix: true })}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Lesson actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {l.status === "published" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/lesson/${l.slug}`,
                                  );
                                  toast.success("Link copied");
                                }}
                              >
                                <Copy className="h-4 w-4" /> Copy student link
                              </DropdownMenuItem>
                            )}
                            {l.status === "published" && (
                              <DropdownMenuItem asChild>
                                <a href={`/lesson/${l.slug}`} target="_blank" rel="noreferrer">
                                  <Eye className="h-4 w-4" /> Open student view
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                archiveLesson(l.id);
                                toast.success("Lesson archived");
                              }}
                            >
                              <Archive className="h-4 w-4" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(l.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This lesson and all its content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deleteLesson(confirmDelete);
                  toast.success("Lesson deleted");
                }
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}
