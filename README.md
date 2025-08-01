# PFC Alfa - 食事管理アプリ

PFC Alfaは、AIを活用した食事管理アプリケーションです。画像解析とテキスト解析により、食事の栄養成分を自動で分析し、PFC（タンパク質・脂質・炭水化物）バランスを管理できます。

## 主な機能

### 🍽️ 食事記録
- **画像解析**: 食事の写真を撮影して栄養成分を自動分析
- **テキスト解析**: 食品名を入力して栄養成分を取得
- **食品データベース検索**: 包括的な食品データベースから栄養成分を検索
- **手動入力**: 栄養成分を手動で入力・修正

### 📊 ダッシュボード
- 日別の栄養摂取量の可視化
- PFCバランスの円グラフ表示
- 体重推移のグラフ表示
- AIによる食事アドバイス

### 🎯 目標管理
- 個人の目標に基づく理想カロリー計算
- 体重目標の設定と管理
- 活動レベルの設定

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **AI**: Google Gemini API
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth

## 食品データベース機能

### 包括的な食品データベース
- **100種類以上の食品**を収録
- **カテゴリ別分類**: 主食、肉類、魚介類、野菜、果物、飲料、デザートなど
- **詳細な栄養成分**: カロリー、タンパク質、脂質、炭水化物
- **日本語対応**: 日本の食品を中心としたデータベース

### 外部データ連携（完全無料）
- **文部科学省食品成分データベース**: 日本の食品成分データ（無料）
- **カロリーSlism**: 日本のカロリー情報サイト（スクレイピング）
- **楽天レシピ**: 日本の料理レシピサイト（スクレイピング）
- **クックパッド**: 日本の料理レシピサイト（スクレイピング）
- **過去履歴検索**: ユーザーが過去に登録した食事の再利用（無料）

### スクレイピング機能について
本アプリケーションでは、クックパッドや楽天レシピから実際のレシピデータをスクレイピングして栄養成分を取得します。
- **cheerio**を使用したHTML解析
- **複数のセレクタ**による堅牢なデータ抽出
- **エラーハンドリング**とフォールバック機能
- **CORS問題の回避**のためのプロキシAPI

### 検索機能
- **食品名検索**: 部分一致による検索
- **カテゴリ検索**: 食品カテゴリ別の検索
- **栄養成分検索**: カロリー範囲や栄養成分による検索
- **類似食品提案**: 検索結果が見つからない場合の類似食品提案
- **外部サイト検索**: 複数の外部サイトからリアルタイムで食品情報を取得（無料）
- **過去履歴検索**: ユーザーが過去に登録した食事を検索・再利用（無料）

## セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/pfcalfa.git
cd pfcalfa
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8080
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google認証設定
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_client_secret_here

# GitHub認証設定
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_client_secret_here

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# 本番環境でのベースURL（デプロイ時に実際のドメインに変更）
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# 外部API連携（オプション - 現在は無効化）
# 必要に応じて有効化できます

# 楽天API（楽天レシピAPI）
# RAKUTEN_APP_ID=your_rakuten_app_id_here

# Nutritionix API
# NUTRITIONIX_APP_ID=your_nutritionix_app_id_here
# NUTRITIONIX_APP_KEY=your_nutritionix_app_key_here

# Edamam Food Database API
# EDAMAM_APP_ID=your_edamam_app_id_here
# EDAMAM_APP_KEY=your_edamam_app_key_here

# USDA Food Database API
# USDA_API_KEY=your_usda_api_key_here
```

### 4. Google認証の設定
Google認証を使用するには、Google Cloud ConsoleでOAuth 2.0クライアントを作成し、シークレットキーを取得する必要があります。

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth 2.0クライアントID」を選択
5. アプリケーションの種類を「ウェブアプリケーション」に設定
6. 承認済みのリダイレクトURIに以下を追加：
   - `http://127.0.0.1:8080/auth/v1/callback`（ローカル開発用）
   - `https://your-domain.com/auth/v1/callback`（本番環境用）
7. クライアントIDとクライアントシークレットを取得
8. `.env.local`ファイルの`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`にクライアントシークレットを設定

### 5. データベースのセットアップ
```bash
# Supabase CLIのインストール
npm install -g supabase

# データベースのマイグレーション実行
supabase db push
```

### 6. 開発サーバーの起動
```bash
npm run dev
```

## API エンドポイント

### 食品検索API
```
GET /api/food/search?q=食品名
GET /api/food/search?category=カテゴリ名
GET /api/food/search?minCalories=100&maxCalories=500
POST /api/food/search
```

### 画像解析API
```
POST /api/grok/analyze-image
```

### テキスト解析API
```
POST /api/grok/analyze-text
```

### AIアドバイスAPI
```
POST /api/grok/advice
```

## 食品データベースの拡張

### 新しい食品の追加
`src/lib/food-database.ts`の`FOOD_DATABASE`オブジェクトに新しい食品を追加：

```typescript
'新しい食品名': { 
  name: '新しい食品名', 
  calories: 100, 
  protein: 5, 
  fat: 2, 
  carbs: 15, 
  category: FOOD_CATEGORIES.カテゴリ名, 
  unit: '1個(100g)' 
}
```

### 外部APIの追加
`src/lib/external-apis.ts`に新しいAPI連携機能を追加できます。
現在は無料機能のみを有効化していますが、必要に応じて有料APIも追加可能です。

### 本番環境でのスクレイピング設定
本番環境でスクレイピング機能を使用する場合：

1. **環境変数の設定**:
   ```env
   NEXT_PUBLIC_BASE_URL=https://your-actual-domain.com
   ```

2. **CORS設定**: 本番環境のサーバーでCORSを適切に設定

3. **レート制限**: スクレイピング先のサイトの利用規約を遵守

4. **エラーハンドリング**: スクレイピング失敗時のフォールバック機能が組み込まれています

## デプロイ

### Vercelでのデプロイ
1. Vercelにプロジェクトを接続
2. 環境変数を設定
3. デプロイを実行

### その他のプラットフォーム
- Netlify
- Railway
- Heroku

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 更新履歴

### v2.0.0 (最新)
- 包括的な食品データベースの追加
- 無料外部データ連携機能の実装（文部科学省データ + スクレイピング）
- 食品検索機能の追加
- 過去履歴検索機能の追加
- UI/UXの大幅改善

### v1.0.0
- 基本的な食事記録機能
- 画像・テキスト解析機能
- ダッシュボード機能
- 認証機能
# Force deploy
