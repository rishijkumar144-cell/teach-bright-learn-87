import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Block, Lesson, StudentActivity, Teacher } from "./types";

const LS_KEY = "mathportal.v1";

interface Persisted {
  teacher: Teacher | null;
  lessons: Lesson[];
  activity: StudentActivity[];
}

const defaultState: Persisted = {
  teacher: null,
  lessons: [],
  activity: [],
};

function randomId(len = 10) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function load(): Persisted {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function save(state: Persisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

interface StoreContext {
  hydrated: boolean;
  teacher: Teacher | null;
  lessons: Lesson[];
  activity: StudentActivity[];
  login: (email: string, remember: boolean) => void;
  logout: () => void;
  updateTeacher: (patch: Partial<Teacher>) => void;
  createLesson: () => Lesson;
  updateLesson: (id: string, patch: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  publishLesson: (id: string) => Lesson | undefined;
  unpublishLesson: (id: string) => void;
  archiveLesson: (id: string) => void;
  getLesson: (id: string) => Lesson | undefined;
  getLessonBySlug: (slug: string) => Lesson | undefined;
  recordVisit: (slug: string) => void;
  recordCompletion: (slug: string, name: string) => void;
}

const Ctx = createContext<StoreContext | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  // Apply theme + accessibility classes
  useEffect(() => {
    if (!hydrated) return;
    const t = state.teacher;
    const root = document.documentElement;
    root.classList.toggle("dark", t?.theme === "dark");
    document.body.classList.toggle("dyslexia-font", !!t?.dyslexiaFont);
    document.body.classList.toggle("focus-mode", !!t?.focusMode);
  }, [state.teacher, hydrated]);

  const login = useCallback((email: string, _remember: boolean) => {
    setState((s) => ({
      ...s,
      teacher: s.teacher ?? {
        email,
        displayName: email.split("@")[0] || "Teacher",
        school: "",
        theme: "light",
        notifications: true,
        dyslexiaFont: false,
        focusMode: false,
      },
    }));
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, teacher: null }));
  }, []);

  const updateTeacher = useCallback((patch: Partial<Teacher>) => {
    setState((s) => (s.teacher ? { ...s, teacher: { ...s.teacher, ...patch } } : s));
  }, []);

  const createLesson = useCallback((): Lesson => {
    const now = Date.now();
    const lesson: Lesson = {
      id: randomId(12),
      slug: `lesson_${randomId(8)}`,
      title: "Untitled Lesson",
      description: "",
      estimatedTime: 15,
      difficulty: "Medium",
      gradeLevel: "Grade 6",
      subject: "Math",
      objectives: "",
      thumbnail: "",
      blocks: [
        { id: randomId(), type: "heading", data: { text: "Welcome to your lesson", level: 1 } },
        {
          id: randomId(),
          type: "paragraph",
          data: { text: "Start by introducing the topic to your students." },
        },
      ] as Block[],
      status: "draft",
      requireStudentName: false,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      visits: 0,
    };
    setState((s) => ({ ...s, lessons: [lesson, ...s.lessons] }));
    return lesson;
  }, []);

  const updateLesson = useCallback((id: string, patch: Partial<Lesson>) => {
    setState((s) => ({
      ...s,
      lessons: s.lessons.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l,
      ),
    }));
  }, []);

  const deleteLesson = useCallback((id: string) => {
    setState((s) => ({ ...s, lessons: s.lessons.filter((l) => l.id !== id) }));
  }, []);

  const publishLesson = useCallback((id: string) => {
    let updated: Lesson | undefined;
    setState((s) => ({
      ...s,
      lessons: s.lessons.map((l) => {
        if (l.id !== id) return l;
        updated = {
          ...l,
          slug: l.slug.startsWith("lesson_") ? l.slug : `lesson_${randomId(8)}`,
          status: "published",
          publishedAt: l.publishedAt ?? Date.now(),
          updatedAt: Date.now(),
        };
        return updated;
      }),
    }));
    return updated;
  }, []);

  const unpublishLesson = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      lessons: s.lessons.map((l) =>
        l.id === id ? { ...l, status: "draft", updatedAt: Date.now() } : l,
      ),
    }));
  }, []);

  const archiveLesson = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      lessons: s.lessons.map((l) =>
        l.id === id ? { ...l, status: "archived", updatedAt: Date.now() } : l,
      ),
    }));
  }, []);

  const getLesson = useCallback(
    (id: string) => state.lessons.find((l) => l.id === id),
    [state.lessons],
  );
  const getLessonBySlug = useCallback(
    (slug: string) => state.lessons.find((l) => l.slug === slug),
    [state.lessons],
  );

  const recordVisit = useCallback((slug: string) => {
    setState((s) => ({
      ...s,
      lessons: s.lessons.map((l) => (l.slug === slug ? { ...l, visits: l.visits + 1 } : l)),
    }));
  }, []);

  const recordCompletion = useCallback((slug: string, name: string) => {
    setState((s) => {
      const lesson = s.lessons.find((l) => l.slug === slug);
      if (!lesson) return s;
      return {
        ...s,
        activity: [
          {
            id: randomId(),
            lessonId: lesson.id,
            studentName: name || "Anonymous",
            completedAt: Date.now(),
          },
          ...s.activity,
        ].slice(0, 200),
      };
    });
  }, []);

  const value = useMemo<StoreContext>(
    () => ({
      hydrated,
      teacher: state.teacher,
      lessons: state.lessons,
      activity: state.activity,
      login,
      logout,
      updateTeacher,
      createLesson,
      updateLesson,
      deleteLesson,
      publishLesson,
      unpublishLesson,
      archiveLesson,
      getLesson,
      getLessonBySlug,
      recordVisit,
      recordCompletion,
    }),
    [
      hydrated,
      state,
      login,
      logout,
      updateTeacher,
      createLesson,
      updateLesson,
      deleteLesson,
      publishLesson,
      unpublishLesson,
      archiveLesson,
      getLesson,
      getLessonBySlug,
      recordVisit,
      recordCompletion,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function newBlockId() {
  return randomId();
}
