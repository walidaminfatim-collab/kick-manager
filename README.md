# KICK MANAGER

Premium Chrome extension (Manifest V3) + Node.js/Express API + Discord license bot, backed by MongoDB Atlas.
English and Arabic (full RTL). Unlimited connected Kick accounts.

```
extension/    Chrome extension (popup dashboard, settings page, service worker)
backend/      Express API + Mongoose models
discord-bot/  discord.js v14 bot (/license ...)
shared/       Constants shared by backend and bot
scripts/      check.js (offline verification), make-icons.js
```

## What it does (and deliberately does not do)

| Area | Behavior |
|---|---|
| Activation | Code entered in the extension is checked by the backend. Only an HMAC-SHA256 hash of each code is stored. One license is bound to one user. Expiry is re-checked on **every** API request. |
| Accounts | Official Kick OAuth (authorization code + PKCE S256 + single-use `state`). Passwords and cookies are never requested. Tokens are AES-256-GCM encrypted at rest and refreshed automatically; failed refresh marks the account *Expired* so it can be reauthorized. No account limit. |
| Streamers | Add by username or `kick.com` URL, enable/disable monitoring, live/offline status, desktop notification when a monitored streamer goes live (checked every minute). |
| Templates | CRUD in MongoDB. "Prepare" renders `{streamer}`/`{account}` for the chosen account, then **you review, copy and send it yourself** on Kick. |
| Not implemented, on purpose | Automated/bulk messaging, fake views/followers, account creation or any automation of account actions. The OAuth scopes requested are only `user:read` and `channel:read` (no `chat:write`). |

## Kick API notes (read this)

`docs.kick.com` blocks automated access, so the endpoints below were taken from the official `KickEngineering/KickDevDocs` repo and widely used client libraries, **not read live from docs.kick.com**. Please confirm them against https://docs.kick.com/ before going to production:

- Authorize: `https://id.kick.com/oauth/authorize` (PKCE required)
- Token / refresh: `POST https://id.kick.com/oauth/token`
- Revoke: `POST https://id.kick.com/oauth/revoke` (best effort here; the account is always deleted locally)
- API base: `https://api.kick.com/public/v1` (`GET /users`, `GET /channels?slug=`)
- Scopes used: `user:read`, `channel:read`

Constants live in `shared/constants.js`. If Kick changes something, that is the one place to edit. Known issue reports on the Kick docs repo mention `403` on token exchange for some apps and `invalid_scope` when a scope isn't enabled on the app, so enable `user:read` and `channel:read` in your Kick app settings. The server sends a `User-Agent` header.

## Setup

Requirements: Node.js 18.17+, a MongoDB Atlas cluster, a Discord application, a Kick developer app.

### 1. Install
```bash
npm run install:all
cp .env.example .env     # then fill it in (Windows: copy .env.example .env)
npm run icons            # optional: regenerates the extension icons
```

### 2. Fill in `.env`

| Variable | How to get it |
|---|---|
| `MONGODB_URI` | Atlas → *Connect* → *Drivers* → copy the string, add a DB name (e.g. `/kickmanager`), allow your server IP in *Network Access*. |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (must be 64 hex chars). **Never change it after users connect accounts**, or stored tokens become unreadable. |
| `LICENSE_HASH_SECRET` | any random 32+ chars (same command as JWT). Changing it invalidates all existing codes. |
| `BOT_INTERNAL_SECRET` | random 32+ chars. Same value is read by backend and bot. |
| `BACKEND_URL` | Public URL of the API, no trailing slash. `https://` is mandatory in production. |
| `EXTENSION_ID` | After loading the extension (step 5) copy its ID from `chrome://extensions`. Adds it to the CORS allowlist. |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | kick.com → Account Settings → **Developer** tab (2FA required) → create an app. |
| `KICK_REDIRECT_URI` | `BACKEND_URL` + `/api/kick/oauth/callback`. Register exactly this in your Kick app. |
| `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` | https://discord.com/developers/applications → your app → *Bot* (token) / *General Information* (Application ID). |
| `DISCORD_GUILD_ID` | Discord → Settings → Advanced → Developer Mode; right-click your server → *Copy Server ID*. |
| `ADMIN_IDS` | Comma-separated Discord user IDs (right-click user → *Copy User ID*). Only these can use `/license`. |

### 3. Start the backend
```bash
npm run start:backend      # http://localhost:3000, health check: /api/health
```

### 4. Start the Discord bot
Invite the bot with the `bot` and `applications.commands` scopes, then:
```bash
npm run deploy:commands    # registers /license in your guild (run once, and after command changes)
npm run start:bot
```
Commands (all replies are ephemeral, admin-only): `/license generate`, `/license permanent`, `/license extend`, `/license revoke`, `/license status`, `/license list`.
Temporary licenses start counting when first activated. A license is referenced by its `lic_…` ID.

### 5. Load the extension
1. Open `chrome://extensions`, enable *Developer mode*, *Load unpacked* → select the `extension/` folder.
2. If your backend is not `http://localhost:3000`, edit `BACKEND_URL` in `extension/config.js` **and** add `"https://your-api/*"` to `host_permissions` in `extension/manifest.json`, then reload the extension.
3. Put the extension ID into `EXTENSION_ID` in `.env` and restart the backend.

### 6. First run
`/license generate` in Discord → paste the code in the extension → *Connect Kick account* (opens the official Kick consent page) → add streamers → create templates.

## Deployment

- Deploy the **whole repo** (the backend imports `../shared`). Run `npm --prefix backend install --omit=dev` and `npm run start:backend`.
- Terminate TLS at the platform/reverse proxy (Render, Railway, Fly.io, Nginx...). With `NODE_ENV=production` the API refuses non-HTTPS requests and requires an `https://` `BACKEND_URL`.
- Run the bot as a separate always-on process with the same `.env` values (`BACKEND_URL` must reach the API).
- Set every secret as a platform environment variable; never commit `.env`.

## Security summary

Hashed license codes (HMAC-SHA256, 100-bit codes) · AES-256-GCM token encryption · PKCE + single-use state with 10-minute TTL · JWT HS256 pinned, 7-day expiry, license re-validated on every request · CORS allowlist · helmet · rate limits (global, activation, OAuth, internal) · zod validation · timing-safe bot-secret comparison · audit log for activations, license admin actions, account/streamer/template changes · no `innerHTML` in the extension.

Design note: re-entering a valid code on another browser logs in to the same user (needed after reinstalling). Treat codes as secrets; revoke a leaked one with `/license revoke`.

## Verification

```bash
npm run check   # syntax, internal imports, Manifest V3, EN/AR key parity (no network needed)
npm test        # crypto, license-code hashing, PKCE, input parsing, license-state logic
```

## Known limitations
- Live monitoring is polling-based (every minute while Chrome is running), not Kick webhooks.
- Kick's public API does not expose follower lists or profile pictures for channels; the UI shows what the API returns.
