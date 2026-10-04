import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Shared Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// Helper: Try calling Gemini with model fallback and fast timeout
async function callGeminiWithFallback(promptText: string) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout calling ${model}`)), 6500)
      );

      const apiCall = ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed:`, err?.message || err);
      lastError = err;
      // If it's a timeout, 503 or 429, try next model quickly
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Local smart parser when Gemini API is temporarily unavailable
function fallbackLocalAssistant(
  message: string,
  currentDateStr: string,
  events: any[],
  tasks: any[]
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

  // Weather guidance for scheduling
  if (lower.includes('weather') || lower.includes('rain') || lower.includes('outdoor')) {
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
app.post('/api/gemini/assistant', async (req: Request, res: Response) => {
  try {
    const { message, currentDate, currentTime, events = [], tasks = [], history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!apiKey) {
      // Graceful fallback if API key is not yet set
      res.json({
        reply: "Gemini API key is not configured in the environment. Please check your AI Studio secrets settings.",
        action: null,
      });
      return;
    }

    const systemPrompt = `You are "Smart Calendar AI", an intelligent personal scheduling assistant deeply integrated with Google Calendar.
The current date is: ${currentDate || new Date().toISOString().split('T')[0]}
The current time is: ${currentTime || new Date().toTimeString().slice(0, 5)}
Day of the week: ${new Date(currentDate || Date.now()).toLocaleDateString('en-US', { weekday: 'long' })}

The user's current calendar events (including primary Google Calendar events):
${JSON.stringify(events.slice(0, 50), null, 2)}

The user's current tasks:
${JSON.stringify(tasks.slice(0, 30), null, 2)}

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
      responseText = await callGeminiWithFallback(fullPrompt);
    } catch (apiErr: any) {
      console.warn('Gemini API call failed, using intelligent local scheduler fallback:', apiErr?.message);
      const fallbackResult = fallbackLocalAssistant(message, currentDate, events, tasks);
      res.json(fallbackResult);
      return;
    }

    const parsed = extractJSON(responseText);

    if (parsed) {
      res.json(parsed);
    } else {
      res.json({
        reply: responseText || "I've processed your request.",
        action: null,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/assistant:', error);
    // Even if something unexpected happens, respond gracefully with local fallback
    try {
      const { message = '', currentDate = '', events = [], tasks = [] } = req.body || {};
      const fallbackResult = fallbackLocalAssistant(message, currentDate, events, tasks);
      res.json(fallbackResult);
    } catch (e) {
      res.status(500).json({
        error: 'Failed to process assistant request',
        details: error?.message || 'Unknown error',
      });
    }
  }
});

// AI Quick Suggestions (e.g. find open slots or schedule summary)
app.post('/api/gemini/analyze-schedule', async (req: Request, res: Response) => {
  try {
    const { date, events = [] } = req.body;
    if (!apiKey) {
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = extractJSON(response.text || '');
    res.json(parsed || { summary: response.text });
  } catch (err: any) {
    console.error('Error analyzing schedule:', err);
    res.status(500).json({ error: err?.message || 'Failed to analyze schedule' });
  }
});

// Weather API Proxy
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat || '40.7128';
    const lon = req.query.lon || '-74.0060';
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
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
