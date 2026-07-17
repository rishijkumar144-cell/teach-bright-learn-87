REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_lesson_visit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_lesson_visit(TEXT) TO anon, authenticated;