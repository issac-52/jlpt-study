alter table public.profiles drop constraint profiles_target_level_check,
  add constraint profiles_target_level_check check (target_level between 1 and 5);
