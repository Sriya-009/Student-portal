# Student Portal

React, Express, Node.js, and MySQL portal for student, faculty, and administrator project workflows.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- MySQL 8 or compatible MySQL server

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   npm install --prefix frontend
   npm install --prefix backend
   ```

2. Create `backend\.env` from `backend\.env.example`. Set a unique `JWT_SECRET` (at least 32 random characters), MySQL credentials, and a local CORS origin. For cloud/production MySQL, set `DB_SSL=true` and keep `DB_SSL_REJECT_UNAUTHORIZED=true`, supplying `DB_SSL_CA` when your provider requires a CA certificate. Do not commit `.env` files.

3. Optionally create `frontend\.env` from `frontend\.env.example` and set `REACT_APP_API_URL=http://localhost:5000`.

4. Create and initialize the database in MySQL:

   ```sql
   SOURCE C:/path/to/student-portal/backend/sql/init.sql;
   ```

   The script is additive and uses `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE ... IF NOT EXISTS`; it does not drop existing tables or data. The backend also ensures workspace tables when it starts.

5. For a fresh local database, set `DEFAULT_ADMIN_IDENTIFIER` and a strong `DEFAULT_ADMIN_PASSWORD` in `backend\.env` before the first backend start. Remove those values after the administrator is created. Public signup can create student accounts only; faculty accounts must be created by an administrator.

6. Start the backend:

   ```powershell
   npm run server
   ```

   Run backend authorization tests:

   ```powershell
   npm test --prefix backend
   ```

7. Start the frontend in another terminal:

   ```powershell
   npm run client
   ```

Default URLs:

- Frontend: <http://localhost:3000>
- API health: <http://localhost:5000/api/health>

## Roles and features

- **Students:** sign up, manage their profile, view their assigned projects/tasks, submit project metadata, and view feedback.
- **Faculty:** authenticate with OTP when enabled, view assigned students/projects, manage tasks, and provide feedback.
- **Administrators:** manage users, assignments, projects, and dashboard statistics.

All private API requests require a bearer JWT. Authorization is enforced by the backend; frontend route guards are only a usability layer.

## Testing and verification

```powershell
npm run build
npm test --prefix frontend -- --watchAll=false
node --check backend\index.js
```

The repository currently has no configured backend test runner. Use a separate test database for API tests and verify invalid credentials, expired tokens, role restrictions, duplicate accounts, invalid IDs, and reset-token expiry/single-use behavior. Do not run destructive tests against production data.

MySQL-dependent checks require a reachable database configured in `backend\.env`; `/api/health` reports whether the connection is available without exposing database details.

## OTP and password reset delivery

Staff OTPs and password-reset tokens are never returned by the API. Configure the webhook provider settings in `backend\.env` (`OTP_PROVIDER_URL`, `OTP_PROVIDER_API_KEY`, `RESET_PROVIDER_URL`, and `RESET_PROVIDER_API_KEY`). The backend fails closed when delivery is not configured. The webhook receives an event name, recipient, code, and expiry timestamp and must deliver the message through a trusted SMS/email provider.

## Common problems

- **Database connection failed:** confirm MySQL is running, the schema exists, and `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are correct.
- **401 Authentication required:** log in again; the frontend stores the session token only in `sessionStorage`.
- **CORS error:** add the exact frontend origin to `CORS_ORIGINS`.
- **Faculty/admin OTP unavailable:** configure and verify the OTP delivery webhook and provider credentials.
- **Upload rejected:** profile photos must be JPEG, PNG, GIF, or WebP and no larger than 5 MB.
- **Portal Assistant:** uses the server-side Gemini OpenAI-compatible chat-completions endpoint. Configure `AI_API_KEY`, `AI_MODEL`, `AI_API_BASE_URL`, and optionally `AI_TIMEOUT_MS` in `backend\.env`; never expose the key to the frontend.

## Production requirements

- Use HTTPS for frontend, API, and uploads.
- Set a strong secret `JWT_SECRET`; never use a source-code fallback.
- Use a least-privileged MySQL account and encrypted database connections where supported.
- Set `NODE_ENV=production`, restrict `CORS_ORIGINS`, configure the OTP/reset delivery webhooks, and disable `SEED_DEMO_DATA`.
- Configure real verified password-reset and OTP delivery.
- Store uploads outside the public web root or serve them through an authenticated download endpoint.
- Rotate any credentials that were previously used with the old demo/public-IP configuration.
