create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  constraint wishes_text_length check (char_length(trim(text)) between 1 and 280),
  constraint wishes_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists wishes_approved_created_at_idx
  on public.wishes (created_at desc)
  where status = 'approved';

alter table public.wishes enable row level security;

drop policy if exists "Public can read approved wishes" on public.wishes;
create policy "Public can read approved wishes"
  on public.wishes
  for select
  to anon, authenticated
  using (status = 'approved');

grant select on table public.wishes to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.wishes;
exception
  when duplicate_object then null;
end $$;
