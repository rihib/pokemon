# Champions Lab

A full-stack application running on vinext and Cloudflare Workers, with Cloudflare D1 and Drizzle support.

## Prerequisites

- Docker Engine with Docker Compose v2
- Or Node.js `>=22.13.0` for running without Docker

## Local development with Docker Compose

Cloudflare's Vite plugin starts Miniflare and `workerd` inside the application container. The `DB` binding declared in `.openai/hosting.json` is provided as a local D1 database, so local development does not require a Cloudflare account and does not access production D1 data.

Start the application:

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

Source files are bind-mounted into the container. Vite uses polling, so edits on macOS, Windows, and Linux trigger reloads. Local D1 and Wrangler state are persisted in the `wrangler_state` Docker volume.

Useful commands:

```bash
# Start in the background
docker compose up --build -d

# Follow logs
docker compose logs -f app

# Stop containers while preserving local D1 data
docker compose down

# Reset local D1 and all Wrangler state
docker compose down -v

# Reinstall dependencies after package-lock.json changes
docker compose down
docker compose build --no-cache
docker compose up
```

The public/demo surface works without ChatGPT authentication. Sign in with ChatGPT is dispatch-owned by the former Sites environment, so authenticated local flows need a separate development identity mechanism before the application can be fully independent of Sites. Do not connect local development to production D1 merely to work around authentication.

## Native local development

```bash
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

The Cloudflare Vite plugin runs Worker code locally with Miniflare/workerd and creates local bindings by default.

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` defines the application schema
- `drizzle.config.ts` supports migration generation

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from `oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. These routes must be replaced or proxied before the application can be deployed completely independently of Sites.

## Diagnostic Commands

- `npm run install:ci`: perform the bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and run tests
- `npm run validate:artifact`: recheck an existing artifact
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- Cloudflare Workers local development documentation
- Cloudflare D1 local development documentation
- vinext documentation
- Drizzle D1 guide
