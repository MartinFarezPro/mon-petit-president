-- Mon Petit Président — plusieurs ligues
-- Joueur : jusqu'à 10 ligues créées (au lieu de 5), 50 joueurs par ligue.
-- Superadmin : création illimitée, et jusqu'à 500 joueurs dans les ligues qu'il administre.
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

create or replace function public.create_league(p_nom text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if not is_superadmin() and (select count(*) from leagues where admin_id = auth.uid()) >= 10 then
    raise exception 'Tu administres déjà 10 ligues';
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
  v_max int;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select l.id, case when p.is_superadmin then 500 else 50 end into v_id, v_max
  from leagues l join profiles p on p.id = l.admin_id
  where l.code_invitation = upper(btrim(p_code));
  if v_id is null then raise exception 'Code d''invitation inconnu'; end if;
  if exists (select 1 from league_members where league_id = v_id and user_id = auth.uid()) then return v_id; end if;
  if (select count(*) from league_members where league_id = v_id) >= v_max then
    raise exception 'Cette ligue est complète';
  end if;
  insert into league_members (league_id, user_id) values (v_id, auth.uid())
  on conflict do nothing;
  return v_id;
end $$;
