-- 既存の食事記録に対して不足しているdaily_summariesを手動で作成
-- 今日の日付のdaily_summariesが存在しない場合、mealsテーブルから集計して作成

-- 今日の日付を取得（JST）
DO $$
DECLARE
  today_date date;
BEGIN
  -- JSTで今日の日付を取得
  today_date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')::date;
  
  -- 今日の日付のdaily_summariesが存在しない場合、mealsから集計して作成
  INSERT INTO public.daily_summaries (user_id, date, total_calories, total_protein, total_fat, total_carbs)
  SELECT 
    user_id,
    today_date,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(fat), 0),
    COALESCE(SUM(carbs), 0)
  FROM public.meals
  WHERE created_at::date = today_date
  GROUP BY user_id
  ON CONFLICT (user_id, date) DO NOTHING;
  
  RAISE NOTICE 'Created daily_summaries for date: %', today_date;
END $$;
