-- 運動記録テーブルの作成
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  exercise_type TEXT NOT NULL, -- 'cardio', 'strength', 'flexibility' など
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーの設定
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の運動記録のみアクセス可能
CREATE POLICY "Users can view their own exercise logs" ON exercise_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs" ON exercise_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs" ON exercise_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs" ON exercise_logs
  FOR DELETE USING (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_created_at ON exercise_logs(created_at);

-- 日別運動サマリーテーブルの作成
CREATE TABLE IF NOT EXISTS daily_exercise_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories_burned INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  exercise_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLSポリシーの設定
ALTER TABLE daily_exercise_summaries ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の運動サマリーのみアクセス可能
CREATE POLICY "Users can view their own exercise summaries" ON daily_exercise_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise summaries" ON daily_exercise_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise summaries" ON daily_exercise_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_daily_exercise_summaries_user_id ON daily_exercise_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_exercise_summaries_date ON daily_exercise_summaries(date);

-- 運動記録が追加された時に日別サマリーを更新するトリガー関数
CREATE OR REPLACE FUNCTION update_daily_exercise_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_exercise_summaries (user_id, date, total_calories_burned, total_duration_minutes, exercise_count)
  VALUES (
    NEW.user_id,
    DATE(NEW.created_at),
    NEW.calories_burned,
    NEW.duration_minutes,
    1
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_calories_burned = daily_exercise_summaries.total_calories_burned + NEW.calories_burned,
    total_duration_minutes = daily_exercise_summaries.total_duration_minutes + NEW.duration_minutes,
    exercise_count = daily_exercise_summaries.exercise_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_update_daily_exercise_summary
  AFTER INSERT ON exercise_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_exercise_summary();

-- 運動記録が削除された時に日別サマリーを更新するトリガー関数
CREATE OR REPLACE FUNCTION update_daily_exercise_summary_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE daily_exercise_summaries
  SET
    total_calories_burned = total_calories_burned - OLD.calories_burned,
    total_duration_minutes = total_duration_minutes - OLD.duration_minutes,
    exercise_count = exercise_count - 1,
    updated_at = NOW()
  WHERE user_id = OLD.user_id AND date = DATE(OLD.created_at);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 削除トリガーの作成
CREATE TRIGGER trigger_update_daily_exercise_summary_on_delete
  AFTER DELETE ON exercise_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_exercise_summary_on_delete(); 