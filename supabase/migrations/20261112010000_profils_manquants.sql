-- Mon Petit Président — profils manquants
-- Un compte sans ligne dans profiles tournait en boucle sur /connexion.
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

-- 1. Rattrapage : crée le profil de chaque compte qui n'en a pas
insert into public.profiles (id, pseudo)
select u.id, left(split_part(coalesce(u.email, 'joueur'), '@', 1), 30)
from auth.users u
on conflict (id) do nothing;

-- 2. Filet de sécurité : l'app appelle cette fonction si le profil du joueur connecté manque
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into profiles (id, pseudo)
  select u.id, left(split_part(coalesce(u.email, 'joueur'), '@', 1), 30)
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
end $$;

revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;

-- 3. Vérification : doit afficher 0
select count(*) as comptes_sans_profil
from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);
