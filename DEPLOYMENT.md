# Champions Lab: local development and Cloudflare deployment

This application runs on Cloudflare Workers with Vinext, the Cloudflare Vite plugin, D1, and Google OAuth. OpenAI Sites is not required at runtime or during deployment.

## Required accounts

- Google Cloud project
- Cloudflare account with Workers and D1 available
- Node.js 22.13 or later, or Docker Desktop

## 1. Create a Google OAuth client

In Google Cloud Console:

1. Configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**.
3. Add these authorized redirect URIs:

```text
http://localhost:5173/auth/google/callback
https://YOUR_PRODUCTION_DOMAIN/auth/google/callback
```

For a `workers.dev` deployment, the production URI is similar to:

```text
https://champions-lab.YOUR_SUBDOMAIN.workers.dev/auth/google/callback
```

Record the client ID and client secret. The app requests only `openid email profile`.

## 2. Local development with Docker Compose

Create the local Worker secrets file:

```bash
cp .dev.vars.example .dev.vars
```

Fill in:

```dotenv
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
SESSION_SECRET="a-long-random-value"
```

Generate a session secret, for example:

```bash
openssl rand -base64 48
```

Start the app:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

The container applies D1 migrations to the local-only D1 database before starting Vite. Miniflare/workerd stores local D1 state in the `wrangler_state` Docker volume. It does not access production D1.

Useful commands:

```bash
# Logs
docker compose logs -f app

# Stop while retaining local D1 data
docker compose down

# Stop and delete local D1 data
docker compose down -v

# Inspect local Cloudflare resources
# Open after startup:
http://localhost:5173/cdn-cgi/explorer
```

## 3. Local development without Docker

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

## 4. Authenticate Wrangler

For an interactive local deployment:

```bash
npm run cf:login
npm run cf:whoami
```

No Cloudflare API token is required when using `wrangler login` interactively.

For CI, configure these repository secrets instead:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Use a scoped API token rather than the Global API Key. It needs Workers Scripts write access and D1 write access. Add Workers Routes or domain permissions only when the workflow manages a custom domain.

## 5. Create or provision D1

`wrangler.jsonc` declares the `DB` binding without a database ID. Current Wrangler versions can automatically provision the D1 database on the first deployment and write the generated ID back to the local configuration.

Run the first deployment:

```bash
npm run deploy
```

After D1 has been provisioned, apply the production migrations:

```bash
npm run db:migrate:remote
```

Then deploy again so the application starts against the initialized schema:

```bash
npm run deploy
```

For stricter production rollout without a temporary uninitialized deployment, create D1 first:

```bash
npx wrangler d1 create champions-lab-db
```

Copy the returned `database_id` into the `d1_databases[0]` entry in `wrangler.jsonc`, then run:

```bash
npm run db:migrate:remote
npm run deploy
```

## 6. Configure production Worker secrets

Register all required secrets through Wrangler prompts:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Do not commit `.dev.vars`, OAuth secrets, session secrets, Cloudflare tokens, or a Global API Key.

`wrangler.jsonc` declares these names as required. Deployment fails when a required secret has not been configured.

## 7. Deploy

```bash
npm ci
npm run lint
npm test
npm run db:migrate:remote
npm run deploy
```

The `deploy` script runs the Vite/Vinext production build and then `wrangler deploy`. The Cloudflare Vite plugin generates the deployment configuration that points Wrangler at the built Worker and static assets.

## 8. Custom domain

A custom domain is optional. The app can run on `workers.dev`.

When adding a custom domain:

1. Attach the domain to the Worker in Cloudflare.
2. Add `https://YOUR_DOMAIN/auth/google/callback` to the Google OAuth client's authorized redirect URIs.
3. Keep the old callback URI until traffic has fully moved.

The callback origin is derived from the incoming request, so no production origin secret is required.

## 9. GitHub Actions outline

A deployment workflow needs:

```yaml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Then run:

```bash
npm ci
npm test
npm run db:migrate:remote
npm run deploy
```

Google OAuth and session secrets are Worker runtime secrets and should be configured with `wrangler secret put`; they do not need to be exposed to the build job.

## 10. Authentication and migration behavior

- The browser session is an HMAC-signed, HttpOnly, SameSite=Lax cookie.
- OAuth uses Authorization Code flow with PKCE and a short-lived state cookie.
- Google `sub`, not the email address, is the stable external identity.
- On the first Google login, an old account with the same email can be linked to the Google identity so existing roster and team data remain available.
- Changing a Google account email does not create a new user after the `sub` has been linked.

## Troubleshooting

### `Missing required Worker secret`

Create `.dev.vars` locally, or run the three `wrangler secret put` commands for production.

### Google shows `redirect_uri_mismatch`

The URI in Google Cloud Console must exactly match the current origin plus:

```text
/auth/google/callback
```

Check scheme, hostname, port, and trailing slash.

### `no such table`

Apply migrations to the correct target:

```bash
npm run db:migrate:local   # local Miniflare D1
npm run db:migrate:remote  # production D1
```

### Reset local data

```bash
docker compose down -v
docker compose up --build
```
