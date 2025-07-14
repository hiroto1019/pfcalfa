-- goals Table (目標設定)
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_weight_kg numeric NOT NULL,
  target_date date NOT NULL,
  current_weight_kg numeric NOT NULL,
  goal_type text NOT NULL, -- 'diet', 'bulk-up', 'maintain'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id) -- 1ユーザーにつき1つのアクティブな目標
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own goals."
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_activity_logs Table (毎日の活動レベル記録)
CREATE TABLE public.daily_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  activity_level integer NOT NULL, -- 1-5 (1: 座り仕事, 2: 軽い運動, 3: 中程度の運動, 4: 激しい運動, 5: 非常に激しい運動)
  notes text, -- その日の活動メモ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, date) -- 1日につき1つの記録
);
ALTER TABLE public.daily_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own activity logs."
  ON public.daily_activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 既存のprofilesテーブルに目標関連のカラムを追加
ALTER TABLE public.profiles 
ADD COLUMN goal_target_date date,
ADD COLUMN goal_notes text;

-- 更新日時を自動更新する関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 更新日時のトリガーを追加
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_activity_logs_updated_at
  BEFORE UPDATE ON public.daily_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 