-- ----------------------------------------------------------------------------------------------------------
-- PSEUDOCODE
-- filename:   docs/me.sql
-- purpose:    the two tables the new Me page needs (run once in the Supabase SQL Editor)
--             - profiles:      which Spirit someone picked as their picture (later: friend code for kakis)
--             - user_settings: Easier to use + Look & feel (text size, reduce motion, solid backgrounds, mood)
-- notes:      - the name stays on the login account (display_name), same as the Edit profile pop-up saves it
--             - "on delete cascade": deleting the account deletes these rows too (Delete account, admin page)
--             - RLS on with no policies = the browser can't read or write them; only our server can
--               (it uses the service role key), same as every other table
-- ----------------------------------------------------------------------------------------------------------

create table if not exists public.profiles (
    user_id          uuid primary key references auth.users (id) on delete cascade,
    avatar_spirit_id text references public.spirit_catalog (id),   -- null = show their initial
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create table if not exists public.user_settings (
    user_id           uuid primary key references auth.users (id) on delete cascade,
    text_size         text not null default 'normal' check (text_size in ('normal', 'large', 'larger')),
    reduce_motion     boolean,                                       -- null = follow the device's setting
    solid_backgrounds boolean not null default false,
    mood              text not null default 'auto' check (mood in ('auto', 'day', 'night')),
    updated_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
