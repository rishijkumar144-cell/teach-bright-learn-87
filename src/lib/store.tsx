import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Block, Lesson, Submission, Teacher } from "./types";
import { lessonToUpdate, rowToLesson, rowToSubmission, slugify } from "./lessonMap";

function randomId(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function newBlockId() {
  return randomId();
}

interface StoreContext {
  hydrated: boolean;
  authReady: boolean;
  sessionUserId: string | null;
  teacher: Teacher | null;
  lessons: Lesson[];
  submissions: Submission[];
  refreshLessons: () => Promise<void>;
  refreshSubmissions: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string, role?: "teacher" | "student") => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateTeacher: (patch: Partial<Teacher>) => Promise<void>;
  createLesson: () => Promise<Lesson | null>;
  updateLesson: (id: string, patch: Partial<Lesson>) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  publishLesson: (id: string) => Promise<Lesson | null>;
  unpublishLesson: (id: string) => Promise<void>;
  archiveLesson: (id: string) => Promise<void>;
  getLesson: (id: string) => Lesson | undefined;
  gradeSubmission: (
    id: string,
    patch: {
      manualScore?: number | null;
      manualTotal?: number | null;
      feedback?: Record<string, { score?: number; comment?: string; excused?: boolean }>;
    },
  ) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

const Ctx = createContext<StoreContext | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const loadProfile = useCallback(async (userId: string, email: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    const roleValue = (roleRes.data?.role === "student" ? "student" : "teacher") as
      | "teacher"
      | "student";
    const data = profileRes.data;
    if (data) {
      setTeacher({
        id: data.id,
        email: data.email,
        displayName: data.display_name || email.split("@")[0],
        school: data.school || "",
        role: roleValue,
      });
    } else {
      setTeacher({
        id: userId,
        email,
        displayName: email.split("@")[0],
        school: "",
        role: roleValue,
      });
    }
  }, []);

  const refreshLessons = useCallback(async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setLessons((data ?? []).map(rowToLesson));
  }, []);

  const refreshSubmissions = useCallback(async () => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setSubmissions((data ?? []).map(rowToSubmission));
  }, []);

  useEffect(() => {
    setHydrated(true);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setSessionUserId(user?.id ?? null);
      if (user) {
        setTimeout(() => {
          loadProfile(user.id, user.email ?? "");
          refreshLessons();
          refreshSubmissions();
        }, 0);
      } else {
        setTeacher(null);
        setLessons([]);
        setSubmissions([]);
      }
      setAuthReady(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      setSessionUserId(user?.id ?? null);
      if (user) {
        loadProfile(user.id, user.email ?? "");
        refreshLessons();
        refreshSubmissions();
      }
      setAuthReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, refreshLessons, refreshSubmissions]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, role: "teacher" | "student" = "teacher") => {
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/${role === "student" ? "student" : "dashboard"}` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { display_name: displayName, role },
      },
    });
    return error ? { error: error.message } : {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateTeacher = useCallback(
    async (patch: Partial<Teacher>) => {
      if (!teacher) return;
      const dbPatch: Record<string, unknown> = {};
      if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
      if (patch.school !== undefined) dbPatch.school = patch.school;
      const { error } = await supabase.from("profiles").update(dbPatch as never).eq("id", teacher.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setTeacher({ ...teacher, ...patch });
    },
    [teacher],
  );

  const createLesson = useCallback(async (): Promise<Lesson | null> => {
    if (!teacher) return null;
    const slug = slugify("untitled-lesson");
    const initialBlocks: Block[] = [
      { id: randomId(), type: "heading", data: { text: "Welcome to your lesson", level: 1 } },
      {
        id: randomId(),
        type: "paragraph",
        data: { text: "Start by introducing the topic to your students." },
      },
    ];
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        owner_id: teacher.id,
        slug,
        title: "Untitled Lesson",
        blocks: initialBlocks as unknown as never,
      } as never)
      .select("*")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create lesson");
      return null;
    }
    const lesson = rowToLesson(data);
    setLessons((prev) => [lesson, ...prev]);
    return lesson;
  }, [teacher]);

  const updateLesson = useCallback(async (id: string, patch: Partial<Lesson>) => {
    const dbPatch = lessonToUpdate(patch);
    if (Object.keys(dbPatch).length === 0) return;
    setLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l)),
    );
    const { error } = await supabase.from("lessons").update(dbPatch as never).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const deleteLesson = useCallback(async (id: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const publishLesson = useCallback(
    async (id: string): Promise<Lesson | null> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("lessons")
        .update({ status: "published", published_at: now } as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Failed to publish");
        return null;
      }
      const l = rowToLesson(data);
      setLessons((prev) => prev.map((x) => (x.id === id ? l : x)));
      return l;
    },
    [],
  );

  const unpublishLesson = useCallback(async (id: string) => {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: "draft" } : l)));
    const { error } = await supabase.from("lessons").update({ status: "draft" } as never).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const archiveLesson = useCallback(async (id: string) => {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status: "archived" } : l)));
    const { error } = await supabase.from("lessons").update({ status: "archived" } as never).eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const getLesson = useCallback(
    (id: string) => lessons.find((l) => l.id === id),
    [lessons],
  );

  const gradeSubmission = useCallback(
    async (
      id: string,
      patch: {
        manualScore?: number | null;
        manualTotal?: number | null;
        feedback?: Record<string, { score?: number; comment?: string; excused?: boolean }>;
      },
    ) => {
      const dbPatch: Record<string, unknown> = { graded_at: new Date().toISOString() };
      if (patch.manualScore !== undefined) dbPatch.manual_score = patch.manualScore;
      if (patch.manualTotal !== undefined) dbPatch.manual_total = patch.manualTotal;
      if (patch.feedback !== undefined) dbPatch.feedback = patch.feedback;
      const { data, error } = await supabase
        .from("submissions")
        .update(dbPatch as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data) {
        const s = rowToSubmission(data);
        setSubmissions((prev) => prev.map((x) => (x.id === id ? s : x)));
      }
    },
    [],
  );

  const deleteSubmission = useCallback(async (id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from("submissions").delete().eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  const value = useMemo<StoreContext>(
    () => ({
      hydrated,
      authReady,
      sessionUserId,
      teacher,
      lessons,
      submissions,
      refreshLessons,
      refreshSubmissions,
      signIn,
      signUp,
      logout,
      updateTeacher,
      createLesson,
      updateLesson,
      deleteLesson,
      publishLesson,
      unpublishLesson,
      archiveLesson,
      getLesson,
      gradeSubmission,
      deleteSubmission,
    }),
    [
      hydrated,
      authReady,
      sessionUserId,
      teacher,
      lessons,
      submissions,
      refreshLessons,
      refreshSubmissions,
      signIn,
      signUp,
      logout,
      updateTeacher,
      createLesson,
      updateLesson,
      deleteLesson,
      publishLesson,
      unpublishLesson,
      archiveLesson,
      getLesson,
      gradeSubmission,
      deleteSubmission,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
