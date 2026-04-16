# ai-sme server

Express + TypeScript API. See the repo root `README.md` for architecture overview.

## Scripts
- `npm run dev` — watch mode via tsx
- `npm run build` — compile to `dist/`
- `npm start` — run compiled server
- `npm run typecheck` — type-check without emitting

## First-time setup
```bash
cp .env.example .env
# set MONGODB_URI, JWT_SECRET, ENCRYPTION_KEY (64-hex recommended)
npm install
npm run dev
```

Generate a 32-byte hex `ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Registering the first account
```bash
curl -X POST http://localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"password123","businessName":"My Shop","currency":"USD"}'
```
The first user for a business is the `OWNER` and can update `/config` (API keys and provider selection). Additional `STAFF` users must be created by the owner.

## Configuring an AI provider
```bash
curl -X PUT http://localhost:4000/config \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"provider":"openai","apiKeys":{"openai":"sk-..."}}'
```
Then ask a question:
```bash
curl -X POST http://localhost:4000/ai/query \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"userQuery":"What was my best-selling product last week?"}'
```
