# TruckMarket PH

Online marketplace for used, Japan-surplus and secondhand commercial trucks and heavy equipment in the Philippines.
Dealerships and private sellers list trucks; buyers search, chat, make offers and check availability.

Monorepo with two apps (npm workspaces):

| Folder | Stack |
|---|---|
| `web/` | Next.js (App Router) + TypeScript + Tailwind |
| `api/` | Node.js + Express + Prisma (PostgreSQL) + Socket.IO |

## Features (v1)
- Public homepage: search, trending brands, popular types, featured trucks & dealerships, latest listings
- Browse with search, filters (category, brand, price, year, condition, province, category specs) and category dropdown (26 categories)
- Listing pages: photo gallery, specs, availability status (Available / Reserved / Sold) + last-confirmed date, **Is this still available?**
- Dealership profiles (logo, cover, description, map, contact links, years in business, inventory) and the **Verified Dealer** badge (admin-only)
- Seller dashboard: manage listings, views / inquiries / offers, free-listing quota (first 4 free; one-time vs monthly is an admin setting)
- Built-in chat per listing, inbox, real-time updates (Socket.IO), website + email + browser push notifications, Messenger link
- **Make an Offer**: accept / reject / counter / withdraw (accepting does not complete a sale)
- Buyer accounts: saved trucks, offers, conversations, notifications
- Admin: users, dealerships (verify / feature), listings (hide / feature), reports, free-listing settings

## Quick start
Requires Node 20+ and PostgreSQL.

```bash
npm install
cp api/.env.example api/.env        # set DATABASE_URL, JWT_SECRET
cp web/.env.example web/.env.local
npm run db:migrate                  # create tables
npm run db:seed                     # 26 categories, brands, admin user
npm run dev:api                     # http://localhost:4000
npm run dev:web                     # http://localhost:3000
```

Seeded admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `api/.env` (**change the password**).

### Tests
```bash
cd api && npm test      # integration tests against a separate DB (TEST_DATABASE_URL, default: truckmarket_test)
```

## Configuration
`api/.env`
- `DATABASE_URL`, `JWT_SECRET` (required in production), `WEB_URL`, `API_URL` (public URL of the API; used in image URLs)
- `SMTP_*`, `MAIL_FROM` — email notifications (logged to console if unset)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — browser push (`npx web-push generate-vapid-keys`)

`web/.env.local`
- `API_URL` — server-side URL of the API (Next proxies `/api/*` to it)
- `NEXT_PUBLIC_API_URL` — public URL of the API for the Socket.IO connection

## Deployment notes
- The API needs a long-running Node host (Socket.IO). Vercel can host `web/`; run `api/` on Railway/Render/a VPS.
- Uploaded photos are stored on local disk (`api/uploads`) and resized to WebP. On hosts with ephemeral disks, swap `saveImage()` in `api/src/lib/upload.ts` for S3/Cloudinary (callers only use the returned URL).
- Browser push on iPhone only works after the site is added to the Home Screen.

## Open product decisions
- Do the 4 free listings reset periodically? (admin setting, default one-time)
- Listing prices after the free allowance, and how featured placements are paid for (admins manage placements manually in v1)
- Final list of 26 categories and their spec fields — seeded in `api/prisma/seed.ts`, the first 7 are from the brief and the rest are placeholders
- Terms / Privacy pages are starter templates and need legal review
