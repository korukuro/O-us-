# O(us)

**A real-time, collaborative DSA practice tracker for small study groups.**

Two friends prepping for interviews shouldn't grind the same problem sheet alone in separate tabs. O(us) turns solo LeetCode practice into a shared game: log your solves, race a live leaderboard, throw your friend a dare, and keep a streak alive — all updating in real time across every device in the room.

🔗 **Live app:** [o-us.vercel.app](https://o-us.vercel.app)

---

## What it does

- **Shared rooms** — create a room, share a 6-character invite code, and everyone's progress lives in one place. Built for groups, not just pairs.
- **A shared problem bank** — paste a LeetCode / GfG / Codeforces link and it auto-parses the title, platform, and difficulty. Anything anyone adds appears for the whole room instantly.
- **One unified live feed** — solves, chat, dares, and milestones all stream into a single group-chat-style feed you can react to with emojis.
- **Self-set daily plans that lock** — you decide each day how many problems to commit to. Once locked, the plan can grow but never shrink, so you can't quietly lower the bar.
- **Timezone-correct streaks** — your streak advances when you clear your locked plan, with a freeze token to survive one off day.
- **Spoiler-locked notes** — you can see *that* your friend solved a problem, but their written takeaway stays hidden until you solve it yourself.
- **A sync bonus** — problems two people have both solved unlock each other's notes and count toward a shared bonus, rewarding overlap without forcing identical study paths.
- **Dares** — challenge a specific person to a specific problem; they get notified even with the app closed, and you get notified when they clear it.
- **Cross-device push notifications** — dares and an evening "your plan's still open" nudge reach you on desktop and mobile.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Backend / DB / realtime | [Convex](https://convex.dev) |
| Authentication | [Clerk](https://clerk.com) |
| Notifications | Web Push API + service worker |
| Hosting | Vercel (frontend) + Convex Cloud (backend) |

---

## Architecture notes

A few decisions that shaped the project, and the reasoning behind them.

### Convex does three jobs at once

The core requirement was that one person's solve updates everyone else's screen instantly. The conventional approach — Express + Socket.io + MongoDB — means running a socket server and keeping the database and socket messages in sync as two separate sources of truth.

Convex collapses that: every query is a live subscription. It tracks which documents a query reads, and when a mutation writes, it recomputes and pushes only the affected queries. **There is no WebSocket code anywhere in this project** — realtime is a property of the data layer, not a separate transport. Adding a problem in one browser makes it appear in another with zero extra work.

### Authorization lives at the data layer, not the UI

Two features enforce rules that would be trivially bypassable if done in the frontend:

- **Spoiler-locked notes** aren't blurred with CSS — the takeaway text is *stripped out of the query response server-side* for any problem the caller hasn't solved. It never reaches the browser, so it can't be read in devtools.
- **The plan lock** is enforced in the mutation: any update that drops a previously-locked problem is rejected. Hiding the remove button would only stop honest users.

Every room-scoped function starts with a `requireMember` guard, so membership is checked on every read and write rather than assumed.

### Timezone-aware streaks

"Did you solve something yesterday" is a calendar question, not a duration one. Streaks store a `YYYY-MM-DD` day key computed in each user's own timezone, so the logic holds across DST, across timezones, and for someone solving at 11:58 PM. Comparing raw timestamps would break all three.

### What was deliberately left out

- **No Redis.** Nothing here needs a cache, and Convex handles realtime natively. Adding it would be complexity with no payoff at this scale.
- **No solve verification.** Solves are self-reported. The users are a trust group studying together; scraping an undocumented LeetCode endpoint would add fragility for a signal that's still gameable, and turn a cooperative tool into a proctoring one.

---

## Project structure

```
convex/                 backend — every file's exports become callable functions
├── schema.js           all tables and indexes
├── auth.config.js      Clerk ↔ Convex JWT config
├── rooms.js            create / join / list rooms, membership
├── problems.js         problem bank, URL parsing, sync status
├── solves.js           logging solves, XP, streaks
├── feed.js             the unified feed query (with the spoiler lock)
├── plans.js            daily plans and the grow-only lock rule
├── dares.js            targeted dares
├── reactions.js        emoji reactions
├── push.js             web-push sending (Node action)
├── subscriptions.js    push subscription storage
├── crons.js            the evening nudge schedule
└── lib/                requireMember guard, timezone/date helpers

src/
├── App.jsx             the app
├── components/         ORing (the eyed progress ring), Confetti
├── hooks/              user sync, push subscription
└── lib/                URL parser, constants

public/
├── sw.js               service worker for push
└── manifest.json       PWA manifest (enables mobile install + iOS push)
```

---

## Running it locally

You'll need Node 18+, plus free accounts on [Convex](https://convex.dev) and [Clerk](https://clerk.com).

```bash
# install
npm install

# start the backend (opens a browser to log in, creates the project)
npx convex dev

# in a second terminal, start the frontend
npm run dev
```

Then configure the two services:

1. In Clerk, create a **JWT template named `convex`** and copy its issuer URL.
2. Create `.env.local`:
   ```
   VITE_CONVEX_URL=<printed by `npx convex dev`>
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_VAPID_PUBLIC_KEY=<from `npx web-push generate-vapid-keys`>
   ```
3. Set the backend environment variables:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN <your clerk issuer>
   npx convex env set VAPID_PUBLIC_KEY  <public key>
   npx convex env set VAPID_PRIVATE_KEY <private key>
   npx convex env set VAPID_SUBJECT     "mailto:you@example.com"
   ```

Open `http://localhost:5173` and sign in.

---

## Notes on push notifications

- **Desktop (Chrome, Firefox)** and **Android** work out of the box once notifications are enabled in-app.
- **iPhone** requires adding the site to the home screen first (Share → Add to Home Screen), then enabling notifications — an Apple restriction on web push, not a limitation of the app.
- Push requires HTTPS, so it only works on the deployed site, not `localhost`.

---

Built as a learning project to explore reactive backends and to make interview prep less lonely.