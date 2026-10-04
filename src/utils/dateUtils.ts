import { CalendarEvent } from '../types/calendar';

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const minuteStr = m === 0 ? ':00' : `:${String(m).padStart(2, '0')}`;
  return `${h}${minuteStr} ${ampm}`;
}

export function getMonthDays(year: number, month: number) {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 for Sunday
  const daysInMonth = lastDay.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days: {
    date: Date;
    dateString: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }[] = [];

  const todayStr = formatDateToISO(new Date());

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateString = formatDateToISO(d);
    days.push({
      date: d,
      dateString,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateString === todayStr,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateString = formatDateToISO(d);
    days.push({
      date: d,
      dateString,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
    });
  }

  // Next month padding to fill grid (35 or 42 cells)
  const totalCells = days.length <= 35 ? 35 : 42;
  const remaining = totalCells - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateString = formatDateToISO(d);
    days.push({
      date: d,
      dateString,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
    });
  }

  return days;
}

export function getWeekDays(referenceDate: Date) {
  const curr = new Date(referenceDate);
  const dayOfWeek = curr.getDay(); // 0 = Sunday
  const sunday = new Date(curr);
  sunday.setDate(curr.getDate() - dayOfWeek);

  const days: {
    date: Date;
    dateString: string;
    dayNumber: number;
    dayName: string;
    isToday: boolean;
  }[] = [];

  const todayStr = formatDateToISO(new Date());

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateString = formatDateToISO(d);
    days.push({
      date: d,
      dateString,
      dayNumber: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: dateString === todayStr,
    });
  }

  return days;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function checkConflict(
  event1: { startDate: string; startTime: string; endDate: string; endTime: string; isAllDay?: boolean },
  event2: { startDate: string; startTime: string; endDate: string; endTime: string; isAllDay?: boolean }
): boolean {
  if (event1.isAllDay || event2.isAllDay) return false;
  if (event1.startDate !== event2.startDate) return false;

  const start1 = timeToMinutes(event1.startTime);
  const end1 = timeToMinutes(event1.endTime);
  const start2 = timeToMinutes(event2.startTime);
  const end2 = timeToMinutes(event2.endTime);

  return Math.max(start1, start2) < Math.min(end1, end2);
}

export function findConflictsForEvent(targetEvent: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  if (targetEvent.isAllDay) return [];
  return allEvents.filter(
    (ev) => ev.id !== targetEvent.id && checkConflict(targetEvent, ev)
  );
}

export function findFreeSlots(dateStr: string, eventsOnDate: CalendarEvent[], durationMinutes: number = 60) {
  // Business hours: 09:00 to 18:00 (540 min to 1080 min)
  const workStart = 9 * 60;
  const workEnd = 18 * 60;

  // Filter non-all-day events and sort by start time
  const busyIntervals = eventsOnDate
    .filter((e) => !e.isAllDay && e.startDate === dateStr)
    .map((e) => ({
      start: timeToMinutes(e.startTime),
      end: timeToMinutes(e.endTime),
    }))
    .sort((a, b) => a.start - b.start);

  const mergedIntervals: { start: number; end: number }[] = [];
  for (const interval of busyIntervals) {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push({ ...interval });
    } else {
      const prev = mergedIntervals[mergedIntervals.length - 1];
      if (interval.start < prev.end) {
        prev.end = Math.max(prev.end, interval.end);
      } else {
        mergedIntervals.push({ ...interval });
      }
    }
  }

  const freeSlots: { startTime: string; endTime: string; duration: string }[] = [];
  let currentPointer = workStart;

  for (const busy of mergedIntervals) {
    if (busy.start > currentPointer && busy.start - currentPointer >= durationMinutes) {
      freeSlots.push({
        startTime: minutesToTime(currentPointer),
        endTime: minutesToTime(busy.start),
        duration: `${busy.start - currentPointer} mins`,
      });
    }
    currentPointer = Math.max(currentPointer, busy.end);
  }

  if (workEnd - currentPointer >= durationMinutes) {
    freeSlots.push({
      startTime: minutesToTime(currentPointer),
      endTime: minutesToTime(workEnd),
      duration: `${workEnd - currentPointer} mins`,
    });
  }

  return freeSlots;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
