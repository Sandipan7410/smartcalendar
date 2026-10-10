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

React 19 · TypeScript · Vite · Tailwind CSS · Express · Google Gemini API (`@google/genai`) · Firebase Authentication · Google Calendar API · Open-Meteo · Vercel

## Project structure

```text
server.ts                         # /api/gemini/assistant, /api/gemini/analyze-schedule, /api/weather
src/services/googleCalendar.ts    # Google Calendar sync
src/services/weatherService.ts    # weather lookups
src/utils/dateUtils.ts            # conflict checking
src/components/views/             # day, week, month, year and agenda views
src/components/ai/                # assistant drawer
```

## Run it locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` ([get a key](https://aistudio.google.com/apikey))
3. Start the app: `npm run dev`, then open http://localhost:3000

The Gemini key is only read on the server, never sent to the browser.

## How it was built

Prototyped with Google AI Studio and Gemini, then deployed on Vercel.
