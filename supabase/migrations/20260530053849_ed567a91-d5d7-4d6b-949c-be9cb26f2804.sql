CREATE POLICY "products read anon" ON public.products FOR SELECT TO anon USING (true);
GRANT SELECT ON public.products TO anon;