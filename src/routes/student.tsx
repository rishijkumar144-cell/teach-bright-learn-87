import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  GraduationCap,
  LogOut,
  BookOpen,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Gamepad2,
  Link2,
  ArrowRight,
  Loader2,
  Send,
  Trophy,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { rowToLesson } from "@/lib/lessonMap";
import type { Lesson } from "@/lib/types";
import { analyzeMyProgress, studyChat } from "@/lib/ai.functions";
import { GamesHub } from "@/components/student/Games";
import { ParagraphWithMath } from "@/components/teacher/BlockEditor";

export const Route = createFileRoute("/student")({
  component: StudentPortal,
});

function StudentPortal() {
  const { teacher, authReady, sessionUserId, submissions, logout } = useStore();
  const navigate = useNavigate();
  const profileLoading = !!sessionUserId && !teacher;

  useEffect(() => {
    if (authReady && !sessionUserId) navigate({ to: "/login" });
    if (authReady && teacher && teacher.role !== "student") navigate({ to: "/dashboard" });
  }, [authReady, teacher, sessionUserId, navigate]);

  if (!authReady || profileLoading || !teacher || teacher.role !== "student") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  const initials = teacher.displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/student" className="flex items-center gap-2 font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span>Questly <span className="font-normal text-muted-foreground">· Student</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight">{teacher.displayName}</div>
              <div className="text-xs text-muted-foreground">{teacher.email}</div>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={() => logout().then(() => navigate({ to: "/login" }))} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Welcome back, {teacher.displayName.split(" ")[0]} 👋</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your study portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You've completed <span className="font-semibold text-foreground">{submissions.length}</span> lesson{submissions.length === 1 ? "" : "s"}. Keep it up!
          </p>
        </motion.div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-5">
            <TabsTrigger value="open"><Link2 className="mr-1.5 h-4 w-4" />Open lesson</TabsTrigger>
            <TabsTrigger value="completed"><CheckCircle2 className="mr-1.5 h-4 w-4" />Completed</TabsTrigger>
            <TabsTrigger value="analyzer"><Sparkles className="mr-1.5 h-4 w-4" />Analyzer</TabsTrigger>
            <TabsTrigger value="chat"><MessageCircle className="mr-1.5 h-4 w-4" />Study buddy</TabsTrigger>
            <TabsTrigger value="games"><Gamepad2 className="mr-1.5 h-4 w-4" />Games</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-6">
            <OpenLessonTab />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <CompletedTab />
          </TabsContent>

          <TabsContent value="analyzer" className="mt-6">
            <AnalyzerTab />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <StudyChatTab />
          </TabsContent>

          <TabsContent value="games" className="mt-6">
            <GamesHub />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
// Open lesson by URL/slug
// ============================================================
function OpenLessonTab() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const extractSlug = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Try parsing as URL
    try {
      const url = new URL(trimmed);
      const m = url.pathname.match(/\/lesson\/([^/?#]+)/);
      if (m) return m[1];
    } catch {
      // not a URL — try matching path
    }
    const m = trimmed.match(/lesson\/([^/?#\s]+)/);
    if (m) return m[1];
    // Otherwise treat whole string as slug
    if (/^[a-z0-9-]+$/i.test(trimmed)) return trimmed;
    return null;
  };

  const openLesson = async () => {
    const slug = extractSlug(input);
    if (!slug) {
      toast.error("Paste the lesson link or slug from your teacher.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("lessons")
      .select("id, slug, status")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      toast.error("Lesson not found or not published. Double-check the link.");
      return;
    }
    navigate({ to: "/lesson/$slug", params: { slug: data.slug } });
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Link2 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Open a lesson</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the link your teacher shared, or the lesson slug.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://…/lesson/algebra-basics-abc123"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openLesson()}
              className="flex-1"
            />
            <Button onClick={openLesson} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Open lesson
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Your name and email are filled in automatically. Your teacher will see your submission here.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Completed lessons
// ============================================================
function CompletedTab() {
  const { submissions, archiveSubmission } = useStore();
  const [lessons, setLessons] = useState<Record<string, Lesson>>({});
  const [view, setView] = useState<"active" | "archived">("active");

  useEffect(() => {
    const ids = Array.from(new Set(submissions.map((s) => s.lessonId)));
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from("lessons").select("*").in("id", ids);
      const map: Record<string, Lesson> = {};
      for (const row of data ?? []) {
        const l = rowToLesson(row);
        map[l.id] = l;
      }
      setLessons(map);
    })();
  }, [submissions]);

  const active = submissions.filter((s) => !s.archived);
  const archived = submissions.filter((s) => s.archived);
  const list = view === "active" ? active : archived;

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as "active" | "archived")}>
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">
            {view === "active" ? "No completed lessons yet" : "Nothing archived"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "active"
              ? "Open a lesson from your teacher to get started."
              : "Archived lessons will appear here and won't be included in the analyzer."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((s) => {
            const lesson = lessons[s.lessonId];
            const auto = s.autoTotal ? `${s.autoScore}/${s.autoTotal}` : "—";
            const manual =
              s.manualTotal != null && s.manualScore != null
                ? `${((s.manualScore / Math.max(s.manualTotal, 1)) * 100).toFixed(0)}%`
                : null;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold">{lesson?.title ?? "Lesson"}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {lesson?.subject || "Lesson"} · {formatDistanceToNow(s.submittedAt, { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={s.gradedAt ? "default" : "secondary"}>
                    {s.gradedAt ? "Graded" : "Submitted"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-muted-foreground">Auto</span>
                    <span className="font-semibold">{auto}</span>
                  </div>
                  {manual && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Grade</span>
                      <span className="font-semibold">{manual}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {lesson ? (
                    <Link
                      to="/lesson/$slug"
                      params={{ slug: lesson.slug }}
                      className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                    >
                      Revisit lesson <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  ) : <span />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      archiveSubmission(s.id, !s.archived);
                      toast.success(s.archived ? "Unarchived" : "Archived");
                    }}
                  >
                    {s.archived ? (
                      <><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Unarchive</>
                    ) : (
                      <><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Analyzer
// ============================================================
function AnalyzerTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; mistakes: { lessonTitle: string; subject: string; question: string; studentAnswer: string; correctAnswer: string }[]; totalGraded: number } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await analyzeMyProgress({ data: {} });
      setResult({ summary: res.summary, mistakes: res.mistakes, totalGraded: res.totalGraded });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">What don't I understand?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Our AI reviews your completed lessons and points out the topics you should focus on.
            </p>
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze my progress
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">AI insights</h3>
            <div className="prose prose-sm mt-3 max-w-none text-foreground dark:prose-invert">
              <ParagraphWithMath text={result.summary} />
            </div>
          </Card>

          {result.mistakes.length > 0 && (
            <Card className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Questions to review ({result.mistakes.length})</h3>
              <ul className="mt-3 space-y-3">
                {result.mistakes.slice(0, 20).map((m, i) => (
                  <li key={i} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">{m.subject || "General"} · {m.lessonTitle}</div>
                    <div className="mt-1 font-semibold"><ParagraphWithMath text={m.question} /></div>
                    <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-red-500/10 p-2">
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400">Your answer</div>
                        <div><ParagraphWithMath text={m.studentAnswer} /></div>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 p-2">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Correct answer</div>
                        <div><ParagraphWithMath text={m.correctAnswer} /></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Study Buddy chat
// ============================================================
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function StudyChatTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! I'm your study buddy. Tell me a topic and I'll make practice questions for you. Try: \"Make me questions on adding fractions\" or \"Quiz me on the water cycle\"." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await studyChat({ data: { messages: nextMessages } });
      setMessages([...nextMessages, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden">
      <div className="border-b border-border/60 bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold">Study Buddy</div>
            <div className="text-xs text-muted-foreground">AI tutor · makes practice questions</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <ParagraphWithMath text={m.content} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border/60 p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask for practice questions on any topic…"
            rows={1}
            className="min-h-[42px] resize-none"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
