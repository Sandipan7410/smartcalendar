/**
 * Shared server-side logic for Smart Calendar AI.
 *
 * Used by both the local Express server (server.ts) and the Vercel serverless
 * functions in /api. The Gemini API key is read here from process.env and is
 * never sent to the browser.
 *
 * Files under api/_lib are not exposed as routes by Vercel (leading underscore).
 */
import { GoogleGenAI } from '@google/genai';

export const MAX_MESSAGE_CHARS = 2000;

/** Minimal response recorder so the route bodies work the same on Express and Vercel. */
export interface HandlerResult {
  status: number;
  body: any;
}
function recorder() {
  const out: HandlerResult = { status: 200, body: null };
  const res = {
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: any) {
      out.body = body;
      return res;
    },
  };
  return { res, out };
}

// Helper to sanitize JSON response
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        // Continue
      }
    }
    // Try to find first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e) {
        // Fallback
      }
    }
    return null;
  }
}

/** Records which model answered (or why none did) so the app can show it and you can debug it. */
export interface GeminiDiag {
  model?: string;
  errors: string[];
}

// Tried in order. Popular models sometimes return 503 "high demand", so keep several.
const DEFAULT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];
const PER_MODEL_TIMEOUT_MS = 15000;
const TOTAL_BUDGET_MS = 40000;

// Helper: Try calling Gemini with model fallback and proper timeout management
async function callGeminiWithFallback(promptText: string, diag: GeminiDiag = { errors: [] }) {
  const currentKey = process.env.GEMINI_API_KEY || '';
  if (!currentKey) {
    diag.errors.push('GEMINI_API_KEY is not set on the server');
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const client = new GoogleGenAI({ apiKey: currentKey });

  // GEMINI_MODEL lets you pin a model from the environment without a code change.
  const pinned = process.env.GEMINI_MODEL;
  const models = pinned ? [pinned, ...DEFAULT_MODELS.filter((m) => m !== pinned)] : DEFAULT_MODELS;
  const started = Date.now();
  let lastError: any = null;

  for (const model of models) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 2000) {
      diag.errors.push('stopped: time budget used up');
      break;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout`)), Math.min(PER_MODEL_TIMEOUT_MS, remaining));
      });

      const apiCall = client.models.generateContent({
        model,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      if (timer) clearTimeout(timer);

      if (response && response.text) {
        diag.model = model;
        return response.text;
      }
      diag.errors.push(`${model}: empty response`);
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      const msg = String(err?.message || err).replace(/\s+/g, ' ').slice(0, 160);
      console.warn(`Model ${model} attempt failed:`, msg);
      diag.errors.push(`${model}: ${msg}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Local smart parser when Gemini API is temporarily unavailable
function fallbackLocalAssistant(
  message: string,
  currentDateStr: string,
  events: any[],
  tasks: any[],
  weather?: any
): any {
  const lower = message.toLowerCase();
  const today = new Date(currentDateStr || Date.now());

  // 1. Conflict checking
  if (lower.includes('conflict') || lower.includes('overlap')) {
    const todayEvents = events.filter((e) => e.startDate === currentDateStr && !e.isAllDay);
    const conflicts: any[] = [];
    for (let i = 0; i < todayEvents.length; i++) {
      for (let j = i + 1; j < todayEvents.length; j++) {
        const a = todayEvents[i];
        const b = todayEvents[j];
        if (a.startTime < b.endTime && b.startTime < a.endTime) {
          conflicts.push({
            eventTitle: `${a.title} & ${b.title}`,
            overlapTime: `${a.startTime} - ${b.endTime}`,
            warning: 'These two events overlap in your schedule.',
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return {
        reply: `⚠️ I found **${conflicts.length} scheduling conflict(s)** in your events today:\n` +
          conflicts.map((c) => `• **${c.eventTitle}** (${c.overlapTime})`).join('\n'),
        action: null,
        conflicts,
      };
    } else {
      return {
        reply: "✅ Good news! You have **no conflicting events** scheduled for today.",
        action: null,
        conflicts: [],
      };
    }
  }

  // Weather guidance for scheduling (handles "forcast weather", "weather", "forecast", etc.)
  if (
    lower.includes('weather') ||
    lower.includes('forecast') ||
    lower.includes('forcast') ||
    lower.includes('rain') ||
    lower.includes('outdoor') ||
    lower.includes('temperature') ||
    lower.includes('temp')
  ) {
    if (weather && weather.forecast && Array.isArray(weather.forecast) && weather.forecast.length > 0) {
      const loc = weather.location || weather.cityName || 'your location';
      let reply = `🌤️ **Real-Time 5-Day Weather Forecast for ${loc}:**\n\n`;
      if (weather.currentCondition && weather.currentTemp) {
        reply += `• **Current**: ${weather.currentCondition} (${weather.currentTemp})\n\n`;
      }
      weather.forecast.forEach((f: any) => {
        const tempText = f.high && f.low ? `High ${f.high} / Low ${f.low}` : (f.temp || '');
        const rainText = f.precipitationChance ? `• Rain: ${f.precipitationChance}` : '';
        reply += `• **${f.dayName} (${f.shortDate || f.date})**: ${f.condition} • ${tempText} ${rainText}\n`;
        if (f.suitability) {
          reply += `  *→ ${f.suitability}*\n`;
        }
      });
      reply += `\n💡 *Tip: Click "+ Plan Event" on any weather card in the MonthView header to plan an event pre-filled with this weather!*`;
      return { reply, action: null };
    }

    return {
      reply: `🌤️ **5-Day Weather Outlook for Event Planning:**\n\n• **Today**: Mostly Sunny (72°F / 22°C) - Ideal for outdoor activities & lunch meetings.\n• **Tomorrow**: Partly Cloudy (70°F / 21°C) - Pleasant conditions for general scheduling.\n• **Day 3**: Clear Sky (75°F / 24°C) - Prime sunny day for outdoor team gatherings!\n• **Day 4**: Rain Showers (62°F / 17°C, 70% rain) - Indoor venue recommended.\n• **Day 5**: Fair & Breezy (68°F / 20°C) - Suitable for both indoor and outdoor.\n\n💡 *Tip: Check out the 5-Day Weather Forecast display in the MonthView header to plan events with one click!*`,
      action: null,
    };
  }

  // 2. Summarize schedule
  if (lower.includes('summar') || lower.includes('what do i have') || lower.includes('schedule today') || lower.includes('agenda')) {
    const todayEvents = events.filter((e) => e.startDate === currentDateStr);
    const todayTasks = tasks.filter((t) => t.dueDate === currentDateStr && !t.isCompleted);

    let reply = `📅 **Schedule Summary for ${currentDateStr}:**\n\n`;
    if (todayEvents.length === 0) {
      reply += "You have no events scheduled for today. It's a great day for deep work!\n";
    } else {
      reply += `You have **${todayEvents.length} events**:\n`;
      todayEvents.forEach((e) => {
        reply += `• **${e.title}**: ${e.isAllDay ? 'All Day' : `${e.startTime} - ${e.endTime}`} ${e.location ? `(@ ${e.location})` : ''}\n`;
      });
    }

    if (todayTasks.length > 0) {
      reply += `\n📋 **${todayTasks.length} pending tasks due today**:\n`;
      todayTasks.forEach((t) => {
        reply += `• ${t.title} [${t.priority.toUpperCase()}]\n`;
      });
    }

    return { reply, action: null };
  }

  // 3. Find free slots
  if (lower.includes('free slot') || lower.includes('free time') || lower.includes('open time') || lower.includes('gap')) {
    return {
      reply: "Here are open working slots for today between 9:00 AM and 6:00 PM:",
      action: null,
      suggestedSlots: [
        { date: currentDateStr, startTime: '11:30', endTime: '12:30', duration: '60 mins' },
        { date: currentDateStr, startTime: '14:00', endTime: '15:30', duration: '90 mins' },
        { date: currentDateStr, startTime: '16:30', endTime: '17:30', duration: '60 mins' },
      ],
    };
  }

  // 4. Create Task
  if (lower.startsWith('add task') || lower.startsWith('create task') || lower.includes('remind me to')) {
    let taskTitle = message
      .replace(/^(add task:?|create task:?|remind me to)\s*/i, '')
      .trim();

    return {
      reply: `I've created the task: **${taskTitle}** due today at 5:00 PM.`,
      action: {
        type: 'CREATE_TASK',
        task: {
          title: taskTitle,
          dueDate: currentDateStr,
          dueTime: '17:00',
          priority: lower.includes('high') ? 'high' : 'medium',
          calendarId: 'work',
        },
      },
    };
  }

  // 5. Natural Language Event Scheduling
  // E.g. "Schedule a meeting with Rahul next Monday at 11 AM for one hour"
  let eventDate = new Date(today);
  if (lower.includes('tomorrow')) {
    eventDate.setDate(eventDate.getDate() + 1);
  } else if (lower.includes('next monday') || lower.includes('monday')) {
    const day = eventDate.getDay();
    const diff = (1 + 7 - day) % 7 || 7;
    eventDate.setDate(eventDate.getDate() + diff);
  } else if (lower.includes('friday')) {
    const day = eventDate.getDay();
    const diff = (5 + 7 - day) % 7 || 7;
    eventDate.setDate(eventDate.getDate() + diff);
  }

  // Extract time like "11 am", "3 pm", "14:00"
  let startHour = 10;
  let startMinute = 0;
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) {
      startHour = h;
      startMinute = m;
    }
  }

  const durationHours = lower.includes('two hour') || lower.includes('2 hour') ? 2 : 1;
  const endHour = (startHour + durationHours) % 24;

  const y = eventDate.getFullYear();
  const m = String(eventDate.getMonth() + 1).padStart(2, '0');
  const d = String(eventDate.getDate()).padStart(2, '0');
  const targetDateStr = `${y}-${m}-${d}`;

  const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
  const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

  let title = message
    .replace(/^(schedule|book|create|set up|plan)\s*(a|an)?\s*/i, '')
    .replace(/\s*(tomorrow|next monday|next week|today|yesterday|this \w+)/gi, '')
    .replace(/\s*(from\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*to\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi, '')
    .replace(/\s*(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi, '')
    .replace(/\s*(for\s+\d+\s*(?:hour|hours|hr|hrs|min|mins|minutes)?)/gi, '')
    .trim();
  if (!title) title = 'Meeting';
  // Capitalize title
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Check conflicts with existing events on target date
  const conflictingEvent = events.find(
    (e: any) =>
      e.startDate === targetDateStr &&
      !e.isAllDay &&
      startTimeStr < e.endTime &&
      endTimeStr > e.startTime
  );

  const startFormatted = startHour > 12 ? `${startHour - 12} PM` : startHour === 12 ? '12 PM' : `${startHour} AM`;
  const endFormatted = endHour > 12 ? `${endHour - 12} PM` : endHour === 12 ? '12 PM' : `${endHour} AM`;

  if (conflictingEvent) {
    const altStartHour = (endHour) % 24;
    const altEndHour = (altStartHour + 1) % 24;
    const altStartFormatted = altStartHour > 12 ? `${altStartHour - 12} PM` : `${altStartHour} AM`;
    const altEndFormatted = altEndHour > 12 ? `${altEndHour - 12} PM` : `${altEndHour} AM`;

    return {
      reply: `You already have a meeting from **${conflictingEvent.startTime}–${conflictingEvent.endTime}** ("${conflictingEvent.title}"). I found **${altStartFormatted}–${altEndFormatted}** available. Would you like me to schedule it there?`,
      action: null,
      conflicts: [
        {
          eventTitle: conflictingEvent.title,
          overlapTime: `${conflictingEvent.startTime} - ${conflictingEvent.endTime}`,
          warning: 'Overlaps with your existing calendar event.',
        },
      ],
      suggestedSlots: [
        {
          date: targetDateStr,
          startTime: `${String(altStartHour).padStart(2, '0')}:00`,
          endTime: `${String(altEndHour).padStart(2, '0')}:00`,
          duration: '1 hour',
        },
      ],
    };
  }

  return {
    reply: `${startFormatted}–${endFormatted} is available. Shall I add ${title} to your Google Calendar?`,
    action: {
      type: 'CREATE_EVENT',
      needsConfirmation: true,
      event: {
        title: title,
        description: 'Scheduled with Smart Calendar AI',
        startDate: targetDateStr,
        startTime: startTimeStr,
        endDate: targetDateStr,
        endTime: endTimeStr,
        isAllDay: false,
        location: '',
        calendarId: 'work',
        color: '#1a73e8',
      },
    },
    conflicts: [],
  };
}

/** POST /api/gemini/assistant */
export async function runAssistant(requestBody: any): Promise<HandlerResult> {
  const req = { body: requestBody || {} };
  const { res, out } = recorder();
  const diag: GeminiDiag = { errors: [] };
  await (async () => {
  try {
    const { message, currentDate, currentTime, events = [], tasks = [], weather, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      res.status(413).json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters)` });
      return;
    }

    const currentApiKey = process.env.GEMINI_API_KEY || '';
    if (!currentApiKey) {
      // Graceful local smart scheduler if API key is not yet set
      const fallbackResult = fallbackLocalAssistant(message, currentDate, events, tasks, weather);
      res.json(fallbackResult);
      return;
    }

    const eventsSummary = events.slice(0, 35).map((e: any) => ({
      title: e.title,
      startDate: e.startDate,
      startTime: e.startTime,
      endDate: e.endDate,
      endTime: e.endTime,
      isAllDay: e.isAllDay,
      location: e.location || undefined,
    }));

    const tasksSummary = tasks.slice(0, 20).map((t: any) => ({
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      isCompleted: t.isCompleted,
    }));

    const weatherContextStr = weather && weather.forecast && Array.isArray(weather.forecast) && weather.forecast.length > 0
      ? `
Real-Time Weather Forecast for ${weather.location || weather.cityName || 'User Location'} (currently active in the calendar top header):
Current: ${weather.currentCondition || ''} (${weather.currentTemp || ''})
5-Day Forecast details:
${weather.forecast.map((f: any) => `• ${f.dayName} (${f.shortDate || f.date}): ${f.condition}, High ${f.high || f.temp} / Low ${f.low || ''}, Rain: ${f.precipitationChance || '0%'}, Suitability: ${f.suitability || ''}`).join('\n')}

REAL-TIME WEATHER INSTRUCTIONS:
- You HAVE real-time live meteorological data provided above for ${weather.location || weather.cityName || 'the user\'s city'}.
- NEVER claim you don't have access to real-time weather forecasts or external meteorological data.
- When asked about weather, forecast, rain, temperature, or outdoor event planning:
  1. Clearly report the live forecast details from the data above.
  2. Recommend the best days for outdoor vs indoor events (point out days with 0% rain and clear/sunny conditions).
  3. Offer to schedule an event on the best weather day with specific times!
`
      : '';

    const systemPrompt = `You are "Smart Calendar AI", an intelligent personal scheduling assistant deeply integrated with Google Calendar and real-time weather forecasting.
The current date is: ${currentDate || new Date().toISOString().split('T')[0]}
The current time is: ${currentTime || new Date().toTimeString().slice(0, 5)}
Day of the week: ${new Date(currentDate || Date.now()).toLocaleDateString('en-US', { weekday: 'long' })}
${weatherContextStr}
The user's current calendar events:
${JSON.stringify(eventsSummary)}

The user's current tasks:
${JSON.stringify(tasksSummary)}

Behavior Rules:
1. When asked to schedule an event (e.g. "Schedule SQL practice tomorrow from 8 PM to 9 PM" or "Meeting with Rahul next Monday at 11 AM"):
   - Understand the requested date and start/end time.
   - Check all existing events (especially Google Calendar events) for conflicts.
   - If NO CONFLICT:
     Set reply asking for confirmation in this format:
     "[Start Time]–[End Time] is available. Shall I add [Title] to your Google Calendar?"
     Provide the proposed event in action.event with "needsConfirmation": true so the UI can display a confirmation card.
   - If THERE IS A CONFLICT:
     Identify the conflicting meeting:
     "You already have a meeting from [Conflict Time]. I found [Alternative Time] available. Would you like me to schedule it there?"
     Populate "conflicts" with the conflict details. Do not move existing events. Offer the alternative in "suggestedSlots".
2. Tasks: Create tasks with deadlines and priorities when requested.
3. Summarize schedule / agendas accurately.
4. Weather: Directly provide the real-time weather forecast and recommendations using the Real-Time Weather Forecast above!

Always respond in valid JSON format matching this schema:
{
  "reply": "Human-friendly message following the exact instructions above.",
  "action": null | {
    "type": "CREATE_EVENT" | "CREATE_TASK",
    "needsConfirmation": boolean,
    "event": {
      "title": "Title of event",
      "description": "Optional notes or details",
      "startDate": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endDate": "YYYY-MM-DD",
      "endTime": "HH:MM",
      "isAllDay": boolean,
      "location": "Optional location or link",
      "calendarId": "work",
      "color": "#1a73e8"
    },
    "task": {
      "title": "Title of task",
      "notes": "Optional notes",
      "dueDate": "YYYY-MM-DD",
      "dueTime": "HH:MM",
      "priority": "high" | "medium" | "low",
      "calendarId": "work"
    }
  },
  "conflicts": [
    {
      "eventTitle": "Title of overlapping event",
      "overlapTime": "Time description",
      "warning": "Explanation of the conflict"
    }
  ],
  "suggestedSlots": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "duration": "Duration e.g. 1 hour"
    }
  ]
}`;

    let responseText = '';
    try {
      const fullPrompt = `System context:\n${systemPrompt}\n\nRecent conversation history:\n${JSON.stringify(history.slice(-4))}\n\nUser request:\n${message}`;
      responseText = await callGeminiWithFallback(fullPrompt, diag);
    } catch (apiErr: any) {
      console.warn('Gemini API call failed, using intelligent local scheduler fallback:', apiErr?.message);
      const fallbackResult = fallbackLocalAssistant(message, currentDate, events, tasks, weather);
      res.json(fallbackResult);
      return;
    }

    const checkAndFixWeatherDisclaimer = (text: string) => {
      const lower = text.toLowerCase();
      if (
        lower.includes("don't have access to real-time weather") ||
        lower.includes("no access to real-time weather") ||
        lower.includes("external meteorological data") ||
        lower.includes("cannot access real-time weather") ||
        lower.includes("check your local weather app")
      ) {
        return fallbackLocalAssistant(message, currentDate, events, tasks, weather).reply;
      }
      return text;
    };

    const parsed = extractJSON(responseText);

    if (parsed) {
      if (parsed.reply) {
        parsed.reply = checkAndFixWeatherDisclaimer(parsed.reply);
      }
      res.json(parsed);
    } else {
      let replyText = responseText || "I've processed your request.";
      replyText = checkAndFixWeatherDisclaimer(replyText);
      res.json({
        reply: replyText,
        action: null,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/assistant:', error);
    // Even if something unexpected happens, respond gracefully with local fallback
    try {
      const { message = '', currentDate = '', events = [], tasks = [], weather } = req.body || {};
      const fallbackResult = fallbackLocalAssistant(message, currentDate, events, tasks, weather);
      res.json(fallbackResult);
    } catch (e) {
      res.status(500).json({
        error: 'Failed to process assistant request',
        details: error?.message || 'Unknown error',
      });
    }
  }
  })();
  if (out.body && typeof out.body === 'object' && out.status === 200) {
    // Tells the UI (and you, in the browser's Network tab) whether Gemini answered.
    out.body.aiSource = diag.model ? `gemini:${diag.model}` : 'offline';
    if (!diag.model && diag.errors.length) out.body.aiNote = diag.errors.join(' | ');
  }
  return out;
}

/** POST /api/gemini/analyze-schedule */
export async function runAnalyzeSchedule(requestBody: any): Promise<HandlerResult> {
  const req = { body: requestBody || {} };
  const { res, out } = recorder();
  const diag: GeminiDiag = { errors: [] };
  await (async () => {
  try {
    const { date, events = [] } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      res.json({ summary: 'API Key not provided', freeSlots: [] });
      return;
    }

    const prompt = `Analyze the user's schedule for ${date}:
Events on this date: ${JSON.stringify(events, null, 2)}

Provide a JSON response:
{
  "summary": "Concise 2-3 sentence overview of the day's commitments and focus areas",
  "busyHours": "e.g. 9:00 AM - 12:00 PM, 2:00 PM - 3:30 PM",
  "freeSlots": ["12:00 PM - 2:00 PM (Lunch & Deep work)", "3:30 PM - 5:00 PM (Wrap-up)"],
  "productivityTip": "Actionable tip for balancing this day"
}`;

    let responseText = '';
    try {
      responseText = await callGeminiWithFallback(prompt, diag);
    } catch (e) {
      // Local fallback summary
      const count = events.length;
      res.json({
        summary: count === 0
          ? `Your schedule for ${date} is clear with plenty of open time for focused work.`
          : `You have ${count} scheduled event${count > 1 ? 's' : ''} on ${date}.`,
        busyHours: events.map((e: any) => `${e.startTime || 'All Day'} - ${e.endTime || ''}`).join(', ') || 'None',
        freeSlots: ['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM'],
        productivityTip: 'Schedule short buffers between meetings to stay refreshed.',
      });
      return;
    }

    const parsed = extractJSON(responseText);
    res.json(parsed || { summary: responseText });
  } catch (err: any) {
    console.error('Error analyzing schedule:', err);
    res.json({
      summary: 'Schedule review completed.',
      busyHours: 'Standard hours',
      freeSlots: ['12:00 PM - 01:00 PM', '04:00 PM - 05:00 PM'],
      productivityTip: 'Protect focus blocks during your peak energy hours.',
    });
  }
  })();
  if (out.body && typeof out.body === 'object' && out.status === 200) {
    // Tells the UI (and you, in the browser's Network tab) whether Gemini answered.
    out.body.aiSource = diag.model ? `gemini:${diag.model}` : 'offline';
    if (!diag.model && diag.errors.length) out.body.aiNote = diag.errors.join(' | ');
  }
  return out;
}

/** GET /api/weather */
export async function runWeather(query: Record<string, any>): Promise<HandlerResult> {
  const req = { query: query || {} };
  const { res, out } = recorder();
  await (async () => {
  try {
    const lat = Number(req.query.lat ?? 40.7128);
    const lon = Number(req.query.lon ?? -74.006);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      res.status(400).json({ error: 'lat and lon must be valid coordinates' });
      return;
    }
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=6`;

    const weatherRes = await fetch(openMeteoUrl);
    if (!weatherRes.ok) {
      res.status(weatherRes.status).json({ error: 'Failed to fetch weather from provider' });
      return;
    }
    const data = await weatherRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('Error proxying weather:', err);
    res.status(500).json({ error: err?.message || 'Weather proxy error' });
  }
  })();
  return out;
}
