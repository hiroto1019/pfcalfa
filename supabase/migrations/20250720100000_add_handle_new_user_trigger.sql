-- inserts a row into public.profiles
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    gender,
    birth_date,
    height_cm,
    initial_weight_kg,
    target_weight_kg,
    activity_level,
    goal_type,
    food_preferences,
    onboarding_completed
  )
  values (
    new.id,
    '',
    '',
    null,
    0,
    0,
    0,
    0,
    '',
    '{"dislikes": [], "allergies": []}'::jsonb,
    false
  );
  return new;
end;
$$;

-- trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 