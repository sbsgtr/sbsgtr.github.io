# NEXWAVE Solutions — Corporate Website & ERP Portal

Industrial technology company website and ERP dashboard for **NEXWAVE Solutions (Pvt) Ltd**, a Colombo-based industrial automation, electronics, and infrastructure engineering company operating since 2017.

---

## Project Structure

```
├── index.html                 # Root redirect → pages/index.html
├── favicon.ico                # Site favicon
├── logo.png                   # Site logo
│
├── pages/                     # Public-facing website pages
│   ├── index.html             # Homepage (hero, services, process, contact)
│   ├── login.html             # ERP authentication (email/password, Google, GitHub)
│   ├── who-we-are.html        # Company story, team, milestones
│   ├── what-we-do.html        # 8 service divisions with detailed descriptions
│   ├── our_values.html        # Core values, commitments
│   └── countdown.html         # Coming soon / maintenance mode page
│
├── erp/                       # ERP dashboard (authenticated users only)
│   ├── corporate.html         # Dashboard with KPIs, activity feed
│   ├── est_inv.html           # Estimates & Invoices management
│   ├── accounting.html        # P&L, transactions, budget tracking
│   ├── settings.html          # Profile, company info, preferences
│   └── companymgt.html        # Company overview, team, projects
│
├── shared/                    # Shared assets linked by all pages
│   ├── config.js              # Supabase credentials (CONFIG + NEXWAVE_CONFIG)
│   ├── js/
│   │   ├── public.js          # Cursor, auth, captcha, NEXi chat widget
│   │   └── erp.js             # ERP auth check, sidebar, tabs, utilities
│   └── css/
│       ├── public.css         # Public site styles (dark theme, green/lime)
│       └── erp.css            # ERP dashboard styles (light theme, sidebar)
│
├── supabase/                  # Backend (Supabase Edge Functions + DB)
│   ├── functions/gemini-chat/
│   │   └── index.ts           # NEXi AI chat — Groq API (Llama 3.3 70B)
│   └── migrations/
│       └── chat_memory.sql    # Chat persistence schema
│
├── Unwanted/                  # Archived original flat files (not deployed)
└── README.md                  # This file
```

---

## Public Website — Pages at a Glance

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/pages/index.html` | Hero, stats, about, services, process, clients, contact form, NEXi chat |
| Login | `/pages/login.html` | ERP authentication (email/password, Google OAuth, GitHub OAuth) |
| Who We Are | `/pages/who-we-are.html` | Company timeline (2017–today), team profiles, milestones |
| What We Do | `/pages/what-we-do.html` | 8 divisions: Automation, CNC, PCB, Infrastructure, Acoustics, Smart Systems, Consultancy, Hospitality |
| Our Values | `/pages/our-values.html` | 6 core values with Sanskrit quotes, 4 client commitments |
| Countdown | `/pages/countdown.html` | Maintenance mode / coming soon landing page |

---

## ERP Dashboard — Pages at a Glance

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/erp/corporate.html` | KPIs (open invoices, pending estimates, paid this month, overdue), quick links, recent activity feed |
| Estimates & Invoices | `/erp/est_inv.html` | Create/edit estimates and invoices, tabbed views, Supabase CRUD |
| Accounting | `/erp/accounting.html` | P&L summary, transaction log, budget vs actual |
| Settings | `/erp/settings.html` | Profile, company info, currency/tax/date preferences |
| Company | `/erp/companymgt.html` | Company overview, team directory, project tracking |

---

## Key Features

- **Custom cursor** with hover scaling on interactive elements
- **Scroll-triggered reveal animations** (IntersectionObserver)
- **Side menu** with auth-aware navigation (hides Login, shows ERP Dashboard + Sign Out when authenticated)
- **Supabase authentication** — email/password, Google OAuth, GitHub OAuth
- **NEXi AI Chat Widget** — persistent conversations with visitor info extraction (name, company, phone, email, project requirements). Uses **Groq API** (Llama 3.3 70B) via Supabase Edge Function. Chat history stored in PostgreSQL.
- **CAPTCHA spam protection** on contact forms
- **Maintenance mode toggle** — set `maintenance_mode = true` in Supabase `app_settings` table to redirect all non-authenticated visitors to `countdown.html`
- **ERP dashboard** — real-time KPIs, estimates/invoices CRUD, accounting P&L, settings
- **Fully responsive** — mobile hamburger menu, adaptive grid layouts

---

## 🚀 Deployment

### Static Hosting (Netlify, Vercel, Cloudflare Pages, etc.)

The public site is **fully static**. No build step required.

1. **Upload the entire project** to your static host (root = project root).
2. Ensure these files exist at the root:
   - `index.html` (auto-redirects to `pages/index.html`)
   - `favicon.ico`
   - `logo.png`
   - `pages/` (entire directory)
   - `erp/` (entire directory)
   - `shared/` (entire directory)

**Important for single-page-app routing:**  
Configure your host to serve `index.html` for any unmatched routes, OR set a rewrite rule so `/` serves `pages/index.html` internally (instead of a client-side redirect). For most hosts this isn't required since all navigation uses real HTML links.

### Custom Domain

Point your domain's DNS to your host and configure the custom domain in the host's settings.

### Supabase Backend Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run the migration** — open Supabase SQL Editor and run:
   ```sql
   -- Copy contents of supabase/migrations/chat_memory.sql
   ```
   This creates the `chat_sessions` table and RLS policies.
3. **Create `app_settings` table** (for maintenance mode):
   ```sql
   CREATE TABLE app_settings (
     id INTEGER PRIMARY KEY DEFAULT 1,
     maintenance_mode BOOLEAN DEFAULT false
   );
   INSERT INTO app_settings (id, maintenance_mode) VALUES (1, false);
   ```
4. **Deploy the Edge Function** (for NEXi Chat):
   ```bash
   # Install Supabase CLI, then:
   supabase functions deploy gemini-chat
   ```
5. **Set environment secret** in Supabase Dashboard → Edge Functions → `gemini-chat`:
   ```
   GEMINI_API_KEY = your_groq_api_key_here
   ```
   The edge function calls Groq's Llama 3.3 70B model. Get a free API key at [console.groq.com](https://console.groq.com).

### Configuring Supabase Credentials

All Supabase credentials are in `shared/config.js`:

```js
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    SUPABASE_EDGE_FUNCTION_URL: 'https://your-project.supabase.co/functions/v1'
};
```

Update these values with your own Supabase project's credentials.

---

## Authentication Flow

1. User clicks **Corporate Login** → redirected to `/pages/login.html`
2. Signs in via email/password, Google, or GitHub
3. Supabase `onAuthStateChange` listener fires:
   - Login button is hidden
   - **ERP Dashboard** link appears in nav/side menu
   - **Sign Out** button appears
   - User email shown in side menu
4. On login pages, successful auth auto-redirects to `/erp/corporate.html`
5. ERP pages check auth on load — unauthenticated users are redirected to `/pages/login.html`

---

## Maintenance Mode

Enable maintenance mode by setting `maintenance_mode = true` in the `app_settings` table:

```sql
UPDATE app_settings SET maintenance_mode = true WHERE id = 1;
```

When enabled:
- Non-authenticated visitors are redirected to `/pages/countdown.html`
- Authenticated users can still access the site normally
- Set back to `false` to restore public access

---

## Dependencies (CDN — no local packages)

- **[Font Awesome 6.5.1](https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css)** — icons
- **[Supabase JS v2](https://unpkg.com/@supabase/supabase-js@2)** — authentication & database
- **[Google Fonts](https://fonts.googleapis.com)** — Bebas Neue, Outfit, Inter, DM Mono

All loaded via CDN. No npm/pnpm/yarn install required.

---

## Development Notes

- All pages link to `../shared/css/public.css` (public) or `../shared/css/erp.css` (ERP) for shared styles. Page-specific styles are in `<style>` tags within each HTML file.
- The NEXi chat widget (`shared/js/public.js`) uses the **Groq API** (not Gemini). The comment in the code references "gemini-chat" as the Supabase function name — this is historical naming; the function actually calls Groq's Llama 3.3 70B model.
- Chat history persists via Supabase MongoDB-style JSONB columns in the `chat_sessions` table.
- The ERP pages each create their own Supabase client inline. This was done to keep each ERP page independently functional. The auth check is consolidated in `shared/js/erp.js`.
- `sized.png` and `sized2.png` (logo assets) are referenced from the original implementation. Only `logo.png` is currently at root — the sized variants are archived in `Unwanted/`.

---

## License

© 2026 NEXWAVE Solutions (Pvt) Ltd. All Rights Reserved.
