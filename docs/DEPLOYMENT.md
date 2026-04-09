# LINE Harness デプロイガイド

## アーキテクチャ概要

```
LINE公式アカウント
  ↓ Webhook
Cloudflare Workers (API サーバー)
  ├── D1 (データベース)
  ├── R2 (画像ストレージ)
  └── Cron Triggers (定期実行)

Cloudflare Pages (管理ダッシュボード)
  └── Next.js 静的エクスポート
```

## 本番環境の構成

| コンポーネント | サービス | URL |
|---|---|---|
| API サーバー | Cloudflare Workers | `https://line-harness.foritemaqua.workers.dev` |
| データベース | Cloudflare D1 | `line-harness` (ID: `0c9f2b34-1241-4086-a77a-9a2049e7a16d`) |
| 画像ストレージ | Cloudflare R2 | `line-harness-images` |
| 管理画面 | Cloudflare Pages | `https://line-harness-admin-av1.pages.dev` |

## 環境変数・シークレット

### Worker シークレット (wrangler secret put で設定)

| 変数名 | 説明 |
|---|---|
| `API_KEY` | 管理画面とWorker間の認証キー |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API チャネルアクセストークン（長期） |
| `LINE_CHANNEL_SECRET` | Messaging API チャネルシークレット |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login チャネルID |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login チャネルシークレット |
| `WORKER_URL` | Worker の公開URL |

### Web (Pages) 環境変数

| 変数名 | 値 |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://line-harness.foritemaqua.workers.dev` |

## デプロイ手順

### 前提条件

- Node.js >= 20
- pnpm 9.15.4
- Cloudflare アカウント (`wrangler login` 済み)

### 1. Worker (API) のデプロイ

```bash
# 内部パッケージをビルド
cd packages/shared && pnpm run build
cd ../line-sdk && pnpm run build

# Worker をデプロイ
cd apps/worker && pnpm run deploy
```

### 2. Worker シークレットの設定

```bash
cd apps/worker

echo "YOUR_API_KEY" | npx wrangler secret put API_KEY
echo "YOUR_TOKEN" | npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
echo "YOUR_SECRET" | npx wrangler secret put LINE_CHANNEL_SECRET
echo "YOUR_LOGIN_ID" | npx wrangler secret put LINE_LOGIN_CHANNEL_ID
echo "YOUR_LOGIN_SECRET" | npx wrangler secret put LINE_LOGIN_CHANNEL_SECRET
echo "https://line-harness.foritemaqua.workers.dev" | npx wrangler secret put WORKER_URL
```

### 3. D1 データベースのマイグレーション

```bash
# 初回: スキーマ全体を適用
npx wrangler d1 execute line-harness --remote --file packages/db/schema.sql

# 更新時: マイグレーションファイルを適用
npx wrangler d1 execute line-harness --remote --file packages/db/migrations/XXX.sql
```

### 4. 管理画面 (Pages) のデプロイ

```bash
cd apps/web

# ビルド (NEXT_PUBLIC_API_URL をビルド時に埋め込む)
NEXT_PUBLIC_API_URL=https://line-harness.foritemaqua.workers.dev pnpm run build

# Cloudflare Pages にデプロイ
npx wrangler pages deploy out --project-name line-harness-admin
```

### 5. LINE Developers 設定

1. Messaging API チャネル → Messaging API設定
   - Webhook URL: `https://line-harness.foritemaqua.workers.dev/webhook`
   - Webhookの利用: オン
2. LINE Official Account Manager → 応答設定
   - 応答メッセージ: オフ
   - Webhook: オン

### 6. LINE アカウントのシステム登録

管理画面からアカウントを追加するか、API で登録:

```bash
curl -X POST "https://line-harness.foritemaqua.workers.dev/api/line-accounts" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "YOUR_CHANNEL_ID",
    "channelAccessToken": "YOUR_ACCESS_TOKEN",
    "channelSecret": "YOUR_CHANNEL_SECRET",
    "name": "アカウント名"
  }'
```

## LINE アカウントの切り替え

別のLINE公式アカウントに変更する場合:

1. `.env` の LINE 認証情報を更新
2. Worker シークレットを再設定 (上記手順2)
3. 新しいチャネルの Webhook URL を設定 (上記手順5)
4. 新しいアカウントをシステムに登録 (上記手順6)

## 友だちの登録について

LINE Harness は **Webhook ベース** で友だちを管理します。既存の友だちは自動取得されません。

- **新規友だち追加** → `follow` イベントで自動登録
- **既存の友だち** → ブロック → ブロック解除で `follow` イベントが再送される

## コスト

| サービス | 無料枠 |
|---|---|
| Cloudflare Workers | 10万リクエスト/日 |
| Cloudflare D1 | 500万行読み取り/日 |
| Cloudflare R2 | 10GB/月 |
| Cloudflare Pages | 無制限 |
| LINE Messaging API | 200通/月 (コミュニケーションプラン) |

サーバー代は基本無料。LINE の配信メッセージ数に応じた料金のみ。

## トラブルシューティング

### Webhook が届かない
- LINE Developers で Webhook URL と「Webhookの利用」を確認
- `npx wrangler tail --format pretty` でリアルタイムログを確認

### 友だちが表示されない
- LINE アカウントがシステムに登録されているか確認: `GET /api/line-accounts`
- 友だちはWebhook経由で登録される（既存友だちはブロック→解除が必要）

### 署名検証エラー
- DB に登録した `channelSecret` と LINE Developers の値が一致しているか確認
