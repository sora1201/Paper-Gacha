create table public.user_sync_data (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_sync_data_own_id check (user_id = auth.uid())
);

alter table public.user_sync_data enable row level security;
create policy "Users can read own sync data" on public.user_sync_data for select to authenticated using (user_id = auth.uid());
create policy "Users can insert own sync data" on public.user_sync_data for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update own sync data" on public.user_sync_data for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.set_user_sync_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger set_user_sync_updated_at before update on public.user_sync_data for each row execute function public.set_user_sync_updated_at();
