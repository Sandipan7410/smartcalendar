# Smart Calendar AI

A calendar app where you schedule in plain English. Gemini reads your existing Google Calendar events, checks for clashes and suggests a free slot before anything is booked.

**Live demo:** [smartcalendar-iota.vercel.app](https://smartcalendar-iota.vercel.app)

## What it does

- **Natural-language scheduling.** Type "Schedule SQL practice tomorrow from 8 PM to 9 PM" and the assistant proposes the event for you to confirm.
- **Conflict detection.** If the slot clashes with an existing meeting, it names the conflict and offers an alternative time instead of double-booking.
- **Daily schedule analysis.** Gemini summarizes a day's agenda and how busy it is.
- **Tasks with deadlines and priorities**, alongside events.
- **Google Calendar sync** after Google sign-in.
- **Weather in the calendar** from the Open-Meteo API.
- Day, week, month, year and agenda views, search, keyboard shortcuts and .ics export.

## How it works

```text
User message + current events and tasks
        ↓
Express API → Gemini (JSON response: reply + proposed action)
        ↓
Confirmation card in the UI
        ↓
Event written to Google Calendar
```

The model never changes the calendar on its own: every proposed event needs the user's confirmation first.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · Vercel Functions / Express · Google Gemini API (`@google/genai`) · Firebase Authentication · Cloud Firestore · Google Calendar API · Open-Meteo

## Project structure

```text
api/_lib/core.ts                  # Gemini prompts, model fallback, offline scheduler (server only)
api/_lib/auth.ts                  # verifies the Firebase ID token on every AI request
api/gemini/assistant.ts           # Vercel function → POST /api/gemini/assistant
api/gemini/analyze-schedule.ts    # Vercel function → POST /api/gemini/analyze-schedule
api/weather.ts                    # Vercel function → GET /api/weather
server.ts                         # same routes for local dev (Express + Vite)
src/services/firebase.ts          # Firebase app, Auth, Firestore (offline cache + live sync)
src/services/googleAuth.ts        # Google sign-in, upgrades the guest account in place
src/services/apiClient.ts         # attaches the Firebase ID token to /api calls
firestore.rules                   # each user can only read/write their own data
```

## Security model

- **The Gemini API key lives only on the server** (`GEMINI_API_KEY` in Vercel env vars). The browser never sees it.
- **AI endpoints require a Firebase sign-in.** Every visitor gets an anonymous Firebase account automatically; the browser sends its ID token and the server verifies it before calling Gemini, so nobody can drain your quota by calling the API directly.
- **Firestore rules** restrict `/users/{uid}/…` to that user.
- The Firebase web config in `firebase-applet-config.json` is public by design — restrict that browser key to your domains (below).

## Setup

### 1. Firebase console (project `gen-lang-client-0189013284`)

1. **Authentication → Sign-in method:** enable **Anonymous** and **Google**.
2. **Authentication → Settings → Authorized domains:** add `smartcalendar-iota.vercel.app` (and any custom domain).
3. **Firestore rules:** deploy with `npx firebase-tools deploy --only firestore:rules` (uses `firebase.json`, which targets the app's named database).

### 2. Vercel → Project → Settings → Environment Variables

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | your key from https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | optional, e.g. a specific Gemini model name |

**Delete `VITE_GEMINI_API_KEY` if it exists** — anything prefixed `VITE_` is bundled into public JavaScript. If it was ever set, create a new Gemini key and delete the old one.

Redeploy after changing variables.

### 3. Lock down the keys (Google Cloud console → APIs & Services → Credentials)

- **Gemini key:** API restrictions → *Generative Language API* only. Optionally set a daily quota cap.
- **Firebase browser key** (`AIzaSyBj…`): Application restrictions → *Websites* → your Vercel domain(s), `*.firebaseapp.com`, and `localhost` for development.

### Run it locally

1. `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`
3. `npm run dev`, then open http://localhost:3000 (add `localhost` to Firebase authorized domains)

## How it was built

Prototyped with Google AI Studio and Gemini, then deployed on Vercel.
