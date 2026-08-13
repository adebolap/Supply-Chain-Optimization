# Aisle — Wedding Guest List & RSVP

A focused wedding-planning app: guest list, RSVP collection, seating chart,
and a countdown checklist to the big day. Free for up to 75 guests and one
event; a one-time payment unlocks unlimited guests, multi-event support, and
day-of coordinator mode. See [`docs/product-plan.md`](docs/product-plan.md)
for the market research and monetization design behind these decisions.

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- Prisma ORM + PostgreSQL
- NextAuth (Auth.js v5) — email magic link (Resend) in production, plus a
  dev-only passwordless shortcut so the app can be exercised locally without
  email credentials
- Stripe Checkout for the one-time premium unlock
- `@dnd-kit` for the drag-and-drop seating chart

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Point `DATABASE_URL` in `.env` at a Postgres database, then run the
   migration:

   ```bash
   npx prisma migrate dev
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). Sign in via the
   "Continue without email (dev only)" button on `/login` — this shortcut is
   disabled automatically when `NODE_ENV=production`.

### Environment variables

See `.env` for the full list. Required for local dev: `DATABASE_URL`,
`NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Everything else (Stripe, Resend, Twilio)
is optional locally — those features fall back to dev-only shortcuts
(simulated premium upgrade) or no-ops when unconfigured, and must be set for
a production deploy.

## Project structure

```
src/app/dashboard/w/[weddingId]/   couple-facing authenticated app
  guests/     guest list CRUD + CSV import
  checklist/  countdown checklist
  seating/    drag-and-drop seating chart
  events/     multi-event management
  settings/   plan + premium upgrade
src/app/rsvp/[slug]/               public, unauthenticated guest RSVP page
src/app/api/stripe/webhook/        Stripe checkout.session.completed handler
src/lib/actions/                   server actions (guests, rsvp, seating, ...)
prisma/schema.prisma                data model
```
