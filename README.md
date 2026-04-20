# ConstructPro 🏗️
### Professional Construction Project Management System

A full-stack web application for civil engineers to manage construction projects, track BOQ progress, and export professional reports — built with **Next.js 14**, **Supabase**, and deployed on **Vercel**.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📁 Projects | Create and manage construction projects with status tracking |
| 📋 Global BOQ Library | Hierarchical Categories → Subcategories → Work Items |
| 📐 Units Manager | Pre-seeded standard units (m², m³, kg, ton, etc.) |
| 💰 BOQ Builder | Add library items to projects with contract amounts |
| 📈 Progress Tracking | Update executed amounts per item with audit snapshots |
| 📊 Dashboard | Portfolio overview with progress visualization |
| 📤 Excel Export | Export full BOQ with two sheets (detail + category summary) |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router + Server Actions)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + custom design system
- **Export**: xlsx (Excel)
- **Deployment**: Vercel

---

## 🚀 Deployment Guide

### Step 1 — Clone and install

```bash
git clone https://github.com/your-username/constructpro.git
cd constructpro
npm install
```

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (~2 min)
3. Go to **Project Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3 — Run database migrations

In your Supabase project, go to **SQL Editor** and run:

1. Paste and run `supabase/migrations/001_schema.sql` → creates all tables and views
2. Paste and run `supabase/migrations/002_seed.sql` → seeds units, categories, and work items

### Step 4 — Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Step 5 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
```

When prompted:
- Set up project: **Yes**
- Link to existing project: **No**
- Project name: `constructpro`

Then add environment variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Deploy:

```bash
vercel --prod
```

### Option B — GitHub + Vercel Dashboard (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy** — done! ✅

---

## 📂 Project Structure

```
constructpro/
├── app/
│   ├── (app)/                    # App shell with sidebar
│   │   ├── dashboard/            # Portfolio overview
│   │   ├── projects/             # Projects list + detail
│   │   │   ├── new/              # Create project
│   │   │   └── [id]/             # Project detail (BOQ, progress, add items)
│   │   ├── library/
│   │   │   ├── items/            # Global work items library
│   │   │   └── categories/       # Categories & subcategories
│   │   └── settings/
│   │       └── units/            # Units of measurement
│   ├── globals.css               # Design system & global styles
│   └── layout.tsx
├── components/
│   ├── ui/                       # Shared UI components
│   ├── layout/                   # Sidebar
│   ├── projects/                 # Project-specific components
│   ├── library/                  # Library components
│   └── settings/                 # Settings components
├── lib/
│   ├── actions/
│   │   ├── projects.ts           # Project server actions
│   │   └── library.ts            # Library server actions
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── export.ts                 # Excel BOQ export
│   └── utils.ts                  # Helpers
├── types/
│   └── index.ts                  # TypeScript types
└── supabase/
    └── migrations/
        ├── 001_schema.sql         # Full DB schema
        └── 002_seed.sql           # Seed data
```

---

## 🗄️ Database Schema

```
units                   — units of measurement
work_categories         — top-level categories (Substructure, Electrical...)
work_subcategories      — children of categories
work_items              — global library items (description, unit, rate)
projects                — construction projects
project_items           — BOQ lines (work item + contract/executed amounts)
progress_snapshots      — audit trail of progress updates
```

**Views:**
- `project_summary` — project totals and progress %
- `project_boq` — full BOQ join for display and export

---

## 📈 Adding Authentication (Optional)

The app is currently open-access (no login). To add user authentication:

1. Enable Email auth in Supabase **Authentication** settings
2. Update RLS policies to use `auth.uid()` per user
3. Add login/signup pages using `@supabase/ssr`

---

## 📝 License

MIT — built for construction professionals.
