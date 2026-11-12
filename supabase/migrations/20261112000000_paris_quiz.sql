-- Mon Petit Président — paris de la saison, parrainages, quiz « Qui a dit ? »
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

-- ─────────────────────────────────────────────────────────────
-- Données officielles utilisées pour trancher les paris automatiquement
-- ─────────────────────────────────────────────────────────────

-- Relevés des parrainages publiés par le Conseil constitutionnel (cumul par candidat).
create table if not exists public.parrainages (
  date        date primary key,
  valeurs     jsonb not null check (jsonb_typeof(valeurs) = 'object'),
  created_at  timestamptz not null default now()
);
alter table public.parrainages enable row level security;
drop policy if exists "parrainages : lecture" on public.parrainages;
create policy "parrainages : lecture" on public.parrainages for select using (true);
drop policy if exists "parrainages : superadmin" on public.parrainages;
create policy "parrainages : superadmin" on public.parrainages for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- Participation au 2nd tour (pour le pari « plus ou moins qu'au 1er tour »).
alter table public.results add column if not exists participation_t2 numeric(4,2);

-- ─────────────────────────────────────────────────────────────
-- Paris de la saison (communs à toutes les ligues)
-- Les intitulés et les règles sont dans lib/paris.ts ; la base ne garde que les dates,
-- pour refuser tout pari hors délai. Les deux doivent rester alignés.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.paris (
  id         text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  ouverture  timestamptz not null,
  cloture    timestamptz not null,
  check (cloture > ouverture)
);
alter table public.paris enable row level security;
drop policy if exists "paris : lecture" on public.paris;
create policy "paris : lecture" on public.paris for select using (true);
drop policy if exists "paris : superadmin" on public.paris;
create policy "paris : superadmin" on public.paris for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

insert into public.paris (id, ouverture, cloture) values
  ('sondage_progression', '2026-11-12 00:00+01', '2026-12-31 23:59:59+01'),
  ('sondage_podium',      '2026-11-12 00:00+01', '2026-12-31 23:59:59+01'),
  ('p500_rates',          '2026-11-12 00:00+01', '2027-01-31 23:59:59+01'),
  ('p500_premier',        '2026-11-12 00:00+01', '2027-01-31 23:59:59+01'),
  ('p500_record',         '2026-11-12 00:00+01', '2027-02-15 23:59:59+01'),
  ('nb_candidats',        '2026-11-12 00:00+01', '2027-02-15 23:59:59+01'),
  ('surcote',             '2026-11-12 00:00+01', '2027-04-11 23:59:59+02'),
  ('souscote',            '2026-11-12 00:00+01', '2027-04-11 23:59:59+02'),
  ('sous5',               '2026-11-12 00:00+01', '2027-04-17 23:59:59+02'),
  ('troisieme',           '2026-11-12 00:00+01', '2027-04-17 23:59:59+02'),
  ('plus10',              '2026-11-12 00:00+01', '2027-04-17 23:59:59+02'),
  ('ecart23',             '2026-11-12 00:00+01', '2027-04-17 23:59:59+02'),
  ('premier_elu',         '2026-11-12 00:00+01', '2027-04-17 23:59:59+02'),
  ('participation_t2',    '2026-11-12 00:00+01', '2027-05-01 23:59:59+02')
on conflict (id) do update set ouverture = excluded.ouverture, cloture = excluded.cloture;

-- Un pari par joueur, valable dans toutes ses ligues. reponse = liste d'ids (candidats ou choix).
create table if not exists public.paris_reponses (
  user_id     uuid not null references public.profiles on delete cascade,
  pari_id     text not null references public.paris on delete cascade,
  reponse     jsonb not null check (jsonb_typeof(reponse) = 'array' and jsonb_array_length(reponse) <= 30),
  updated_at  timestamptz not null default now(),
  primary key (user_id, pari_id)
);
create index if not exists paris_reponses_pari on public.paris_reponses (pari_id);

drop trigger if exists paris_reponses_touch on public.paris_reponses;
create trigger paris_reponses_touch before update on public.paris_reponses
  for each row execute function public.touch_updated_at();

create or replace function public.pari_ouvert(p_pari text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from paris where id = p_pari and now() >= ouverture and now() < cloture)
$$;

create or replace function public.pari_clos(p_pari text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from paris where id = p_pari and now() >= cloture)
$$;

alter table public.paris_reponses enable row level security;
drop policy if exists "paris : le mien, ou ceux de mes ligues après clôture" on public.paris_reponses;
create policy "paris : le mien, ou ceux de mes ligues après clôture" on public.paris_reponses
  for select to authenticated
  using (user_id = auth.uid() or (pari_clos(pari_id) and shares_league(user_id)));
drop policy if exists "paris : je parie avant clôture" on public.paris_reponses;
create policy "paris : je parie avant clôture" on public.paris_reponses
  for insert to authenticated
  with check (user_id = auth.uid() and pari_ouvert(pari_id));
drop policy if exists "paris : je change avant clôture" on public.paris_reponses;
create policy "paris : je change avant clôture" on public.paris_reponses
  for update to authenticated
  using (user_id = auth.uid() and pari_ouvert(pari_id))
  with check (user_id = auth.uid() and pari_ouvert(pari_id));
drop policy if exists "paris : je retire avant clôture" on public.paris_reponses;
create policy "paris : je retire avant clôture" on public.paris_reponses
  for delete to authenticated
  using (user_id = auth.uid() and pari_ouvert(pari_id));

-- Qui a parié (sans révéler quoi), pour la ligue
create or replace function public.league_paris_status(p_league uuid)
returns table (user_id uuid, pari_id text)
language sql stable security definer set search_path = public as $$
  select r.user_id, r.pari_id from paris_reponses r
  join league_members m on m.user_id = r.user_id and m.league_id = p_league
  where is_member(p_league)
$$;

-- ─────────────────────────────────────────────────────────────
-- Quiz « Qui a dit ? » (commun à toutes les ligues)
-- La bonne réponse n'est jamais lisible directement : on la reçoit en répondant (quiz_repondre),
-- ou pour tout le quiz une fois qu'il est clos (quiz_corrections).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.quiz (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (char_length(titre) between 1 and 80),
  ouverture   timestamptz not null,
  cloture     timestamptz not null,
  created_at  timestamptz not null default now(),
  check (cloture > ouverture)
);
create index if not exists quiz_ouverture on public.quiz (ouverture);

create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quiz on delete cascade,
  ordre          int not null default 0,
  citation       text not null check (char_length(citation) between 1 and 500),
  contexte       text not null default '' check (char_length(contexte) <= 160),
  date_citation  date,
  choix          text[] not null check (array_length(choix, 1) between 2 and 6),
  reponse        text not null,
  check (reponse = any (choix))
);
create index if not exists quiz_questions_quiz on public.quiz_questions (quiz_id, ordre);

create table if not exists public.quiz_reponses (
  question_id  uuid not null references public.quiz_questions on delete cascade,
  user_id      uuid not null references public.profiles on delete cascade,
  choix        text not null,
  created_at   timestamptz not null default now(),
  primary key (question_id, user_id)
);

create or replace function public.quiz_of(p_question uuid)
returns table (quiz_id uuid, ouverture timestamptz, cloture timestamptz)
language sql stable security definer set search_path = public as $$
  select z.id, z.ouverture, z.cloture from quiz_questions q join quiz z on z.id = q.quiz_id where q.id = p_question
$$;

alter table public.quiz           enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_reponses  enable row level security;

drop policy if exists "quiz : publiés" on public.quiz;
create policy "quiz : publiés" on public.quiz for select to authenticated
  using (now() >= ouverture or is_superadmin());
drop policy if exists "quiz : superadmin" on public.quiz;
create policy "quiz : superadmin" on public.quiz for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

drop policy if exists "questions du quiz : publiées" on public.quiz_questions;
create policy "questions du quiz : publiées" on public.quiz_questions for select to authenticated
  using (is_superadmin() or exists (select 1 from quiz_of(id) z where now() >= z.ouverture));
drop policy if exists "questions du quiz : superadmin" on public.quiz_questions;
create policy "questions du quiz : superadmin" on public.quiz_questions for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- La colonne reponse est illisible pour les joueurs (droits de colonnes)
revoke select on public.quiz_questions from anon, authenticated;
grant select (id, quiz_id, ordre, citation, contexte, date_citation, choix) on public.quiz_questions to authenticated;

drop policy if exists "réponses au quiz : les miennes, ou celles de mes ligues après clôture" on public.quiz_reponses;
create policy "réponses au quiz : les miennes, ou celles de mes ligues après clôture" on public.quiz_reponses
  for select to authenticated
  using (user_id = auth.uid()
         or (shares_league(user_id) and exists (select 1 from quiz_of(question_id) z where now() >= z.cloture)));
-- Pas d'insertion directe : on répond via quiz_repondre (une seule fois, réponse définitive)
revoke insert, update, delete on public.quiz_reponses from anon, authenticated;

-- Répondre à une question : enregistre la 1re réponse et renvoie la bonne.
create or replace function public.quiz_repondre(p_question uuid, p_choix text)
returns table (bonne text, mon_choix text)
language plpgsql security definer set search_path = public as $$
declare
  v_q quiz_questions;
  v_z quiz;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into v_q from quiz_questions where id = p_question;
  if v_q.id is null then raise exception 'Question inconnue'; end if;
  select * into v_z from quiz where id = v_q.quiz_id;
  if now() < v_z.ouverture then raise exception 'Ce quiz n''est pas encore ouvert'; end if;
  if now() >= v_z.cloture then raise exception 'Ce quiz est clos'; end if;
  if not (p_choix = any (v_q.choix)) then raise exception 'Choix inconnu'; end if;
  insert into quiz_reponses (question_id, user_id, choix) values (p_question, auth.uid(), p_choix)
  on conflict (question_id, user_id) do nothing;
  return query select v_q.reponse, r.choix from quiz_reponses r where r.question_id = p_question and r.user_id = auth.uid();
end $$;

-- Bonnes réponses visibles : questions auxquelles j'ai répondu, quiz clos, ou tout pour un superadmin.
create or replace function public.quiz_corrections()
returns table (question_id uuid, reponse text)
language sql stable security definer set search_path = public as $$
  select q.id, q.reponse from quiz_questions q join quiz z on z.id = q.quiz_id
  where auth.uid() is not null
    and (is_superadmin()
         or now() >= z.cloture
         or exists (select 1 from quiz_reponses r where r.question_id = q.id and r.user_id = auth.uid()))
$$;

revoke execute on function public.quiz_repondre(uuid, text), public.quiz_corrections(),
  public.league_paris_status(uuid) from public, anon;
grant execute on function public.quiz_repondre(uuid, text), public.quiz_corrections(),
  public.league_paris_status(uuid) to authenticated;
