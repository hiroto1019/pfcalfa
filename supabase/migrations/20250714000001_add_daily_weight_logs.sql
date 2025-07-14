-- daily_weight_logs Table (毎日の体重記録)
CREATE TABLE public.daily_weight_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric NOT NULL,
  notes text, -- 体重に関するメモ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, date) -- 1日につき1つの記録
);
ALTER TABLE public.daily_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own weight logs."
  ON public.daily_weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 更新日時のトリガーを追加
CREATE TRIGGER update_daily_weight_logs_updated_at
  BEFORE UPDATE ON public.daily_weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 