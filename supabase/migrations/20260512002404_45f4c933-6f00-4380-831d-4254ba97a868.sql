
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_store(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_region(uuid)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_brand(uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_scope(text, uuid)       FROM PUBLIC, anon, authenticated;
