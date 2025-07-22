-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 新しいトリガー関数を作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
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
  VALUES (
    NEW.id,
    '',
    '',
    NULL,
    0,
    0,
    0,
    0,
    '',
    '{"dislikes": [], "allergies": []}'::jsonb,
    FALSE
  );
  RETURN NEW;
END;
$$;

-- 新しいトリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
