import { CalendarEvent, CalendarTask, CalendarCategory } from '../types/calendar';
import { formatDateToISO } from './dateUtils';

export const INITIAL_CATEGORIES: CalendarCategory[] = [
  { id: 'work', name: 'Work', color: '#1a73e8', textColor: '#ffffff', visible: true },
  { id: 'personal', name: 'Personal', color: '#0b8043', textColor: '#ffffff', visible: true },
  { id: 'learning', name: 'Learning & Skills', color: '#8e24aa', textColor: '#ffffff', visible: true },
];

export function getInitialEvents(): CalendarEvent[] {
  const today = new Date();

  const getDateStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offsetDays);
    return formatDateToISO(d);
  };

  return [
    {
      id: 'seed-1',
      title: 'Sprint Planning & Goal Alignment',
      description: 'Review Q4 priorities, backlog triage, and velocity estimation with the core engineering team.',
      location: 'Google Meet (meet.google.com/abc-xyz)',
      startDate: getDateStr(0),
      startTime: '09:30',
      endDate: getDateStr(0),
      endTime: '10:45',
      isAllDay: false,
      color: '#1a73e8',
      calendarId: 'work',
      recurrence: 'weekly',
      reminderMinutes: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-2',
      title: 'Product Design Sync',
      description: 'Review updated Figma prototypes for the new AI Assistant drawer and mobile calendar views.',
      location: 'Design Studio & Room 4B',
      startDate: getDateStr(0),
      startTime: '13:00',
      endDate: getDateStr(0),
      endTime: '14:00',
      isAllDay: false,
      color: '#8e24aa',
      calendarId: 'work',
      recurrence: 'none',
      reminderMinutes: 15,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-3',
      title: 'Deep Work: AI Architecture',
      description: 'Focus block for prompt optimization and real-time conflict checking algorithm.',
      location: 'Focus Pod / Remote',
      startDate: getDateStr(0),
      startTime: '15:30',
      endDate: getDateStr(0),
      endTime: '17:00',
      isAllDay: false,
      color: '#0284c7',
      calendarId: 'learning',
      recurrence: 'none',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-4',
      title: 'Gym & Core Fitness',
      description: 'Strength training and mobility routine.',
      location: 'City Athletic Club',
      startDate: getDateStr(1),
      startTime: '08:00',
      endDate: getDateStr(1),
      endTime: '09:15',
      isAllDay: false,
      color: '#0b8043',
      calendarId: 'personal',
      recurrence: 'weekly',
      reminderMinutes: 30,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-5',
      title: 'Client Demo & Feedback',
      description: 'Demonstrating the Smart Calendar AI release to beta enterprise stakeholders.',
      location: 'Executive Briefing Center',
      startDate: getDateStr(2),
      startTime: '11:00',
      endDate: getDateStr(2),
      endTime: '12:00',
      isAllDay: false,
      color: '#1a73e8',
      calendarId: 'work',
      recurrence: 'none',
      reminderMinutes: 15,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-6',
      title: 'TypeScript & GenAI Workshop',
      description: 'Advanced patterns in LLM agent tool calling and structured schemas.',
      location: 'Online Webinar',
      startDate: getDateStr(3),
      startTime: '14:00',
      endDate: getDateStr(3),
      endTime: '16:00',
      isAllDay: false,
      color: '#8e24aa',
      calendarId: 'learning',
      recurrence: 'none',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-7',
      title: 'Team Coffee & Weekly Retro',
      description: 'Casual catch-up and milestone celebration with the crew.',
      location: 'Blue Bottle Cafe',
      startDate: getDateStr(4),
      startTime: '16:00',
      endDate: getDateStr(4),
      endTime: '17:00',
      isAllDay: false,
      color: '#d97706',
      calendarId: 'work',
      recurrence: 'weekly',
      reminderMinutes: 10,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getInitialTasks(): CalendarTask[] {
  const today = new Date();

  const getDateStr = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offsetDays);
    return formatDateToISO(d);
  };

  return [
    {
      id: 'task-1',
      title: 'Review Q4 Roadmap presentation slides',
      notes: 'Ensure KPI metrics and AI feature releases are clearly outlined.',
      dueDate: getDateStr(0),
      dueTime: '17:00',
      priority: 'high',
      calendarId: 'work',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Schedule dentist check-up',
      notes: 'Prefer Thursday afternoon slot after 3 PM.',
      dueDate: getDateStr(1),
      dueTime: '12:00',
      priority: 'medium',
      calendarId: 'personal',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Complete TypeScript 5.8 migration study',
      notes: 'Read release notes and test bundler config.',
      dueDate: getDateStr(3),
      dueTime: '18:00',
      priority: 'low',
      calendarId: 'learning',
      isCompleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: 'Confirm venue for team dinner',
      notes: 'Reserved table for 8 at Osteria.',
      dueDate: getDateStr(-1),
      dueTime: '14:00',
      priority: 'medium',
      calendarId: 'work',
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
}
