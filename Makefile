# LINE Harness - Makefile
# ============================================================

# --- 上流同期 ---
sync:  ## line-harness-oss の最新を fetch & merge
	git fetch harness main
	git merge harness/main --no-edit

# --- 開発 ---
dev:  ## Worker + Web を同時起動
	pnpm dev:worker & pnpm dev:web

dev-worker:  ## Worker のみ起動
	pnpm dev:worker

dev-web:  ## Web のみ起動
	pnpm dev:web

# --- ビルド ---
build:  ## 全パッケージビルド
	pnpm -r build

# --- デプロイ ---
deploy: deploy-worker deploy-web  ## Worker + Web 両方デプロイ

deploy-worker:  ## Worker を Cloudflare にデプロイ
	cd apps/worker && pnpm run deploy

deploy-web:  ## Web をビルド (CF Pages)
	pnpm deploy:web

# --- DB マイグレーション ---
db-migrate:  ## リモート D1 に schema.sql を適用
	cd apps/worker && npx wrangler d1 execute line-harness --remote --file=../../packages/db/schema.sql

db-migrate-local:  ## ローカル D1 に schema.sql を適用
	pnpm db:migrate:local

db-run:  ## 特定のマイグレーション実行 (例: make db-run FILE=027_dedup_delivery.sql)
	cd apps/worker && npx wrangler d1 execute line-harness --remote --file=../../packages/db/migrations/$(FILE)

# --- 同期 + デプロイ (一括) ---
upgrade: sync deploy  ## 上流同期 → デプロイ を一括実行
	@echo "✅ Upgrade complete!"

# --- Git ---
push:  ## origin main に push
	git push origin main

# --- ヘルプ ---
help:  ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: sync dev dev-worker dev-web build deploy deploy-worker deploy-web db-migrate db-migrate-local db-run upgrade push help
.DEFAULT_GOAL := help
