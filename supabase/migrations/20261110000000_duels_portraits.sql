-- Mon Petit Président — portraits, Ruffin et Lalanne, classement par duels
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

alter table public.candidates add column if not exists photo text;
alter table public.final_picks add column if not exists classement text[] not null default '{}';

insert into public.candidates (id, nom, parti, couleur, ordre) values
  ('ruffin',  'François Ruffin', 'Debout !',       '#e2672b', 16),
  ('lalanne', 'Francis Lalanne', 'Sans étiquette', '#9a7b4f', 17)
on conflict (id) do nothing;

-- Portraits : Wikimédia Commons (licences libres), modifiables dans /admin.
update public.candidates c set photo = v.photo
from (values
  ('lepen', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Marine_Le_Pen_2025_%28cropped%29.jpg/330px-Marine_Le_Pen_2025_%28cropped%29.jpg'),
  ('melenchon', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Jean_Luc_M%C3%A9lenchon_en_mai_2026-_55261894422_%28cropped%29.jpg/330px-Jean_Luc_M%C3%A9lenchon_en_mai_2026-_55261894422_%28cropped%29.jpg'),
  ('philippe', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Edouard_Philippe_3x4_crop.jpg/330px-Edouard_Philippe_3x4_crop.jpg'),
  ('glucksmann', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/1720448398743_20240708_GLUCKSMANN_Raphael_FR_006.jpg/330px-1720448398743_20240708_GLUCKSMANN_Raphael_FR_006.jpg'),
  ('lisnard', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/David_Lisnard_en_2026.jpg/330px-David_Lisnard_en_2026.jpg'),
  ('retailleau', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais_%28cropped%29.jpg/330px-Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais_%28cropped%29.jpg'),
  ('attal', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Gabriel_Attal_2025_%28close_crop%29.jpg/330px-Gabriel_Attal_2025_%28close_crop%29.jpg'),
  ('cazeneuve', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Bernard_Cazeneuve%2C_%2842399145362%29_%28cropped%29.jpg/330px-Bernard_Cazeneuve%2C_%2842399145362%29_%28cropped%29.jpg'),
  ('zemmour', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Portrait_d%27%C3%89ric_Zemmour%2C_avril_2022.jpg/330px-Portrait_d%27%C3%89ric_Zemmour%2C_avril_2022.jpg'),
  ('tondelier', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Huma2023MarineTondelier_%28cropped%29.jpg/330px-Huma2023MarineTondelier_%28cropped%29.jpg'),
  ('villepin', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Dominique_de_Villepin_20100330_Salon_du_livre_de_Paris_2_cropped.jpg/330px-Dominique_de_Villepin_20100330_Salon_du_livre_de_Paris_2_cropped.jpg'),
  ('roussel', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Roussel_Fabien_1.jpg/330px-Roussel_Fabien_1.jpg'),
  ('dupontaignan', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Nicolas_Dupont-Aignan%2C_homme_politique_fran%C3%A7ais.jpg/330px-Nicolas_Dupont-Aignan%2C_homme_politique_fran%C3%A7ais.jpg'),
  ('arthaud', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Nathalie_Arthaud_%28LO%29_19-05-2024.jpg/330px-Nathalie_Arthaud_%28LO%29_19-05-2024.jpg'),
  ('bertrand', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Xavier_Bertrand_-_2025_%28cropped%29.jpg/330px-Xavier_Bertrand_-_2025_%28cropped%29.jpg'),
  ('ruffin', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Fran%C3%A7ois_Ruffin_%28cropped%29.jpg/330px-Fran%C3%A7ois_Ruffin_%28cropped%29.jpg'),
  ('lalanne', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Lalanne_2021_%28cropped%29.jpg/330px-Lalanne_2021_%28cropped%29.jpg')
) as v(id, photo)
where c.id = v.id and c.photo is null;
