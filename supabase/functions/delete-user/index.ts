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

    // 1. 関連データを順番に削除（エラーが発生しても続行）
    const tables = [
      { name: 'exercise_logs', column: 'user_id' },
      { name: 'goals', column: 'user_id' },
      { name: 'daily_weight_logs', column: 'user_id' },
      { name: 'daily_summaries', column: 'user_id' },
      { name: 'meals', column: 'user_id' },
      { name: 'profiles', column: 'id' }
    ]

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table.name)
          .delete()
          .eq(table.column, userId)

        if (error) {
          console.log(`${table.name}削除エラー（無視）:`, error.message)
        } else {
          console.log(`${table.name}削除完了`)
        }
      } catch (err) {
        console.log(`${table.name}削除エラー（無視）:`, err.message)
      }
    }

    console.log('データベースレベルでの削除完了')

    // 2. Authユーザーを削除
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Authユーザー削除エラー:', deleteUserError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authユーザーの削除に失敗しました',
          details: deleteUserError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Authユーザー削除完了')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ユーザーが完全に削除されました' 
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