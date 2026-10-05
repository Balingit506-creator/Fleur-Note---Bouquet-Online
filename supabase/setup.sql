-- Fleur & Note: short links and photo storage on a free Supabase project.
-- Paste all of this into Supabase → SQL Editor → New query, then press Run. Safe to run again.
-- Bouquets and photos are encrypted in the visitor's browser before they arrive here; the keys
-- are only in the share links. So this database only ever holds scrambled data.

-- 1. Saved bouquets. Visitors can't read or list the table directly; they can only
--    save one bouquet (and get its id back) or fetch one bouquet by its id.
create table if not exists public.bouquets (
  id text primary key,
  body text not null check (length(body) <= 200000),
  created_at timestamptz not null default now()
);
alter table public.bouquets enable row level security;
revoke all on public.bouquets from anon, authenticated;

create or replace function public.save_bouquet(body text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
begin
  if body is null or length(body) > 200000 or body !~ '^x:' then
    raise exception 'invalid bouquet';
  end if;
  loop
    -- 10 random letters and digits
    new_id := substr(translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', 'kQx'), 1, 10);
    begin
      insert into public.bouquets (id, body) values (new_id, save_bouquet.body);
      return new_id;
    exception when unique_violation then
      -- try another id
    end;
  end loop;
end;
$$;

create or replace function public.get_bouquet(id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select b.body from public.bouquets b where b.id = get_bouquet.id;
$$;

revoke all on function public.save_bouquet(text) from public;
revoke all on function public.get_bouquet(text) from public;
grant execute on function public.save_bouquet(text) to anon, authenticated;
grant execute on function public.get_bouquet(text) to anon, authenticated;

-- 2. Photo bucket: encrypted photo files up to 5 MB. Nobody can list it, change or delete files;
--    a file opens only by its exact (random) name, and is still scrambled without the key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bouquet-photos', 'bouquet-photos', true, 5242880, array['application/octet-stream'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['application/octet-stream'];

drop policy if exists "Anyone can upload bouquet photos" on storage.objects;
create policy "Anyone can upload bouquet photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'bouquet-photos');
