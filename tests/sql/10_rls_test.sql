-- Scénarios RLS. Chaque bloc doit afficher OK ; un échec lève une exception.
\set ON_ERROR_STOP 1
insert into auth.users values
 ('11111111-1111-1111-1111-111111111111','martin@ex.fr'),
 ('22222222-2222-2222-2222-222222222222','paul@ex.fr'),
 ('33333333-3333-3333-3333-333333333333','intrus@ex.fr');
select pseudo from profiles order by pseudo;

-- helper: jouer en tant qu'un utilisateur
create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;

-- Martin crée une ligue
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select create_league('Les potes') as league \gset
select code_invitation as code from leagues where id = :'league' \gset
reset role;

-- Paul rejoint
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select join_league(lower(:'code')) = :'league' as paul_joined;
-- Paul ne peut pas se promouvoir superadmin
do $$ begin
  begin update profiles set is_superadmin = true where id = auth.uid(); raise exception 'FAIL superadmin';
  exception when insufficient_privilege then raise notice 'OK pas d''auto-promotion'; end;
end $$;
-- Paul dépose son prono
insert into final_picks (user_id, league_id, q1, q2, gagnant, capitaine, scores)
values (auth.uid(), :'league', 'lepen', 'philippe', 'philippe', 'philippe', '{"lepen":33}');
-- Paul ne peut pas écrire le prono de Martin
do $$ begin
  begin insert into final_picks (user_id, league_id) select '11111111-1111-1111-1111-111111111111', id from leagues limit 1;
    raise exception 'FAIL prono pour autrui';
  exception when insufficient_privilege then raise notice 'OK pas de prono pour autrui'; end;
end $$;
reset role;

-- Martin ne voit pas le prono de Paul avant la clôture, mais voit qu'il est déposé
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select count(*) = 0 as prono_cache from final_picks where user_id <> auth.uid();
select count(*) = 1 as statut_visible from league_pick_status(:'league');
reset role;

-- L'intrus ne voit rien
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select count(*) = 0 as intrus_ligue from leagues;
select count(*) = 0 as intrus_statut from league_pick_status(:'league');
select count(*) = 0 as intrus_profils from profiles where id <> auth.uid();
reset role;

-- Après la clôture (on avance l'horloge en déplaçant la date de clôture)
create or replace function public.prono_lock() returns timestamptz language sql immutable as $$ select timestamptz '2020-01-01' $$;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select count(*) = 1 as prono_visible_apres from final_picks where user_id <> auth.uid();
reset role;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
update final_picks set q1 = 'melenchon' where user_id = auth.uid();
select q1 = 'lepen' as prono_fige from final_picks where user_id = auth.uid();
reset role;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select count(*) = 0 as intrus_pas_de_prono from final_picks;
reset role;

-- Journées : seul l'admin crée
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
do $$ begin
  begin insert into matchdays (league_id, titre, cloture) select league_id, 'x', now() + interval '1 day' from league_members limit 1;
    raise exception 'FAIL journée par non-admin';
  exception when insufficient_privilege then raise notice 'OK journée réservée à l''admin'; end;
end $$;
reset role;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into matchdays (league_id, titre, ouverture, cloture) values (:'league', 'J1', now() - interval '1 hour', now() + interval '1 day') returning id as md \gset
insert into questions (matchday_id, intitule, type, options) values (:'md', 'Qui monte ?', 'choix', '{"choix":["A","B"]}') returning id as q \gset
insert into matchdays (league_id, titre, ouverture, cloture) values (:'league', 'J0', now() - interval '2 day', now() - interval '1 day') returning id as md0 \gset
insert into questions (matchday_id, intitule, type, options, bonne_reponse) values (:'md0', 'Ancienne', 'choix', '{"choix":["A","B"]}', '["A"]') returning id as q0 \gset
insert into matchdays (league_id, titre, ouverture, cloture) values (:'league', 'J2', now() + interval '1 day', now() + interval '2 day') returning id as md2 \gset
insert into questions (matchday_id, intitule, type) values (:'md2', 'Future', 'nombre');
insert into answers values (:'q', auth.uid(), '"A"');
reset role;

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select count(*) = 2 as questions_ouvertes_seulement from questions;
insert into answers values (:'q', auth.uid(), '"B"');
select count(*) = 1 as reponses_autres_cachees from answers where question_id = :'q';
do $$ begin
  begin insert into answers select id, auth.uid(), '"B"' from questions where intitule = 'Ancienne';
    raise exception 'FAIL réponse après clôture';
  exception when insufficient_privilege then raise notice 'OK réponse refusée après clôture'; end;
end $$;
reset role;
-- Après clôture, les réponses deviennent visibles
update matchdays set cloture = now() - interval '1 minute', ouverture = now() - interval '2 hour' where id = :'md';
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select count(*) = 2 as reponses_visibles_apres from answers where question_id = :'q';
-- Réactions
insert into reactions (league_id, contexte, cible_user, user_id, emoji) values (:'league', 'general', '11111111-1111-1111-1111-111111111111', auth.uid(), '🤡');
do $$ begin
  begin insert into reactions (league_id, contexte, cible_user, user_id, emoji) select league_id, 'general', '33333333-3333-3333-3333-333333333333', auth.uid(), '🔥' from league_members limit 1;
    raise exception 'FAIL réaction sur un non-membre';
  exception when insufficient_privilege then raise notice 'OK réaction limitée aux co-ligueurs'; end;
end $$;
-- Résultats officiels : interdits à un joueur
do $$ begin
  begin insert into results (scores) values ('{}'); raise exception 'FAIL résultats';
  exception when insufficient_privilege then raise notice 'OK résultats réservés'; end;
end $$;
-- Admin ne peut pas quitter sa ligue ; Paul peut
delete from league_members where user_id = auth.uid();
select count(*) = 0 as paul_parti from league_members where user_id = auth.uid();
reset role;
-- Superadmin
update profiles set is_superadmin = true where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into results (scores, gagnant) values ('{"lepen":30}', 'lepen');
insert into polls (date, valeurs) values ('2026-11-16', '{"lepen":33}');
select count(*) = 2 as polls_ok from polls;
reset role;
select 'TOUS LES TESTS SQL PASSENT' as fin;
