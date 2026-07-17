-- Utility to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Untitled Lesson',
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'Math',
  grade_level TEXT NOT NULL DEFAULT 'Grade 6',
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  estimated_time INTEGER NOT NULL DEFAULT 15,
  thumbnail TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  require_student_name BOOLEAN NOT NULL DEFAULT true,
  visits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX lessons_owner_idx ON public.lessons(owner_id);
CREATE INDEX lessons_slug_idx ON public.lessons(slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT ON public.lessons TO anon;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own lessons" ON public.lessons
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone reads published lessons (auth)" ON public.lessons
  FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "Anyone reads published lessons (anon)" ON public.lessons
  FOR SELECT TO anon USING (status = 'published');
CREATE TRIGGER lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT 'Anonymous',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_score NUMERIC,
  auto_total NUMERIC,
  manual_score NUMERIC,
  manual_total NUMERIC,
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  graded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX submissions_lesson_idx ON public.submissions(lesson_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT INSERT ON public.submissions TO anon;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Only anon can INSERT and only when the target lesson is currently published
CREATE POLICY "Anyone submits to published lesson (anon)" ON public.submissions
  FOR INSERT TO anon WITH CHECK (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.status = 'published')
  );
CREATE POLICY "Anyone submits to published lesson (auth)" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.status = 'published')
  );
CREATE POLICY "Owner reads submissions" ON public.submissions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "Owner updates submissions (grading)" ON public.submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.owner_id = auth.uid())
  );
CREATE POLICY "Owner deletes submissions" ON public.submissions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.owner_id = auth.uid())
  );

-- Visit counter RPC callable by anon (for public lesson pages)
CREATE OR REPLACE FUNCTION public.increment_lesson_visit(_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lessons SET visits = visits + 1 WHERE slug = _slug AND status = 'published';
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_lesson_visit(TEXT) TO anon, authenticated;