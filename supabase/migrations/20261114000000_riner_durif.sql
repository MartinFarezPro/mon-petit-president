-- Mon Petit Président — ajout de Teddy Riner et Sylvain Durif
-- À exécuter dans Supabase : SQL Editor → coller → Run. Le script peut être relancé sans risque.

insert into public.candidates (id, nom, parti, couleur, ordre, photo) values
  ('riner', 'Teddy Riner',   'Sans étiquette', '#0f7b6c', 18,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Teddy_Riner_Cannes_2016.jpg/330px-Teddy_Riner_Cannes_2016.jpg'),
  ('durif', 'Sylvain Durif', 'Sans étiquette', '#b07cc6', 19,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Sylvain_Durif.jpg/330px-Sylvain_Durif.jpg')
on conflict (id) do nothing;
