-- 本番環境でのdaily_summariesテーブルのRLSポリシーを完全に緩和
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view their own daily summaries." ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can insert their own daily summaries." ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can update their own daily summaries." ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can delete their own daily summaries." ON public.daily_summaries;

-- 新しい包括的なポリシーを作成（認証済みユーザーは全ての操作を許可）
CREATE POLICY "Authenticated users can manage daily summaries"
  ON public.daily_summaries
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- トリガー関数の権限も確認・修正
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_summary() TO service_role;

-- daily_summariesテーブルへの権限を明示的に付与
GRANT ALL ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO service_role;
