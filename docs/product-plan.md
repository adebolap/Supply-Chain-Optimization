# Product plan: market research & monetization

## Market

- Global wedding-planning-apps market ≈ **$1.07B in 2026**, growing at
  **~15.5% CAGR** toward ~$4B by 2035
  ([Business Research Insights](https://www.businessresearchinsights.com/market-reports/wedding-planning-apps-market-121664)).
- US demand: ~2M weddings/year, ~$66B total annual spend, average cost
  ~$34K (Knot 2026 Real Weddings Study;
  [Zola](https://www.zola.com/expert-advice/whats-the-average-cost-of-a-wedding)).
  Median spend (~$10K) is far below the average — a large
  budget-conscious segment exists alongside high spenders.
- **Incumbents (all-in-one):** Zola, The Knot/XO Group, WeddingWire, WithJoy
  — bundle website builder + registry + guest list/RSVP + vendor
  marketplace, free to couples.
  - Zola: registry commissions (**20% on experience gifts, 40% on physical
    goods**), vendor marketplace commissions (30,000+ pros by 2025),
    advertising ([FourWeekMBA](https://fourweekmba.com/how-does-zola-make-money/)).
  - WithJoy: free to couples, revenue purely from **registry kickbacks +
    affiliate commissions**
    ([BreakEvenPointCalculator](https://breakevenpointcalculator.com/how-does-withjoy-make-money-revenue-model-explained/)).
- **Guest-list/RSVP niche** (narrower, less consolidated): RSVPify, AllSeated,
  VowConnection. No dominant single-purpose leader — this is the opening
  this product targets.
- **Why couples resist subscriptions:** a wedding is a one-time, ~12–18
  month event. This is why incumbents monetize off guests/vendors instead
  of charging couples recurring fees — a structural feature of the
  vertical, not a stylistic choice.

## Product scope (v1)

A focused guest-list tool, not a full Zola-style platform:

1. Guest list management (add/import, household grouping, tags, dietary
   notes).
2. RSVP collection via a public, shareable per-wedding link.
3. Seating chart fed directly from the guest list and RSVP data.
4. Countdown & checklist tied to guest-list milestones.
5. Multi-event support (ceremony, rehearsal dinner, reception, etc.).

Out of scope for v1: wedding website builder, gift registry, vendor
marketplace, gift payments processing — the natural Phase-4+ expansion once
there's a user base to monetize on the vendor/registry side.

## Monetization

**Free tier:** up to 75 guests, 1 event, watermarked RSVP page, manual
seating chart, basic checklist.

**Premium — one-time unlock (~$79/wedding), not a subscription:**
unlimited guests, multi-event support, custom branding, seating chart
export, SMS RSVP reminders, day-of coordinator mode.

**Growth loop:** every free-tier RSVP page carries "Powered by Aisle"
branding — each wedding's guest list (~100–150 people) becomes an
acquisition funnel for the next round of engaged couples, the same
mechanic that made Zola/WithJoy's registry links viral, applied to the
RSVP page instead.

**Later layers (Phase 4+, not MVP):** vendor directory with lead-gen
commissions once there's meaningful wedding volume; optional light
subscription for a post-wedding guest CRM (thank-you card tracking,
anniversary reminders) to extend the revenue window past the one-time
unlock.

## Roadmap

1. **Phase 0 — Scaffold** (done): Next.js + Prisma + Postgres + auth.
2. **Phase 1 — Core MVP** (done): guest CRUD + CSV import, public RSVP
   page with live sync, checklist.
3. **Phase 2 — Seating & multi-event** (done): drag-and-drop seating chart,
   multi-event support.
4. **Phase 3 — Monetization** (done): Stripe one-time unlock, free-tier
   limits, RSVP-page branding growth loop. SMS reminders and export/
   coordinator mode are stubbed for a follow-up pass.
5. **Phase 4 — Scale:** vendor directory, referral incentives, SEO content,
   optional post-wedding CRM subscription.
