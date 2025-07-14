
-- profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    height_cm INT,
    birth_date DATE,
    gender TEXT,
    initial_weight_kg NUMERIC(5, 2),
    activity_level INT,
    onboarding_completed BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and edit their own profile."
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- meals Table
CREATE TABLE public.meals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  calories numeric NOT NULL,
  protein numeric NOT NULL,
  fat numeric NOT NULL,
  carbs numeric NOT NULL,
  is_corrected_by_user boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own meals."
  ON public.meals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_summaries Table
CREATE TABLE public.daily_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_calories numeric DEFAULT 0,
  total_protein numeric DEFAULT 0,
  total_fat numeric DEFAULT 0,
  total_carbs numeric DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (user_id, date)
);
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily summaries."
  ON public.daily_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Function to update daily_summaries
CREATE OR REPLACE FUNCTION public.update_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  meal_date date;
  meal_user_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    meal_date := OLD.created_at::date;
    meal_user_id := OLD.user_id;
  ELSE
    meal_date := NEW.created_at::date;
    meal_user_id := NEW.user_id;
  END IF;

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

  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;

-- Trigger for meals table
CREATE TRIGGER on_meal_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_summary();
