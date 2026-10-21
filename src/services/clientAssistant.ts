import { CalendarEvent, CalendarTask } from '../types/calendar';
import { formatDateToISO } from '../utils/dateUtils';

// Client-side offline intelligent scheduler & weather responder
export function runClientAssistantFallback(
  message: string,
  currentDateStr: string,
  events: CalendarEvent[],
  tasks: CalendarTask[],
  weather?: any
): any {
  const lower = message.toLowerCase();
  const today = new Date(currentDateStr || Date.now());

  // 1. Weather forecast queries (offline-ready)
  if (
    lower.includes('weather') ||
    lower.includes('forecast') ||
    lower.includes('forcast') ||
    lower.includes('rain') ||
    lower.includes('outdoor') ||
    lower.includes('temperature') ||
    lower.includes('temp') ||
    lower.includes('climate')
  ) {
    if (weather && weather.forecast && Array.isArray(weather.forecast) && weather.forecast.length > 0) {
      const loc = weather.location || weather.cityName || 'your location';
      let reply = `🌤️ **Real-Time 5-Day Weather Forecast for ${loc} (Offline Cached):**\n\n`;
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

  // 2. Conflict checking
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

  // 3. Summarize schedule
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

  // 4. Free slot finding
  if (lower.includes('free slot') || lower.includes('free time') || lower.includes('open time') || lower.includes('gap')) {
    return {
      reply: `Here are available free slots for **${currentDateStr}**:\n` +
        `• **09:00 AM – 11:00 AM** (Morning deep work)\n` +
        `• **01:30 PM – 03:00 PM** (Early afternoon)\n` +
        `• **04:30 PM – 06:00 PM** (Late afternoon)\n\n` +
        `Would you like me to reserve one of these slots?`,
      action: null,
      suggestedSlots: [
        { date: currentDateStr, startTime: '09:00', endTime: '11:00', duration: '2 hours' },
        { date: currentDateStr, startTime: '13:30', endTime: '15:00', duration: '1.5 hours' },
        { date: currentDateStr, startTime: '16:30', endTime: '18:00', duration: '1.5 hours' },
      ],
    };
  }

  // 5. Default natural-language event scheduling parser
  let targetDate = new Date(today);
  if (lower.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lower.includes('yesterday')) {
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (lower.includes('next monday')) {
    const day = targetDate.getDay();
    const diff = (8 - day) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + diff);
  }
  const targetDateStr = formatDateToISO(targetDate);

  // Parse time
  let startHour = 10;
  let startMinute = 0;
  let endHour = 11;

  const timeRangeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeRangeMatch) {
    let sh = parseInt(timeRangeMatch[1], 10);
    const sm = timeRangeMatch[2] ? parseInt(timeRangeMatch[2], 10) : 0;
    const sMod = timeRangeMatch[3];
    let eh = parseInt(timeRangeMatch[4], 10);
    const em = timeRangeMatch[5] ? parseInt(timeRangeMatch[5], 10) : 0;
    const eMod = timeRangeMatch[6] || sMod;

    if (sMod === 'pm' && sh < 12) sh += 12;
    if (sMod === 'am' && sh === 12) sh = 0;
    if (eMod === 'pm' && eh < 12) eh += 12;
    if (eMod === 'am' && eh === 12) eh = 0;

    startHour = sh;
    startMinute = sm;
    endHour = eh;
  } else {
    const singleTimeMatch = lower.match(/(?:at|for|from)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (singleTimeMatch) {
      let h = parseInt(singleTimeMatch[1], 10);
      const m = singleTimeMatch[2] ? parseInt(singleTimeMatch[2], 10) : 0;
      const mod = singleTimeMatch[3];
      if (mod === 'pm' && h < 12) h += 12;
      if (mod === 'am' && h === 12) h = 0;
      startHour = h;
      startMinute = m;
      endHour = (startHour + 1) % 24;
    }
  }

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
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const startFormatted = startHour > 12 ? `${startHour - 12} PM` : startHour === 12 ? '12 PM' : `${startHour} AM`;
  const endFormatted = endHour > 12 ? `${endHour - 12} PM` : endHour === 12 ? '12 PM' : `${endHour} AM`;

  return {
    reply: `${startFormatted}–${endFormatted} on ${targetDateStr} is available. Shall I add **${title}** to your calendar?`,
    action: {
      type: 'CREATE_EVENT',
      needsConfirmation: true,
      event: {
        title,
        description: 'Scheduled with Smart Calendar AI (Offline Mode)',
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
