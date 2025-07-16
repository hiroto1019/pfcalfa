-- Recreate the trigger function with proper permissions
DROP TRIGGER IF EXISTS on_meal_change ON public.meals;
DROP FUNCTION IF EXISTS public.update_daily_summary();

-- Recreate the function with proper permissions
CREATE OR REPLACE FUNCTION public.update_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meal_date date;
  meal_user_id uuid;
BEGIN
  -- Determine the date and user_id based on the operation
  IF (TG_OP = 'DELETE') THEN
    meal_date := OLD.created_at::date;
    meal_user_id := OLD.user_id;
  ELSE
    meal_date := NEW.created_at::date;
    meal_user_id := NEW.user_id;
  END IF;

  -- Insert or update daily_summaries
  INSERT INTO public.daily_summaries (user_id, date, total_calories, total_protein, total_fat, total_carbs)
  SELECT
    meal_user_id,
    meal_date,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(fat), 0),
    COALESCE(SUM(carbs), 0)
  FROM public.meals
  WHERE user_id = meal_user_id AND created_at::date = meal_date
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_protein = EXCLUDED.total_protein,
    total_fat = EXCLUDED.total_fat,
    total_carbs = EXCLUDED.total_carbs;

  RETURN NULL;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO anon;
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO service_role;

-- Recreate the trigger
CREATE TRIGGER on_meal_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_summary();
