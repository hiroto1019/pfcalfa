-- Edge Functionがサービスロールキーを使用してデータを削除できるようにするポリシー

-- profilesテーブルのサービスロールポリシー
CREATE POLICY "Service role can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (auth.role() = 'service_role');

-- mealsテーブルのサービスロールポリシー
CREATE POLICY "Service role can delete meals"
  ON public.meals
  FOR DELETE
  USING (auth.role() = 'service_role');

-- daily_summariesテーブルのサービスロールポリシー
CREATE POLICY "Service role can delete daily_summaries"
  ON public.daily_summaries
  FOR DELETE
  USING (auth.role() = 'service_role');

-- daily_weight_logsテーブルのサービスロールポリシー（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_weight_logs') THEN
    EXECUTE 'CREATE POLICY "Service role can delete daily_weight_logs" ON public.daily_weight_logs FOR DELETE USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- activity_logsテーブルのサービスロールポリシー（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    EXECUTE 'CREATE POLICY "Service role can delete activity_logs" ON public.activity_logs FOR DELETE USING (auth.role() = ''service_role'')';
  END IF;
END $$;

-- goalsテーブルのサービスロールポリシー（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
    EXECUTE 'CREATE POLICY "Service role can delete goals" ON public.goals FOR DELETE USING (auth.role() = ''service_role'')';
  END IF;
END $$; 