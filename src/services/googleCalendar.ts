import { CalendarEvent, RecurrenceType } from '../types/calendar';
import { formatDateToISO } from '../utils/dateUtils';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarApiItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  colorId?: string;
  htmlLink?: string;
  status?: string;
}

/**
 * Maps a Google Calendar API item to our internal CalendarEvent structure.
 */
export function mapGoogleEventToAppEvent(gEvent: GoogleCalendarApiItem): CalendarEvent {
  const isAllDay = !!gEvent.start?.date && !gEvent.start?.dateTime;
  let startDate = '';
  let startTime = '09:00';
  let endDate = '';
  let endTime = '10:00';

  if (isAllDay && gEvent.start?.date) {
    startDate = gEvent.start.date;
    // For all-day events in Google Calendar, end date is exclusive (day after).
    // If end date is present, adjust to inclusive for UI
    if (gEvent.end?.date) {
      const endD = new Date(gEvent.end.date);
      endD.setDate(endD.getDate() - 1);
      endDate = formatDateToISO(endD);
    } else {
      endDate = startDate;
    }
  } else if (gEvent.start?.dateTime) {
    const sDate = new Date(gEvent.start.dateTime);
    startDate = formatDateToISO(sDate);
    startTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;

    if (gEvent.end?.dateTime) {
      const eDate = new Date(gEvent.end.dateTime);
      endDate = formatDateToISO(eDate);
      endTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
    } else {
      endDate = startDate;
      const endHour = (sDate.getHours() + 1) % 24;
      endTime = `${String(endHour).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
    }
  } else {
    startDate = formatDateToISO(new Date());
    endDate = startDate;
  }

  // Recurrence parsing
  let recurrence: RecurrenceType = 'none';
  if (gEvent.recurrence && gEvent.recurrence.length > 0) {
    const rrule = gEvent.recurrence[0].toUpperCase();
    if (rrule.includes('FREQ=DAILY')) recurrence = 'daily';
    else if (rrule.includes('FREQ=WEEKLY')) recurrence = 'weekly';
    else if (rrule.includes('FREQ=MONTHLY')) recurrence = 'monthly';
    else if (rrule.includes('FREQ=YEARLY')) recurrence = 'yearly';
  }

  // Reminders
  let reminderMinutes = 15;
  if (gEvent.reminders?.overrides && gEvent.reminders.overrides.length > 0) {
    reminderMinutes = gEvent.reminders.overrides[0].minutes;
  }

  // Extract attendee emails
  const attendees = gEvent.attendees ? gEvent.attendees.map((a) => a.email).filter(Boolean) : [];

  return {
    id: `gcal-${gEvent.id}`,
    googleEventId: gEvent.id,
    isGoogleCalendar: true,
    title: gEvent.summary || '(No title)',
    description: gEvent.description || '',
    location: gEvent.location || '',
    startDate,
    startTime,
    endDate: endDate || startDate,
    endTime,
    isAllDay,
    color: '#1a73e8', // Standard Google Blue
    calendarId: 'work',
    recurrence,
    reminderMinutes,
    attendees,
    htmlLink: gEvent.htmlLink,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Builds the Google Calendar payload from an internal CalendarEvent.
 */
function buildGoogleEventPayload(event: Partial<CalendarEvent>, attendeesList?: string[]) {
  const payload: any = {
    summary: event.title || 'Untitled Event',
    description: event.description || '',
    location: event.location || '',
  };

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  if (event.isAllDay) {
    payload.start = { date: event.startDate };
    // End date is exclusive in Google Calendar
    const endD = new Date(event.endDate || event.startDate!);
    endD.setDate(endD.getDate() + 1);
    payload.end = { date: formatDateToISO(endD) };
  } else {
    const startIso = `${event.startDate}T${event.startTime || '09:00'}:00`;
    const endIso = `${event.endDate || event.startDate}T${event.endTime || '10:00'}:00`;
    payload.start = { dateTime: new Date(startIso).toISOString(), timeZone: userTimezone };
    payload.end = { dateTime: new Date(endIso).toISOString(), timeZone: userTimezone };
  }

  // Recurrence
  if (event.recurrence && event.recurrence !== 'none') {
    payload.recurrence = [`RRULE:FREQ=${event.recurrence.toUpperCase()}`];
  }

  // Reminders
  if (event.reminderMinutes !== undefined && event.reminderMinutes > 0) {
    payload.reminders = {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: event.reminderMinutes }],
    };
  } else if (event.reminderMinutes === 0) {
    payload.reminders = { useDefault: false, overrides: [] };
  }

  // Attendees
  const emails = attendeesList || event.attendees || [];
  if (emails.length > 0) {
    payload.attendees = emails.map((email) => ({ email: email.trim() }));
  }

  return payload;
}

/**
 * Fetch events from Google Calendar.
 */
export async function fetchGoogleEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const now = new Date();
  // Default to 1 month in past to 6 months in future
  const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const defaultMax = new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString();

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeMin: timeMin || defaultMin,
    timeMax: timeMax || defaultMax,
  });

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items: GoogleCalendarApiItem[] = data.items || [];

  return items
    .filter((item) => item.status !== 'cancelled')
    .map(mapGoogleEventToAppEvent);
}

/**
 * Create an event in user's primary Google Calendar.
 */
export async function createGoogleEvent(
  accessToken: string,
  event: Partial<CalendarEvent>,
  attendees?: string[]
): Promise<CalendarEvent> {
  const payload = buildGoogleEventPayload(event, attendees);

  const response = await fetch(GOOGLE_CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create event in Google Calendar: ${errText}`);
  }

  const createdGEvent: GoogleCalendarApiItem = await response.json();
  return mapGoogleEventToAppEvent(createdGEvent);
}

/**
 * Update an existing event in user's primary Google Calendar.
 */
export async function updateGoogleEvent(
  accessToken: string,
  googleEventId: string,
  event: Partial<CalendarEvent>,
  attendees?: string[]
): Promise<CalendarEvent> {
  const payload = buildGoogleEventPayload(event, attendees);

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update event in Google Calendar: ${errText}`);
  }

  const updatedGEvent: GoogleCalendarApiItem = await response.json();
  return mapGoogleEventToAppEvent(updatedGEvent);
}

/**
 * Delete an event from user's primary Google Calendar.
 */
export async function deleteGoogleEvent(
  accessToken: string,
  googleEventId: string
): Promise<boolean> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Failed to delete event from Google Calendar: ${errText}`);
  }

  return true;
}
