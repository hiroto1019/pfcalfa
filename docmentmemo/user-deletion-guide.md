# ユーザー削除ガイド

## 概要
PFCαアプリケーションでは、ユーザーが自身のアカウントを削除する際、以下の処理が行われます：

1. ユーザーの関連データ（プロフィール、食事記録、目標設定など）を削除
2. ユーザーをログアウトさせる
3. アカウントを無効化

## 制限事項
Supabaseの無料プランでは、`auth.admin.deleteUser` APIが利用できないため、完全なユーザーアカウントの削除は管理者が手動で行う必要があります。

## 管理者による完全削除の手順

### 1. Supabase管理ダッシュボードにアクセス
1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 該当するプロジェクトを選択

### 2. Authentication > Users でユーザーを確認
1. 左サイドバーから「Authentication」をクリック
2. 「Users」タブを選択
3. 削除対象のユーザーを検索

### 3. ユーザーを削除
1. 削除対象のユーザーの行をクリック
2. 「Delete user」ボタンをクリック
3. 確認ダイアログで「Delete」をクリック

## データベースの関連データについて

以下のテーブルは `ON DELETE CASCADE` が設定されているため、ユーザーが削除されると自動的に削除されます：

- `profiles` - ユーザープロフィール
- `meals` - 食事記録
- `daily_summaries` - 日次サマリー
- `goals` - 目標設定
- `daily_activity_logs` - 活動記録
- `daily_weight_logs` - 体重記録

## トラブルシューティング

### 500エラーが発生する場合
- ユーザーが既に削除されている可能性があります
- データベースの制約に問題がある可能性があります
- Supabaseの管理ダッシュボードでユーザーの状態を確認してください

### データが残っている場合
- 手動でデータベースから削除する必要があります
- 以下のSQLを実行してください：

```sql
-- ユーザーIDを指定して関連データを削除
DELETE FROM profiles WHERE id = 'ユーザーID';
DELETE FROM meals WHERE user_id = 'ユーザーID';
DELETE FROM daily_summaries WHERE user_id = 'ユーザーID';
DELETE FROM goals WHERE user_id = 'ユーザーID';
DELETE FROM daily_activity_logs WHERE user_id = 'ユーザーID';
DELETE FROM daily_weight_logs WHERE user_id = 'ユーザーID';
```

## 今後の改善案

1. **有料プランへの移行**: Supabase Proプランに移行することで、`auth.admin.deleteUser` APIが利用可能になります
2. **Webhookの実装**: ユーザー削除時に外部システムに通知するWebhookを実装
3. **削除ログの記録**: 削除操作のログを記録して監査を可能にする 