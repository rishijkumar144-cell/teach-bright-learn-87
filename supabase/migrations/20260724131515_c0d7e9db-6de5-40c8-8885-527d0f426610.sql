
DROP POLICY IF EXISTS "Anyone submits to published lesson (anon)" ON public.submissions;
DROP POLICY IF EXISTS "Anyone submits to published lesson (auth)" ON public.submissions;
DROP POLICY IF EXISTS "Students update own submissions archived" ON public.submissions;

CREATE POLICY "Anon submits to published lesson"
ON public.submissions FOR INSERT TO anon
WITH CHECK (
  student_id IS NULL
  AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = submissions.lesson_id AND l.status = 'published')
);

CREATE POLICY "Authenticated submits to published lesson"
ON public.submissions FOR INSERT TO authenticated
WITH CHECK (
  (student_id IS NULL OR student_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = submissions.lesson_id AND l.status = 'published')
);

CREATE POLICY "Students update own submissions archived"
ON public.submissions FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());
