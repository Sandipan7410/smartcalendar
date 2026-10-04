import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  CalendarEvent,
  CalendarTask,
  CalendarCategory,
  CalendarViewType,
  CalendarId,
} from '../types/calendar';
import { INITIAL_CATEGORIES, getInitialEvents, getInitialTasks } from '../utils/mockData';
import { formatDateToISO, isSameDay } from '../utils/dateUtils';
import { downloadICSFile, parseICSContent } from '../utils/ics';
import { sound } from '../utils/sound';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  setCachedAccessToken,
  ConnectedGoogleUser,
} from '../services/googleAuth';
import {
  fetchGoogleEvents,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
} from '../services/googleCalendar';

interface CalendarContextType {
  events: CalendarEvent[];
  visibleEvents: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  currentDate: Date;
  selectedDate: Date;
  currentView: CalendarViewType;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  isAIAssistantOpen: boolean;
  activeMobileTab: 'calendar' | 'tasks' | 'ai';
  searchQuery: string;
  isSearchOpen: boolean;
  isShortcutsOpen: boolean;
  isEventModalOpen: boolean;
  editingEvent: CalendarEvent | null;
  eventModalInitialData: Partial<CalendarEvent> | null;
  isTaskModalOpen: boolean;
  editingTask: CalendarTask | null;
  selectedEventForPreview: { event: CalendarEvent; rect?: DOMRect } | null;
  browserNotificationsAllowed: boolean;
  toasts: Array<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' }>;

  // Google Calendar Integration State
  googleUser: ConnectedGoogleUser | null;
  isGoogleConnected: boolean;
  isSyncingGoogle: boolean;
  lastSyncedGoogleTime: Date | null;
  googleSyncError: string | null;
  confirmDeleteModal: { isOpen: boolean; event: CalendarEvent | null };

  // Actions
  connectGoogleCalendar: () => Promise<boolean>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncGoogleCalendar: () => Promise<void>;
  closeConfirmDeleteModal: () => void;
  confirmDeleteEvent: () => Promise<void>;

  addEvent: (
    event: Omit<CalendarEvent, 'id' | 'createdAt'> & { id?: string },
    options?: { saveToGoogle?: boolean }
  ) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string, skipConfirm?: boolean) => void;
  toggleEventCompleted: (id: string) => void;
  moveEventDate: (id: string, newDateStr: string) => void;
  addTask: (task: Omit<CalendarTask, 'id' | 'createdAt'> & { id?: string }) => CalendarTask;
  updateTask: (task: CalendarTask) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompleted: (id: string) => void;
  convertTaskToEvent: (task: CalendarTask) => void;
  toggleCategoryVisibility: (id: CalendarId) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date) => void;
  setCurrentView: (view: CalendarViewType) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  toggleAIAssistant: (open?: boolean) => void;
  setActiveMobileTab: (tab: 'calendar' | 'tasks' | 'ai') => void;
  setSearchQuery: (q: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  openCreateEventModal: (initialData?: Partial<CalendarEvent>) => void;
  openEditEventModal: (event: CalendarEvent) => void;
  closeEventModal: () => void;
  openCreateTaskModal: (initialData?: Partial<CalendarTask>) => void;
  openEditTaskModal: (task: CalendarTask) => void;
  closeTaskModal: () => void;
  setSelectedEventForPreview: (data: { event: CalendarEvent; rect?: DOMRect } | null) => void;
  requestNotificationPermission: () => Promise<boolean>;
  exportICS: () => void;
  importICS: (text: string) => number;
  navigateToday: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

const CalendarContext = createContext<CalendarContextType | null>(null);

const STORAGE_KEYS = {
  EVENTS: 'smart_calendar_events_v2',
  TASKS: 'smart_calendar_tasks_v2',
  CATEGORIES: 'smart_calendar_categories_v2',
  THEME: 'smart_calendar_theme_v2',
  VIEW: 'smart_calendar_view_v2',
  GOOGLE_USER: 'smart_calendar_google_user',
};

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load saved events or seed with realistic events
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading events from storage', e);
    }
    return getInitialEvents();
  });

  // Load saved tasks or seed
  const [tasks, setTasks] = useState<CalendarTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading tasks from storage', e);
    }
    return getInitialTasks();
  });

  // Load categories
  const [categories, setCategories] = useState<CalendarCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading categories', e);
    }
    return INITIAL_CATEGORIES;
  });

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved !== null) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Active View
  const [currentView, setCurrentView] = useState<CalendarViewType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW);
      if (saved) return saved as CalendarViewType;
    } catch {}
    return 'month';
  });

  // Dates
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'calendar' | 'tasks' | 'ai'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventModalInitialData, setEventModalInitialData] = useState<Partial<CalendarEvent> | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);

  const [selectedEventForPreview, setSelectedEventForPreview] = useState<{
    event: CalendarEvent;
    rect?: DOMRect;
  } | null>(null);

  const [browserNotificationsAllowed, setBrowserNotificationsAllowed] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' }>
  >([]);

  // Google Calendar Integration State
  const [googleUser, setGoogleUser] = useState<ConnectedGoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOOGLE_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);
  const [lastSyncedGoogleTime, setLastSyncedGoogleTime] = useState<Date | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);

  // Destructive delete confirmation modal
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    event: CalendarEvent | null;
  }>({ isOpen: false, event: null });

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [isDarkMode]);

  // Persist events & tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error(e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW, currentView);
    } catch (e) {}
  }, [currentView]);

  // Toast notification helper
  const showToast = useCallback(
    (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Google Calendar Synchronization logic
  const syncGoogleCalendar = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setGoogleSyncError('Google authorization expired. Please reconnect.');
      return;
    }

    setIsSyncingGoogle(true);
    setGoogleSyncError(null);

    try {
      const gEvents = await fetchGoogleEvents(token);

      setEvents((prev) => {
        // Build map of existing non-google events
        const nonGoogleEvents = prev.filter((e) => !e.isGoogleCalendar);
        // Replace or add google events
        return [...nonGoogleEvents, ...gEvents];
      });

      setLastSyncedGoogleTime(new Date());
      showToast(
        'Google Calendar Synced',
        `Successfully updated ${gEvents.length} events from Google Calendar.`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to sync Google Calendar:', err);
      const errMsg = err?.message || 'Failed to sync with Google Calendar';
      setGoogleSyncError(errMsg);
      showToast('Sync Failed', errMsg, 'warning');
    } finally {
      setIsSyncingGoogle(false);
    }
  }, [showToast]);

  // Initialize Firebase Auth listener on startup
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        setIsGoogleConnected(true);
        localStorage.setItem(STORAGE_KEYS.GOOGLE_USER, JSON.stringify(user));
        // Auto-sync on startup
        syncGoogleCalendar();
      },
      () => {
        setIsGoogleConnected(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [syncGoogleCalendar]);

  // Connect Google Calendar
  const connectGoogleCalendar = async (): Promise<boolean> => {
    try {
      setIsSyncingGoogle(true);
      const result = await googleSignIn();
      if (!result) return false;

      setGoogleUser(result.user);
      setIsGoogleConnected(true);
      localStorage.setItem(STORAGE_KEYS.GOOGLE_USER, JSON.stringify(result.user));

      showToast(
        'Google Calendar Connected',
        `Connected as ${result.user.displayName || result.user.email}. Syncing events...`,
        'success'
      );

      // Immediately sync events
      await syncGoogleCalendar();
      return true;
    } catch (error: any) {
      console.error('Google Calendar connection failed:', error);
      showToast('Connection Error', error?.message || 'Could not connect Google Calendar', 'warning');
      return false;
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = async (): Promise<void> => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setIsGoogleConnected(false);
      setCachedAccessToken(null);
      localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER);

      // Remove synced Google Calendar events
      setEvents((prev) => prev.filter((e) => !e.isGoogleCalendar));
      showToast('Disconnected', 'Your Google Calendar account has been disconnected.', 'info');
    } catch (err: any) {
      showToast('Error', 'Failed to disconnect account: ' + err?.message, 'warning');
    }
  };

  // Notification permissions check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotificationsAllowed(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        setBrowserNotificationsAllowed(granted);
        if (granted) {
          sound.playNotificationChime();
          showToast('Notifications Enabled', 'You will receive reminders for upcoming events.', 'success');
        }
        return granted;
      } catch {
        return false;
      }
    }
    return false;
  };

  // Filter visible events based on categories
  const visibleCategories = new Set(categories.filter((c) => c.visible).map((c) => c.id));
  const visibleEvents = events.filter((ev) => visibleCategories.has(ev.calendarId));

  // Add Event (with optional Google Calendar sync)
  const addEvent = async (
    eventData: Omit<CalendarEvent, 'id' | 'createdAt'> & { id?: string },
    options?: { saveToGoogle?: boolean }
  ): Promise<CalendarEvent> => {
    let finalEvent: CalendarEvent = {
      ...eventData,
      id: eventData.id || 'ev-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };

    const token = await getAccessToken();
    const shouldSaveToGoogle = options?.saveToGoogle ?? (isGoogleConnected && !!token);

    if (shouldSaveToGoogle && token) {
      try {
        const createdGoogleEv = await createGoogleEvent(token, finalEvent, finalEvent.attendees);
        finalEvent = {
          ...finalEvent,
          id: createdGoogleEv.id,
          googleEventId: createdGoogleEv.googleEventId,
          isGoogleCalendar: true,
          htmlLink: createdGoogleEv.htmlLink,
        };
        showToast('Created & Synced', `"${finalEvent.title}" added to your Google Calendar.`, 'success');
      } catch (err: any) {
        console.error('Failed to create in Google Calendar:', err);
        showToast('Local Only', `Saved locally. Google Calendar sync failed: ${err.message}`, 'warning');
      }
    } else {
      showToast('Event Created', `"${finalEvent.title}" added to calendar.`, 'success');
    }

    setEvents((prev) => [...prev, finalEvent]);
    return finalEvent;
  };

  // Update Event
  const updateEvent = async (updated: CalendarEvent): Promise<void> => {
    const token = await getAccessToken();
    if (updated.googleEventId && isGoogleConnected && token) {
      try {
        await updateGoogleEvent(token, updated.googleEventId, updated, updated.attendees);
        showToast('Updated in Google Calendar', `"${updated.title}" updated successfully.`, 'success');
      } catch (err: any) {
        console.error('Failed to update in Google Calendar:', err);
        showToast('Update Failed', `Could not update Google Calendar: ${err.message}`, 'warning');
      }
    } else {
      showToast('Event Updated', `"${updated.title}" updated successfully.`, 'info');
    }

    setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
  };

  // Delete Event with Mandatory Confirmation for Google Calendar
  const deleteEvent = (id: string, skipConfirm = false) => {
    const toDelete = events.find((e) => e.id === id);
    if (!toDelete) return;

    if (toDelete.isGoogleCalendar && toDelete.googleEventId && isGoogleConnected && !skipConfirm) {
      // Open explicit confirmation modal
      setConfirmDeleteModal({ isOpen: true, event: toDelete });
      return;
    }

    // Direct local delete
    performDeleteEvent(toDelete);
  };

  const closeConfirmDeleteModal = () => {
    setConfirmDeleteModal({ isOpen: false, event: null });
  };

  const confirmDeleteEvent = async () => {
    const event = confirmDeleteModal.event;
    if (!event) return;

    closeConfirmDeleteModal();
    const token = await getAccessToken();

    if (event.googleEventId && isGoogleConnected && token) {
      try {
        await deleteGoogleEvent(token, event.googleEventId);
        showToast('Deleted from Google Calendar', `"${event.title}" removed.`, 'success');
      } catch (err: any) {
        console.error('Failed to delete Google event:', err);
        showToast('Delete Failed', `Could not delete from Google Calendar: ${err.message}`, 'warning');
      }
    }

    performDeleteEvent(event);
  };

  const performDeleteEvent = (event: CalendarEvent) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
    if (selectedEventForPreview?.event.id === event.id) {
      setSelectedEventForPreview(null);
    }
    showToast('Event Deleted', `"${event.title}" removed from calendar.`, 'info');
  };

  const toggleEventCompleted = (id: string) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id === id) {
          const nextState = !ev.isCompleted;
          if (nextState) sound.playTaskCompleteSound();
          return { ...ev, isCompleted: nextState };
        }
        return ev;
      })
    );
  };

  const moveEventDate = async (id: string, newDateStr: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    const updated: CalendarEvent = {
      ...target,
      startDate: newDateStr,
      endDate: newDateStr,
    };

    await updateEvent(updated);
  };

  // Task actions
  const addTask = (taskData: Omit<CalendarTask, 'id' | 'createdAt'> & { id?: string }): CalendarTask => {
    const newTask: CalendarTask = {
      ...taskData,
      id: taskData.id || 'task-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast('Task Added', `"${newTask.title}" added to tasks.`, 'success');
    return newTask;
  };

  const updateTask = (updated: CalendarTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showToast('Task Updated', `"${updated.title}" updated.`, 'info');
  };

  const deleteTask = (id: string) => {
    const toDelete = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Task Deleted', `"${toDelete?.title || 'Task'}" removed.`, 'info');
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.isCompleted;
          if (nextState) sound.playTaskCompleteSound();
          return {
            ...t,
            isCompleted: nextState,
            completedAt: nextState ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const convertTaskToEvent = (task: CalendarTask) => {
    const dateStr = task.dueDate || formatDateToISO(new Date());
    const startTimeStr = task.dueTime || '10:00';
    const [h, m] = startTimeStr.split(':').map(Number);
    const endMinutes = h * 60 + m + 60;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const newEvent: CalendarEvent = {
      id: 'ev-from-task-' + task.id,
      title: task.title,
      description: task.notes || 'Converted from task: ' + task.title,
      startDate: dateStr,
      startTime: startTimeStr,
      endDate: dateStr,
      endTime: endTimeStr,
      isAllDay: false,
      color: task.priority === 'high' ? '#e11d48' : '#1a73e8',
      calendarId: task.calendarId,
      recurrence: 'none',
      reminderMinutes: 15,
      createdAt: new Date().toISOString(),
    };

    addEvent(newEvent, { saveToGoogle: isGoogleConnected });
  };

  const toggleCategoryVisibility = (id: CalendarId) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, visible: !cat.visible } : cat))
    );
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleAIAssistant = (open?: boolean) => {
    setIsAIAssistantOpen((prev) => (open !== undefined ? open : !prev));
  };

  // Navigation
  const navigateToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (currentView === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (currentView === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Modals
  const openCreateEventModal = (initialData?: Partial<CalendarEvent>) => {
    setEditingEvent(null);
    setEventModalInitialData(initialData || null);
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventModalInitialData(null);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventModalInitialData(null);
  };

  const openCreateTaskModal = (initialData?: Partial<CalendarTask>) => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: CalendarTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // ICS Export & Import
  const exportICS = () => {
    downloadICSFile(events, `smart-calendar-${formatDateToISO(new Date())}.ics`);
    showToast('Calendar Exported', 'Downloaded .ics file containing all events.', 'success');
  };

  const importICS = (text: string): number => {
    try {
      const parsed = parseICSContent(text);
      if (parsed.length === 0) {
        showToast('Import Failed', 'No valid events found in .ics file.', 'warning');
        return 0;
      }

      const newEvents: CalendarEvent[] = parsed.map((p) => ({
        id: p.id || 'ev-import-' + Math.random().toString(36).substring(2, 9),
        title: p.title || 'Imported Event',
        description: p.description || '',
        location: p.location || '',
        startDate: p.startDate || formatDateToISO(new Date()),
        startTime: p.startTime || '09:00',
        endDate: p.endDate || p.startDate || formatDateToISO(new Date()),
        endTime: p.endTime || '10:00',
        isAllDay: !!p.isAllDay,
        color: p.color || '#1a73e8',
        calendarId: (p.calendarId as CalendarId) || 'personal',
        recurrence: p.recurrence || 'none',
        createdAt: new Date().toISOString(),
      }));

      setEvents((prev) => [...prev, ...newEvents]);
      showToast('Calendar Imported', `Successfully imported ${newEvents.length} events!`, 'success');
      return newEvents.length;
    } catch (e: any) {
      showToast('Import Error', 'Failed to parse .ics calendar file.', 'warning');
      return 0;
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        visibleEvents,
        tasks,
        categories,
        currentDate,
        selectedDate,
        currentView,
        isDarkMode,
        isSidebarOpen,
        isAIAssistantOpen,
        activeMobileTab,
        searchQuery,
        isSearchOpen,
        isShortcutsOpen,
        isEventModalOpen,
        editingEvent,
        eventModalInitialData,
        isTaskModalOpen,
        editingTask,
        selectedEventForPreview,
        browserNotificationsAllowed,
        toasts,
        googleUser,
        isGoogleConnected,
        isSyncingGoogle,
        lastSyncedGoogleTime,
        googleSyncError,
        confirmDeleteModal,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        syncGoogleCalendar,
        closeConfirmDeleteModal,
        confirmDeleteEvent,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleEventCompleted,
        moveEventDate,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompleted,
        convertTaskToEvent,
        toggleCategoryVisibility,
        setCurrentDate,
        setSelectedDate,
        setCurrentView,
        toggleDarkMode,
        toggleSidebar,
        toggleAIAssistant,
        setActiveMobileTab,
        setSearchQuery,
        setIsSearchOpen,
        setIsShortcutsOpen,
        openCreateEventModal,
        openEditEventModal,
        closeEventModal,
        openCreateTaskModal,
        openEditTaskModal,
        closeTaskModal,
        setSelectedEventForPreview,
        requestNotificationPermission,
        exportICS,
        importICS,
        navigateToday,
        navigatePrev,
        navigateNext,
        dismissToast,
        showToast,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
