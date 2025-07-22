#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// 環境変数から設定を取得
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:8080';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser(userId) {
  try {
    console.log('ユーザー削除開始:', userId);

    // 関連データを削除
    const tables = [
      { name: 'exercise_logs', column: 'user_id' },
      { name: 'goals', column: 'user_id' },
      { name: 'daily_weight_logs', column: 'user_id' },
      { name: 'daily_summaries', column: 'user_id' },
      { name: 'meals', column: 'user_id' },
      { name: 'profiles', column: 'id' }
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table.name)
          .delete()
          .eq(table.column, userId);

        if (error) {
          console.log(`${table.name}削除エラー（無視）:`, error.message);
        } else {
          console.log(`${table.name}削除完了`);
        }
      } catch (err) {
        console.log(`${table.name}削除エラー（無視）:`, err.message);
      }
    }

    // Authユーザーを削除
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Authユーザー削除エラー:', deleteUserError);
      return false;
    }

    console.log('ユーザー削除完了！');
    return true;

  } catch (error) {
    console.error('エラー:', error);
    return false;
  }
}

// コマンドライン引数からユーザーIDを取得
const userId = process.argv[2];

if (!userId) {
  console.log('使用方法: node delete-user.js <ユーザーID>');
  console.log('例: node delete-user.js 0d1fc195-ef59-430a-bbf7-e571e4338081');
  process.exit(1);
}

deleteUser(userId).then(success => {
  if (success) {
    console.log('✅ 削除成功');
  } else {
    console.log('❌ 削除失敗');
    process.exit(1);
  }
}); 