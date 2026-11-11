-- Execute no SQL Editor do mesmo projeto Supabase usado pela página anterior.
create table if not exists public.colecao_hotwheels_thunt (
  user_id uuid not null references auth.users(id) on delete cascade,
  year text not null,
  category text not null check (category in ('super', 'regular')),
  mini_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, year, category, mini_id)
);
alter table public.colecao_hotwheels_thunt enable row level security;
grant select, insert, delete on table public.colecao_hotwheels_thunt to authenticated;
drop policy if exists "Usuário pode visualizar suas minis T-Hunt" on public.colecao_hotwheels_thunt;
create policy "Usuário pode visualizar suas minis T-Hunt" on public.colecao_hotwheels_thunt for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Usuário pode marcar suas minis T-Hunt" on public.colecao_hotwheels_thunt;
create policy "Usuário pode marcar suas minis T-Hunt" on public.colecao_hotwheels_thunt for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Usuário pode desmarcar suas minis T-Hunt" on public.colecao_hotwheels_thunt;
create policy "Usuário pode desmarcar suas minis T-Hunt" on public.colecao_hotwheels_thunt for delete to authenticated using ((select auth.uid()) = user_id);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'colecao_hotwheels_thunt') then
    alter publication supabase_realtime add table public.colecao_hotwheels_thunt;
  end if;
end $$;
