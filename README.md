# AI-SME — AI-powered BI for SMEs

Full-stack business intelligence app for small/medium businesses, with a natural-language AI assistant that answers questions about real sales, inventory, and expense data.

## Stack
- **Client**: React + Vite + Tailwind CSS
- **Server**: Node.js + Express + TypeScript + Mongoose
- **Database**: MongoDB
- **AI**: Pluggable provider — OpenAI (`gpt-4o`), Anthropic (`claude-opus-4-20250514`), Google (`gemini-1.5-pro`), Groq (`llama-3.3-70b-versatile`), OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`), Mistral (`mistral-large-latest`), Cohere (`command-r-plus`) — selected per-business with user-configured API keys

## Project layout
```
/server   Express + TypeScript API, Mongoose models, AI provider layer
/client   Vite + React frontend (added in next phase)
```

## Server setup

```bash
cd server
cp .env.example .env    # then edit values
npm install
npm run dev             # tsx watch on src/index.ts
```

### Environment variables
| Name            | Purpose                                                 |
| --------------- | ------------------------------------------------------- |
| `PORT`          | HTTP port (default 4000)                                |
| `MONGODB_URI`   | MongoDB connection string                               |
| `JWT_SECRET`    | Signing secret for 8-hour JWTs                          |
| `ENCRYPTION_KEY`| AES-256-GCM key (64-hex string preferred, else SHA-256'd) |

### Auth
All routes except `/auth/*` require `Authorization: Bearer <jwt>`. The JWT carries `userId`, `businessId`, `role`, `email`; the `requireAuth` middleware attaches these to `req.auth` so controllers only ever scope Mongoose queries to the authenticated user's `businessId`.

### Route groups
| Group | Key endpoints |
| --- | --- |
| `/auth` | `POST /register`, `POST /login` |
| `/products` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/sales` | `GET /` (filter by `from`, `to`, `staffId`, `paymentMethod`), `POST /` (atomic stock decrement + inventory log) |
| `/inventory` | `GET /` (products with `currentStock`), `POST /adjust` (RESTOCK/ADJUSTMENT) |
| `/payments` | `GET /`, `POST /` |
| `/expenses` | `GET /`, `POST /` |
| `/dashboard` | `GET /summary` — aggregations for today/week/month sales, payment method split, top products, low stock, monthly expenses/net profit |
| `/ai` | `POST /query` — builds business-data context, calls selected provider, logs to `AIQueryLog` |
| `/config` | `GET /` (masked keys), `PUT /` (owner-only; encrypts API keys with AES-256-GCM) |

### AI provider abstraction
`server/src/services/ai/` exposes an `AIProvider` interface implemented by `openaiProvider`, `anthropicProvider`, `googleProvider`. `getActiveProviderConfig(businessId)` in `configService` reads the selected provider + decrypted API key from the `Config` collection and returns everything `runAIQuery` needs. Swap providers by updating `PUT /config`.

## Client setup
```bash
cd client
npm install
npm run dev          # http://localhost:5173
```
The Vite dev server proxies `/api/*` to the Express server at `http://localhost:4000`, so run the server first. Build with `npm run build`; preview with `npm run preview`.

### Pages
| Route | Purpose |
| --- | --- |
| `/login` | Sign in / register a new business (first user becomes `OWNER`) |
| `/dashboard` | KPI cards (today/week/month), recent sales, payment-method split, top products, low stock |
| `/sales` | Product search → cart → record sale; history with date and payment-method filters |
| `/inventory` | Product list with low-stock highlight, add product form, restock/adjust form |
| `/chat` | AI chat thread with model badge per response and optional date-range context picker |
| `/settings` | Provider selection, optional model override, per-provider API-key inputs (owner-only) |

Auth state lives in React context; JWT + session metadata are persisted in `localStorage`. The API client (`src/lib/api.ts`) attaches the bearer token automatically and throws `ApiError` on non-2xx responses. A `ProtectedRoute` redirects unauthenticated users to `/login`.

## Security notes
- Passwords hashed with `bcryptjs` (cost 12).
- API keys encrypted at rest with AES-256-GCM (random IV + auth tag, stored `iv:tag:ciphertext` base64).
- JWT expiry fixed at 8h.
- Every query filters by `businessId` derived from the token — never from request input.
