# Champions Lab

Pokémon Champions向けのチーム構築・対戦支援アプリケーション。

## Runtime

- Vinext / React
- Cloudflare Workers
- Cloudflare Vite Plugin
- Cloudflare D1
- Drizzle ORM
- Google OAuth 2.0 / OpenID Connect

OpenAI Sitesは不要であり、ローカルではMiniflare/workerd、公開時はCloudflare Workersで動作する。

## Local development

```bash
cp .dev.vars.example .dev.vars
# .dev.varsへGoogle OAuth情報とSESSION_SECRETを設定

docker compose up --build
```

Open `http://localhost:5173`.

Dockerを使わない場合：

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

## Build and deploy

```bash
npm run build
npm run deploy
```

本番デプロイ前にGoogle OAuth、Worker Secrets、D1マイグレーションを設定する必要がある。

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照。

## Main commands

```bash
npm run dev                 # Cloudflareローカル環境で起動
npm run build               # Vinext/Vite本番ビルド
npm test                    # ビルドとテスト
npm run lint                # ESLint
npm run db:migrate:local    # ローカルD1へマイグレーション
npm run db:migrate:remote   # 本番D1へマイグレーション
npm run deploy              # ビルドしてWorkersへデプロイ
```

## Authentication

Google OAuth Authorization Code flowとPKCEを使用する。認証後は署名付きHttpOnly Cookieを発行し、Googleの`sub`を外部ユーザーIDとしてD1へ保存する。メールアドレスは表示・連絡用であり、永続的なユーザー識別子としては使用しない。
