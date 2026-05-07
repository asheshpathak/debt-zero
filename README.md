# DebtClear — AI-Powered Debt Restructuring SaaS

A privacy-first, zero-doc debt restructuring platform powered by Claude AI. Users fill a 5-step form, Claude generates a personalised debt payoff roadmap, and the plan is unlocked after a one-time ₹299 payment via Razorpay.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| UI | shadcn/ui + Framer Motion + Recharts + Lucide |
| Auth | Firebase Authentication (Google Sign-In) |
| Backend | Node.js + Express + TypeScript |
| AI | Anthropic Claude (claude-opus-4-5) |
| Database | Supabase (PostgreSQL) |
| Payments | Razorpay |
| Deploy | Vercel (frontend) + Railway (backend) |

## Project Structure

```
debt-planner/
├── frontend/          Vite + React app (deploy to Vercel)
├── backend/           Express API (deploy to Railway)
└── supabase/
    └── migrations/    SQL schema to run in Supabase dashboard
```

## Quick Start

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`
3. Copy your **Project URL** and **service_role key**

### 2. Firebase Setup
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google sign-in**
3. Create a **Web App** — copy the config
4. Go to **Project Settings → Service Accounts** → generate a new private key (JSON)

### 3. Razorpay Setup
1. Sign up at [razorpay.com](https://razorpay.com)
2. Dashboard → Settings → API Keys → Generate key pair

### 4. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

**Backend `.env` variables:**
```
PORT=4000
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
FRONTEND_URL=http://localhost:5173

# Dev overrides (testing only — set false in production)
DEV_SKIP_AUTH=false
DEV_SKIP_PAYMENT=false
DEV_USER_ID=test-user-123
```

### 5. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in all VITE_ values
npm install
npm run dev
```

**Frontend `.env` variables:**
```
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_RAZORPAY_KEY_ID=rzp_test_xxx
```

## Development: Bypassing Auth & Payment

For local testing, set these in `backend/.env`:

```env
DEV_SKIP_AUTH=true       # Skips Firebase token verification
DEV_SKIP_PAYMENT=true    # Skips Razorpay, marks plan as paid directly
DEV_USER_ID=test-user    # User ID used when auth is skipped
```

⚠️ **Never enable these in production.**

## User Flow

```
Landing → Create Plan (form) → Claude generates plan
→ Teaser (blurred) → Google Sign-In → Razorpay ₹299 → Dashboard
```

## Deployment

### Vercel (Frontend)
1. Import `debt-planner/frontend/` as a new project
2. Framework: Vite
3. Add all `VITE_*` environment variables
4. Deploy

### Railway (Backend)
1. New project → Deploy from GitHub
2. Set root directory: `backend/`
3. Add all environment variables
4. Railway auto-detects Node.js and runs `npm start`

## License

MIT
