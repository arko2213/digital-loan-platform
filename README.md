# DigitalLoan — Digital Loan Comparison System with AI-Powered Recommendations

A production-style academic demo for comparing loan products, estimating EMIs, checking preliminary eligibility, and viewing explainable recommendations. **All lender products and terms in the seed data are illustrative development samples, not current offers.** Eligibility results are estimates, not approvals or financial advice.

## Run locally

Requirements: Node.js 20+, MongoDB (local or Atlas), and optionally a Google Gemini API key.

1. Copy `backend/.env.example` to `backend/.env` and configure `MONGODB_URI`, `JWT_SECRET`, and optionally `GEMINI_API_KEY`.
2. In one terminal: `cd backend && npm install && npm run seed && npm run dev`
3. In another terminal: `cd frontend && npm install && npm run dev`
4. Open the Vite URL (normally http://localhost:5173). The API runs on port 5000.

The app remains usable for comparison, EMI, eligibility, and transparent rule-based recommendations when Gemini is not configured; the AI chat endpoint then returns a clear service-unavailable response rather than pretending to be AI. Register an account to use protected features. To grant admin access, set `ADMIN_EMAIL` before registering that email.

## Project structure

- `frontend/` React + Vite responsive fintech UI, routing, API client, and shared components.
- `backend/` Express REST API, Mongoose models, validation, auth, recommendation/eligibility services, sample seed data, and Gemini integration.
- `docs/` architecture, data flow, ERD, API reference, requirements, security, testing strategy, and future scope.

## Environment and security

Never commit `.env`. The frontend contains no secrets. Passwords are bcrypt hashed; protected endpoints use JWT; admin mutations require the admin role. The API validates inputs, applies security headers, limits requests, rejects unauthorized cross-origins when configured, and uses generic client-facing error responses.

The provided lender names are fictional demo institutions and every product is marked `isDemo`. Replace them only with verified, dated lender data before any real-world use.
