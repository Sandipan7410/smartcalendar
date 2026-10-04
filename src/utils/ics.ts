import { CalendarEvent } from '../types/calendar';

export function exportToICS(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Calendar AI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@smartcalendar.ai`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);

    if (ev.isAllDay) {
      const startDt = ev.startDate.replace(/-/g, '');
      lines.push(`DTSTART;VALUE=DATE:${startDt}`);
      const nextDate = new Date(ev.endDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const endDt = nextDate.toISOString().split('T')[0].replace(/-/g, '');
      lines.push(`DTEND;VALUE=DATE:${endDt}`);
    } else {
      const startDt = `${ev.startDate.replace(/-/g, '')}T${ev.startTime.replace(/:/g, '')}00`;
      const endDt = `${ev.endDate.replace(/-/g, '')}T${ev.endTime.replace(/:/g, '')}00`;
      lines.push(`DTSTART:${startDt}`);
      lines.push(`DTEND:${endDt}`);
    }

    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (ev.description) {
      lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    }
    if (ev.location) {
      lines.push(`LOCATION:${escapeICS(ev.location)}`);
    }
    if (ev.recurrence && ev.recurrence !== 'none') {
      const freq = ev.recurrence.toUpperCase();
      lines.push(`RRULE:FREQ=${freq}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function unescapeICS(str: string): string {
  return str.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

export function downloadICSFile(events: CalendarEvent[], filename = 'calendar-export.ics') {
  const icsData = exportToICS(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseICSContent(icsText: string): Partial<CalendarEvent>[] {
  const events: Partial<CalendarEvent>[] = [];
  const lines = icsText.split(/\r\n|\n|\r/);

  let currentEvent: any = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Unfold multi-line headers
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[i + 1].slice(1);
      i++;
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {
        id: 'ics-' + Math.random().toString(36).substring(2, 9),
        title: 'Untitled Event',
        calendarId: 'personal',
        color: '#1a73e8',
        recurrence: 'none',
        createdAt: new Date().toISOString(),
      };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent) {
        if (!currentEvent.endDate) currentEvent.endDate = currentEvent.startDate;
        if (!currentEvent.endTime) currentEvent.endTime = '10:00';
        if (!currentEvent.startTime) currentEvent.startTime = '09:00';
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.title = unescapeICS(line.substring(8));
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = unescapeICS(line.substring(12));
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = unescapeICS(line.substring(9));
      } else if (line.startsWith('DTSTART')) {
        const value = line.split(':')[1];
        if (value) {
          if (value.includes('T')) {
            const datePart = value.substring(0, 8);
            const timePart = value.substring(9, 13);
            currentEvent.startDate = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
            currentEvent.startTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
            currentEvent.isAllDay = false;
          } else {
            currentEvent.startDate = `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
            currentEvent.startTime = '09:00';
            currentEvent.isAllDay = true;
          }
        }
      } else if (line.startsWith('DTEND')) {
        const value = line.split(':')[1];
        if (value) {
          if (value.includes('T')) {
            const datePart = value.substring(0, 8);
            const timePart = value.substring(9, 13);
            currentEvent.endDate = `${datePart.substring(0, 4)}-${datePart.substring(4, 6)}-${datePart.substring(6, 8)}`;
            currentEvent.endTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          } else {
            currentEvent.endDate = `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
            currentEvent.endTime = '10:00';
          }
        }
      }
    }
  }

  return events;
}
