# Scot Travels 

Next.js practice app for a luxury transfer booking workflow using:
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Auth.js (credentials login/signup)
- MongoDB (Mongoose)

## Core Behavior
- Guests can browse and generate fare quotes.
- Checkout requires login/signup before payment.
- Fare model is distance-only with minimum 3 billable miles.
- Booking lifecycle includes confirmation, driver assignment, and completion.
- Transactional email events are stubbed via console logging.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Fill in `MONGODB_URI` and `AUTH_SECRET`.
3. Optional: set `ADMIN_BOOTSTRAP_EMAIL` so that account becomes admin.

## Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Important Routes
- `/` Home
- `/quote` Quote builder (guest allowed)
- `/checkout` Checkout (auth required)
- `/login` Login
- `/signup` Signup
- `/dashboard` Customer dashboard (auth required)
- `/admin` Admin panel (admin required)

## Notes
- Payment is mocked for practice. Checkout submit directly confirms booking.
- Email sending currently logs payloads; replace `src/lib/notifications.ts` with your provider (Resend/SendGrid).
