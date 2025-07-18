import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // リクエストボディからユーザーIDを取得
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'ユーザーIDが必要です' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Supabaseクライアントを作成（サービスロールキーを使用）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('環境変数が設定されていません:', { 
        supabaseUrl: !!supabaseUrl, 
        supabaseServiceKey: !!supabaseServiceKey 
      })
      return new Response(
        JSON.stringify({ error: 'サーバー設定エラー' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('ユーザー削除開始:', userId)

    // 1. まず関連データを削除（CASCADEにより関連データも削除される）
    const { error: deleteDataError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteDataError) {
      console.error('プロフィール削除エラー:', deleteDataError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'プロフィールの削除に失敗しました',
          details: deleteDataError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('プロフィール削除完了')

    // 2. 食事記録を削除
    const { error: deleteMealsError } = await supabase
      .from('meals')
      .delete()
      .eq('user_id', userId)

    if (deleteMealsError) {
      console.error('食事記録削除エラー:', deleteMealsError)
      // 食事記録の削除エラーは致命的ではないので続行
    } else {
      console.log('食事記録削除完了')
    }

    // 3. 日次サマリーを削除
    const { error: deleteSummariesError } = await supabase
      .from('daily_summaries')
      .delete()
      .eq('user_id', userId)

    if (deleteSummariesError) {
      console.error('日次サマリー削除エラー:', deleteSummariesError)
      // 日次サマリーの削除エラーは致命的ではないので続行
    } else {
      console.log('日次サマリー削除完了')
    }

    // 4. 体重ログを削除
    const { error: deleteWeightLogsError } = await supabase
      .from('daily_weight_logs')
      .delete()
      .eq('user_id', userId)

    if (deleteWeightLogsError) {
      console.error('体重ログ削除エラー:', deleteWeightLogsError)
      // 体重ログの削除エラーは致命的ではないので続行
    } else {
      console.log('体重ログ削除完了')
    }

    // 5. 活動ログを削除
    const { error: deleteActivityLogsError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', userId)

    if (deleteActivityLogsError) {
      console.error('活動ログ削除エラー:', deleteActivityLogsError)
      // 活動ログの削除エラーは致命的ではないので続行
    } else {
      console.log('活動ログ削除完了')
    }

    // 6. 目標設定を削除
    const { error: deleteGoalsError } = await supabase
      .from('goals')
      .delete()
      .eq('user_id', userId)

    if (deleteGoalsError) {
      console.error('目標設定削除エラー:', deleteGoalsError)
      // 目標設定の削除エラーは致命的ではないので続行
    } else {
      console.log('目標設定削除完了')
    }

    // 7. Authユーザーを削除（サービスロールキーを使用）
    console.log('Authユーザー削除開始')
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Authユーザー削除エラー:', deleteUserError)
      // Authユーザーの削除に失敗した場合でも、データは削除されているので成功とする
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'データは削除されましたが、Authユーザーの削除に失敗しました。管理者による手動削除が必要です。',
          details: deleteUserError.message 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Authユーザー削除完了')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ユーザーと関連データが正常に削除されました' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge Function エラー:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'サーバーエラーが発生しました',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 