-- Mon Petit Président — deux verrouillages pour les paris
-- Parrainages : clos le 31 janvier. Scrutin : clos au début de la campagne officielle (lundi 5 avril 2027, 0 h).
-- Le prono final ne change pas (17 avril, 23 h 59). Doit rester aligné avec lib/paris.ts.
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

insert into public.paris (id, ouverture, cloture) values
  ('p500_record',         '2026-11-12 00:00+01', '2027-01-31 23:59:59+01'),
  ('nb_candidats',        '2026-11-12 00:00+01', '2027-01-31 23:59:59+01'),
  ('surcote',             '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('souscote',            '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('sous5',               '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('troisieme',           '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('plus10',              '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('ecart23',             '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('premier_elu',         '2026-11-12 00:00+01', '2027-04-04 23:59:59+02'),
  ('participation_t2',    '2026-11-12 00:00+01', '2027-04-04 23:59:59+02')
on conflict (id) do update set ouverture = excluded.ouverture, cloture = excluded.cloture;
