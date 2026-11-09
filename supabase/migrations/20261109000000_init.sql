-- Mon Petit Président — schéma initial
-- À exécuter dans Supabase : SQL Editor → coller → Run (ou `supabase db push`).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Constantes
-- ─────────────────────────────────────────────────────────────

-- Clôture du prono final : samedi 17 avril 2027, 23 h 59 heure de Paris (UTC+2).
create or replace function public.prono_lock()
returns timestamptz language sql immutable as $$
  select timestamptz '2027-04-17 23:59:59+02'
$$;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  pseudo        text not null default '' check (char_length(pseudo) <= 30),
  equipe        text not null default '' check (char_length(equipe) <= 40),
  couleur       text not null default '#1f3fbf' check (couleur ~ '^#[0-9a-fA-F]{6}$'),
  avatar        text check (char_length(avatar) <= 16),
  is_superadmin boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.leagues (
  id               uuid primary key default gen_random_uuid(),
  nom              text not null check (char_length(nom) between 1 and 60),
  code_invitation  text not null unique,
  admin_id         uuid not null references public.profiles on delete restrict,
  created_at       timestamptz not null default now()
);

create table public.league_members (
  league_id  uuid not null references public.leagues on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index on public.league_members (user_id);

create table public.candidates (
  id       text primary key check (id ~ '^[a-z0-9_-]{2,30}$'),
  nom      text not null,
  parti    text not null default '',
  couleur  text not null default '#888888' check (couleur ~ '^#[0-9a-fA-F]{6}$'),
  actif    boolean not null default true,
  ordre    int not null default 100
);

create table public.polls (
  id          bigint generated always as identity primary key,
  date        date not null,
  source      text not null default 'Votons-2027',
  url         text,
  valeurs     jsonb not null check (jsonb_typeof(valeurs) = 'object'),
  created_at  timestamptz not null default now()
);
create index on public.polls (date desc);

create table public.final_picks (
  user_id        uuid not null references public.profiles on delete cascade,
  league_id      uuid not null references public.leagues on delete cascade,
  q1             text references public.candidates,
  q2             text references public.candidates,
  gagnant        text references public.candidates,
  score_gagnant  numeric(4,1) check (score_gagnant between 50 and 100),
  scores         jsonb not null default '{}' check (jsonb_typeof(scores) = 'object'),
  capitaine      text references public.candidates,
  surprise       text references public.candidates,
  participation  numeric(4,1) check (participation between 0 and 100),
  updated_at     timestamptz not null default now(),
  primary key (user_id, league_id),
  check (q1 is null or q2 is null or q1 <> q2),
  check (gagnant is null or gagnant = q1 or gagnant = q2)
);

create table public.matchdays (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues on delete cascade,
  titre       text not null check (char_length(titre) between 1 and 80),
  ouverture   timestamptz not null default now(),
  cloture     timestamptz not null,
  created_at  timestamptz not null default now(),
  check (cloture > ouverture)
);
create index on public.matchdays (league_id, cloture);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  matchday_id    uuid not null references public.matchdays on delete cascade,
  intitule       text not null check (char_length(intitule) between 1 and 200),
  type           text not null check (type in ('choix', 'nombre')),
  -- choix  : {"choix": ["Le Pen", "Mélenchon", ...]}
  -- nombre : {"tolerance": 2, "unite": "%"}
  options        jsonb not null default '{}',
  points         numeric(5,1) not null default 10 check (points > 0 and points <= 100),
  cloture        timestamptz, -- null = clôture de la journée
  -- choix : ["Le Pen"] (plusieurs bonnes réponses possibles) · nombre : 12.5
  bonne_reponse  jsonb,
  ordre          int not null default 0
);
create index on public.questions (matchday_id);

create table public.answers (
  question_id  uuid not null references public.questions on delete cascade,
  user_id      uuid not null references public.profiles on delete cascade,
  reponse      jsonb not null,
  updated_at   timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table public.reactions (
  id          bigint generated always as identity primary key,
  league_id   uuid not null references public.leagues on delete cascade,
  -- 'general' (classement), 'final' (prono final) ou l'id d'une journée
  contexte    text not null check (char_length(contexte) <= 40),
  cible_user  uuid not null references public.profiles on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  emoji       text not null check (emoji in ('😂','🔥','🤡','👏','😱','🧠')),
  created_at  timestamptz not null default now(),
  unique (league_id, contexte, cible_user, user_id, emoji)
);

create table public.results (
  id             text primary key default 'officiel' check (id = 'officiel'),
  scores         jsonb not null default '{}' check (jsonb_typeof(scores) = 'object'),
  participation  numeric(4,2),
  gagnant        text references public.candidates,
  score_gagnant  numeric(4,2),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Fonctions d'aide (security definer : contournent la RLS pour éviter la récursion)
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_superadmin from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_member(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from league_members where league_id = p_league and user_id = auth.uid())
$$;

create or replace function public.is_league_admin(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from leagues where id = p_league and admin_id = auth.uid())
$$;

create or replace function public.matchday_league(p_matchday uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select league_id from matchdays where id = p_matchday
$$;

-- Ligue, ouverture et clôture effective d'une question
create or replace function public.question_info(p_question uuid)
returns table (league_id uuid, ouverture timestamptz, cloture timestamptz)
language sql stable security definer set search_path = public as $$
  select m.league_id, m.ouverture, coalesce(q.cloture, m.cloture)
  from questions q join matchdays m on m.id = q.matchday_id
  where q.id = p_question
$$;

create or replace function public.shares_league(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from league_members a join league_members b on a.league_id = b.league_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────

-- Crée le profil à l'inscription (pseudo par défaut = début de l'e-mail)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, pseudo)
  values (new.id, left(split_part(coalesce(new.email, 'joueur'), '@', 1), 30))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger final_picks_touch before update on public.final_picks
  for each row execute function public.touch_updated_at();
create trigger answers_touch before update on public.answers
  for each row execute function public.touch_updated_at();
create trigger results_touch before update on public.results
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- RPC
-- ─────────────────────────────────────────────────────────────

create or replace function public.gen_invite_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where code_invitation = code);
  end loop;
  return code;
end $$;

create or replace function public.create_league(p_nom text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if (select count(*) from leagues where admin_id = auth.uid()) >= 5 then
    raise exception 'Tu administres déjà 5 ligues';
  end if;
  insert into leagues (nom, code_invitation, admin_id)
  values (btrim(p_nom), gen_invite_code(), auth.uid())
  returning id into v_id;
  insert into league_members (league_id, user_id) values (v_id, auth.uid());
  return v_id;
end $$;

create or replace function public.join_league(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select id into v_id from leagues where code_invitation = upper(btrim(p_code));
  if v_id is null then raise exception 'Code d''invitation inconnu'; end if;
  if (select count(*) from league_members where league_id = v_id) >= 50 then
    raise exception 'Cette ligue est complète';
  end if;
  insert into league_members (league_id, user_id) values (v_id, auth.uid())
  on conflict do nothing;
  return v_id;
end $$;

create or replace function public.regen_invite_code(p_league uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not is_league_admin(p_league) then raise exception 'Réservé à l''admin de la ligue'; end if;
  v_code := gen_invite_code();
  update leagues set code_invitation = v_code where id = p_league;
  return v_code;
end $$;

-- Qui a déposé son prono final (sans en révéler le contenu)
create or replace function public.league_pick_status(p_league uuid)
returns table (user_id uuid, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.user_id, f.updated_at from final_picks f
  where f.league_id = p_league and is_member(p_league)
$$;

-- Qui a répondu à quelles questions (sans en révéler le contenu)
create or replace function public.league_answer_status(p_league uuid)
returns table (question_id uuid, user_id uuid)
language sql stable security definer set search_path = public as $$
  select a.question_id, a.user_id
  from answers a join questions q on q.id = a.question_id
  join matchdays m on m.id = q.matchday_id
  where m.league_id = p_league and is_member(p_league)
$$;

-- ─────────────────────────────────────────────────────────────
-- Droits (colonnes) et Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.candidates     enable row level security;
alter table public.polls          enable row level security;
alter table public.final_picks    enable row level security;
alter table public.matchdays      enable row level security;
alter table public.questions      enable row level security;
alter table public.answers        enable row level security;
alter table public.reactions      enable row level security;
alter table public.results        enable row level security;

-- Un joueur ne peut pas se promouvoir superadmin ni changer d'admin de ligue
revoke insert, update on public.profiles from anon, authenticated;
grant update (pseudo, equipe, couleur, avatar) on public.profiles to authenticated;
revoke insert, update on public.leagues from anon, authenticated;
grant update (nom) on public.leagues to authenticated;
revoke insert, update on public.league_members from anon, authenticated;

-- profiles
create policy "profils : moi et mes co-ligueurs" on public.profiles for select to authenticated
  using (id = auth.uid() or shares_league(id) or is_superadmin());
create policy "profils : je modifie le mien" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- leagues
create policy "ligues : membres" on public.leagues for select to authenticated
  using (is_member(id));
create policy "ligues : l'admin renomme" on public.leagues for update to authenticated
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());
create policy "ligues : l'admin supprime" on public.leagues for delete to authenticated
  using (admin_id = auth.uid());

-- league_members
create policy "membres : visibles des membres" on public.league_members for select to authenticated
  using (is_member(league_id));
create policy "membres : je pars ou l'admin exclut" on public.league_members for delete to authenticated
  using ((user_id = auth.uid() and not is_league_admin(league_id))
         or (is_league_admin(league_id) and user_id <> auth.uid()));

-- candidates / polls / results : lecture pour tous, écriture superadmin
create policy "candidats : lecture" on public.candidates for select using (true);
create policy "candidats : superadmin" on public.candidates for all to authenticated
  using (is_superadmin()) with check (is_superadmin());
create policy "sondages : lecture" on public.polls for select using (true);
create policy "sondages : superadmin" on public.polls for all to authenticated
  using (is_superadmin()) with check (is_superadmin());
create policy "résultats : lecture" on public.results for select using (true);
create policy "résultats : superadmin" on public.results for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- final_picks : les pronos des autres restent cachés jusqu'à la clôture
create policy "pronos : le mien, ou ceux de ma ligue après clôture" on public.final_picks
  for select to authenticated
  using (user_id = auth.uid() or (now() >= prono_lock() and is_member(league_id)));
create policy "pronos : je dépose le mien avant clôture" on public.final_picks
  for insert to authenticated
  with check (user_id = auth.uid() and is_member(league_id) and now() < prono_lock());
create policy "pronos : je modifie le mien avant clôture" on public.final_picks
  for update to authenticated
  using (user_id = auth.uid() and now() < prono_lock())
  with check (user_id = auth.uid() and is_member(league_id) and now() < prono_lock());
create policy "pronos : je retire le mien avant clôture" on public.final_picks
  for delete to authenticated
  using (user_id = auth.uid() and now() < prono_lock());

-- matchdays
create policy "journées : membres" on public.matchdays for select to authenticated
  using (is_member(league_id));
create policy "journées : admin de la ligue" on public.matchdays for all to authenticated
  using (is_league_admin(league_id)) with check (is_league_admin(league_id));

-- questions (les membres ne voient une question qu'à l'ouverture de la journée)
create policy "questions : membres après ouverture" on public.questions for select to authenticated
  using (exists (select 1 from question_info(id) qi
                 where is_league_admin(qi.league_id)
                    or (is_member(qi.league_id) and now() >= qi.ouverture)));
create policy "questions : admin de la ligue" on public.questions for all to authenticated
  using (is_league_admin(matchday_league(matchday_id)))
  with check (is_league_admin(matchday_league(matchday_id)));

-- answers : réponses des autres visibles après la clôture de la question
create policy "réponses : la mienne, ou toutes après clôture" on public.answers
  for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from question_info(question_id) qi
                    where is_member(qi.league_id) and now() >= qi.cloture));
create policy "réponses : je réponds pendant la journée" on public.answers
  for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from question_info(question_id) qi
                          where is_member(qi.league_id)
                            and now() >= qi.ouverture and now() < qi.cloture));
create policy "réponses : je modifie pendant la journée" on public.answers
  for update to authenticated
  using (user_id = auth.uid()
         and exists (select 1 from question_info(question_id) qi
                     where now() >= qi.ouverture and now() < qi.cloture))
  with check (user_id = auth.uid()
              and exists (select 1 from question_info(question_id) qi
                          where is_member(qi.league_id)
                            and now() >= qi.ouverture and now() < qi.cloture));

-- reactions
create policy "réactions : membres" on public.reactions for select to authenticated
  using (is_member(league_id));
create policy "réactions : j'ajoute les miennes" on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and is_member(league_id) and shares_league(cible_user));
create policy "réactions : je retire les miennes" on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- Les RPC ne sont appelables que par des joueurs connectés
revoke execute on function public.create_league(text), public.join_league(text),
  public.regen_invite_code(uuid), public.league_pick_status(uuid),
  public.league_answer_status(uuid) from public, anon;
grant execute on function public.create_league(text), public.join_league(text),
  public.regen_invite_code(uuid), public.league_pick_status(uuid),
  public.league_answer_status(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Données de départ
-- ─────────────────────────────────────────────────────────────

insert into public.candidates (id, nom, parti, couleur, ordre) values
  ('lepen',        'Marine Le Pen',          'RN',                   '#26357a', 1),
  ('melenchon',    'Jean-Luc Mélenchon',     'LFI',                  '#cc4a2e', 2),
  ('philippe',     'Édouard Philippe',       'Horizons',             '#2c86c9', 3),
  ('glucksmann',   'Raphaël Glucksmann',     'PS · Place publique',  '#e0457f', 4),
  ('lisnard',      'David Lisnard',          'Nouvelle Énergie',     '#5577c4', 5),
  ('retailleau',   'Bruno Retailleau',       'LR',                   '#1c58a6', 6),
  ('attal',        'Gabriel Attal',          'Renaissance',          '#e8a600', 7),
  ('cazeneuve',    'Bernard Cazeneuve',      'La Convention',        '#c46b9a', 8),
  ('zemmour',      'Éric Zemmour',           'Reconquête',           '#4b4b7a', 9),
  ('tondelier',    'Marine Tondelier',       'Les Écologistes',      '#3f9a4a', 10),
  ('villepin',     'Dominique de Villepin',  'La France humaniste',  '#8577bb', 11),
  ('roussel',      'Fabien Roussel',         'PCF',                  '#b5202b', 12),
  ('dupontaignan', 'Nicolas Dupont-Aignan',  'DLF',                  '#3b6e8f', 13),
  ('arthaud',      'Nathalie Arthaud',       'LO',                   '#8e1c1c', 14),
  ('bertrand',     'Xavier Bertrand',        'Sans étiquette',       '#6a8fb3', 15)
on conflict (id) do nothing;

insert into public.polls (date, source, url, valeurs) values
  ('2026-11-09', 'Votons-2027', 'https://votons-2027.fr/sondages',
   '{"lepen":34.0,"melenchon":17.0,"philippe":13.6,"glucksmann":12.2,"lisnard":6.4,
     "retailleau":6.3,"attal":5.7,"cazeneuve":5.0,"zemmour":4.0,"tondelier":2.8,
     "villepin":2.5,"roussel":2.1,"dupontaignan":1.9,"arthaud":0.6}');
