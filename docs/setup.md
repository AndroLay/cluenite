# Local setup

Run these commands from the repository root. Cluenite uses Node.js 22, pnpm 12.16.1, and PostgreSQL 18. Live broadcaster features also require a Twitch application.

## Install dependencies

Use Node.js `>=22.12.0 <23`. The repository pins pnpm 12.16.1 and checks the workspace lockfile during installation.

```powershell
npx --yes pnpm@12.16.1 install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`.env` is ignored by Git. Keep it on your machine and never paste its values into an issue, log, screenshot, or chat message.

## Configure PostgreSQL and local secrets

Create a local PostgreSQL 18 database named `cluenite` and set `DATABASE_URL` in `.env` to its connection URL. The example file contains a placeholder URL; replace the user and password with your local database credentials. The server runs any pending migrations on startup.

The session and overlay signing values must each contain at least 32 bytes. `DATA_ENCRYPTION_KEY` must be canonical base64 for exactly 32 bytes. This PowerShell snippet fills only blank key entries in `.env`; it preserves any values already present and writes generated values directly to the ignored file without displaying them:

```powershell
@'
const crypto = require("node:crypto");
const fs = require("node:fs");
let text = fs.readFileSync(".env", "utf8");
const keys = {
  SESSION_SIGNING_SECRET: () => crypto.randomBytes(32).toString("hex"),
  DATA_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString("base64"),
  OVERLAY_TOKEN_SIGNING_KEY: () => crypto.randomBytes(32).toString("hex"),
};
for (const [name, generate] of Object.entries(keys)) {
  const line = new RegExp(`^${name}=([^\r\n]*)`, "m");
  const match = text.match(line);
  if (!match) throw new Error(`Missing ${name} entry in .env`);
  if (match[1].trim() === "") text = text.replace(line, `${name}=${generate()}`);
}
fs.writeFileSync(".env", text, "utf8");
'@ | node
```

Do not enable real Twitch OAuth until all three Twitch values are set together: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, and `TWITCH_REDIRECT_URI`. Create these credentials in the Twitch developer console and register this exact local callback:

```text
http://localhost:10000/api/auth/twitch/callback
```

The application requests the `user:read:chat` scope. For production, use `https://cluenite-app.onrender.com/api/auth/twitch/callback` and register it with the production Twitch application. Never put a Twitch client secret in browser code.

## Run Cluenite

The default API port is `10000`. Vite serves the web client on `5173` and proxies API and Socket.IO traffic to that port. Keep `PUBLIC_ORIGIN` equal to the exact browser origin, including the hostname and port.

```powershell
npm run dev
```

Open `http://localhost:5173`, matching the default `PUBLIC_ORIGIN`. Check API liveness at `http://localhost:10000/health/live` and database readiness at `http://localhost:10000/health/ready`. Readiness confirms database connectivity only.

The browser practice cases can be explored without Twitch. A local `TWITCH_ADAPTER=simulation` mode is development-only; production configuration rejects it. Simulated or mocked behavior must not be presented as a real Twitch connection.

For separate processes, use `npm --prefix apps/server run dev` and `npm --prefix apps/web run dev`. If you change the API port, set `PORT` for the server and `CLUENITE_API_PORT` in the web process environment to the same number. `CLUENITE_API_PORT` is read from the shell, not from `.env`.

See [architecture](architecture.md), the [API guide](api.md), and [testing](testing.md) for behavior and verification boundaries.
