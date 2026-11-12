-- Mon Petit Président — le cadenas des paris
-- Chaque joueur peut verrouiller son pari quand il veut : plus c'est tôt, plus il rapporte (100 % → 50 %).
-- Un pari verrouillé ne se modifie plus. L'heure du verrou est toujours celle du serveur (impossible d'antidater).
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

alter table public.paris_reponses add column if not exists verrouille_le timestamptz;

create or replace function public.paris_cadenas()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.verrouille_le is not null then
    raise exception 'Ce pari est verrouillé';
  end if;
  if new.verrouille_le is not null then
    new.verrouille_le := now();
  end if;
  return new;
end $$;

drop trigger if exists paris_reponses_cadenas on public.paris_reponses;
create trigger paris_reponses_cadenas before insert or update on public.paris_reponses
  for each row execute function public.paris_cadenas();

-- Un pari verrouillé ne se retire pas non plus
drop policy if exists "paris : je retire avant clôture" on public.paris_reponses;
create policy "paris : je retire avant clôture" on public.paris_reponses
  for delete to authenticated
  using (user_id = auth.uid() and pari_ouvert(pari_id) and verrouille_le is null);
