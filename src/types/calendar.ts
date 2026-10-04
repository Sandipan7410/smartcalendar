export type CalendarId = 'personal' | 'work' | 'learning';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  googleEventId?: string;
  isGoogleCalendar?: boolean;
  htmlLink?: string;
  attendees?: string[];
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM in 24h
  endDate: string;   // YYYY-MM-DD
  endTime: string;   // HH:MM in 24h
  isAllDay: boolean;
  color: string;
  calendarId: CalendarId;
  recurrence: RecurrenceType;
  reminderMinutes?: number; // e.g. 5, 10, 15, 30, 60, 1440
  isCompleted?: boolean;
  createdAt: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface CalendarTask {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: TaskPriority;
  calendarId: CalendarId;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface CalendarCategory {
  id: CalendarId;
  name: string;
  color: string;
  textColor: string;
  visible: boolean;
}

export type CalendarViewType = 'month' | 'week' | 'day' | 'year' | 'agenda';

export interface AIActionPayload {
  type: 'CREATE_EVENT' | 'CREATE_TASK';
  event?: Partial<CalendarEvent>;
  task?: Partial<CalendarTask>;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  action?: AIActionPayload | null;
  conflicts?: Array<{
    eventTitle: string;
    overlapTime: string;
    warning: string;
  }>;
  suggestedSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
  }>;
  actionExecuted?: boolean;
}

export interface ColorOption {
  id: string;
  name: string;
  bgHex: string;
  textHex: string;
  ringHex: string;
}
