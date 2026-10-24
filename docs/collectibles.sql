-- Collectibles (Memory Spirits): tables and starting data
-- Run in the Supabase SQL Editor to rebuild from scratch.
-- Do NOT run again on a database that already has these tables.

-- Every spirit in the game 
create table public.spirits (
  id int primary key,
  name text not null,
  category text not null check (category in ('landmark', 'flower', 'animal')),
  emoji text not null
);

-- Which user found which spirit, and when
--   collected_at: filled in automatically when a row is added
--   primary key: a user cannott collect the same spirit twice
create table public.user_spirits (
  user_id uuid not null references auth.users(id) on delete cascade,
  spirit_id int not null references public.spirits(id),
  station_id text,
  collected_at timestamptz not null default now(),
  primary key (user_id, spirit_id)
);

-- Block direct browser access: data only goes through the server
alter table public.spirits enable row level security;
alter table public.user_spirits enable row level security;

-- The 50 spirits (18 landmarks, 12 flowers, 20 animals)
insert into public.spirits (id, name, category, emoji) values
  (1, 'Merlion Spirit', 'landmark', '🦁'),
  (2, 'Orchid Spirit', 'flower', '🌸'),
  (3, 'Otter Spirit', 'animal', '🦦'),
  (4, 'Hornbill Spirit', 'animal', '🐦'),
  (5, 'Marina Bay Spirit', 'landmark', '🏙️'),
  (6, 'Supertree Spirit', 'landmark', '🌳'),
  (7, 'Hawker Centre Spirit', 'landmark', '🍜'),
  (8, 'Vanda Miss Joaquim Spirit', 'flower', '🌺'),
  (9, 'Bougainvillea Spirit', 'flower', '🌷'),
  (10, 'Frangipani Spirit', 'flower', '🌼'),
  (11, 'Macaque Spirit', 'animal', '🐒'),
  (12, 'Pangolin Spirit', 'animal', '🦔'),
  (13, 'Singapore Flyer Spirit', 'landmark', '🎡'),
  (14, 'Raffles Hotel Spirit', 'landmark', '🏨'),
  (15, 'Chinatown Spirit', 'landmark', '🏮'),
  (16, 'Little India Spirit', 'landmark', '🪔'),
  (17, 'Kampong Glam Spirit', 'landmark', '🕌'),
  (18, 'Sentosa Spirit', 'landmark', '🏝️'),
  (19, 'Esplanade Spirit', 'landmark', '🎭'),
  (20, 'Botanic Gardens Spirit', 'landmark', '🌿'),
  (21, 'Jewel Waterfall Spirit', 'landmark', '💧'),
  (22, 'Pulau Ubin Spirit', 'landmark', '🚲'),
  (23, 'MRT Spirit', 'landmark', '🚇'),
  (24, 'Void Deck Spirit', 'landmark', '🏢'),
  (25, 'Dragon Playground Spirit', 'landmark', '🐉'),
  (26, 'National Gallery Spirit', 'landmark', '🖼️'),
  (27, 'Lotus Spirit', 'flower', '🪷'),
  (28, 'Hibiscus Spirit', 'flower', '🏵️'),
  (29, 'Ixora Spirit', 'flower', '💮'),
  (30, 'Torch Ginger Spirit', 'flower', '🌹'),
  (31, 'Butterfly Pea Spirit', 'flower', '🪻'),
  (32, 'Jasmine Spirit', 'flower', '🤍'),
  (33, 'Angsana Spirit', 'flower', '🌳'),
  (34, 'Heliconia Spirit', 'flower', '🦞'),
  (35, 'Kingfisher Spirit', 'animal', '🪶'),
  (36, 'Monitor Lizard Spirit', 'animal', '🦎'),
  (37, 'Mousedeer Spirit', 'animal', '🦌'),
  (38, 'Hawksbill Turtle Spirit', 'animal', '🐢'),
  (39, 'Dugong Spirit', 'animal', '🦭'),
  (40, 'Humpback Dolphin Spirit', 'animal', '🐬'),
  (41, 'Colugo Spirit', 'animal', '🦇'),
  (42, 'Sea Eagle Spirit', 'animal', '🦅'),
  (43, 'Crocodile Spirit', 'animal', '🐊'),
  (44, 'Kampong Cat Spirit', 'animal', '🐈'),
  (45, 'Birdwing Butterfly Spirit', 'animal', '🦋'),
  (46, 'Wild Boar Spirit', 'animal', '🐗'),
  (47, 'Horseshoe Crab Spirit', 'animal', '🦀'),
  (48, 'Myna Spirit', 'animal', '🐤'),
  (49, 'Leaf Monkey Spirit', 'animal', '🐵'),
  (50, 'Sea Star Spirit', 'animal', '⭐');
