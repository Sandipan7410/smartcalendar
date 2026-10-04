import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  AlignLeft,
  Calendar as CalendarIcon,
  Tag,
  AlertTriangle,
  RotateCcw,
  Bell,
  Trash2,
  Users,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { CalendarEvent, CalendarId, RecurrenceType } from '../../types/calendar';
import { EVENT_COLORS } from '../../utils/colors';
import { formatDateToISO, findConflictsForEvent, checkConflict } from '../../utils/dateUtils';

export const EventModal: React.FC = () => {
  const {
    isEventModalOpen,
    closeEventModal,
    editingEvent,
    eventModalInitialData,
    addEvent,
    updateEvent,
    deleteEvent,
    events,
    categories,
    selectedDate,
    isGoogleConnected,
  } = useCalendar();

  const defaultDateStr = formatDateToISO(selectedDate || new Date());

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(defaultDateStr);
  const [endTime, setEndTime] = useState('11:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState(EVENT_COLORS[0].bgHex);
  const [calendarId, setCalendarId] = useState<CalendarId>('work');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [saveToGoogle, setSaveToGoogle] = useState<boolean>(true);
  const [attendeesText, setAttendeesText] = useState<string>('');
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setLocation(editingEvent.location || '');
      setStartDate(editingEvent.startDate);
      setStartTime(editingEvent.startTime || '10:00');
      setEndDate(editingEvent.endDate || editingEvent.startDate);
      setEndTime(editingEvent.endTime || '11:00');
      setIsAllDay(!!editingEvent.isAllDay);
      setColor(editingEvent.color || EVENT_COLORS[0].bgHex);
      setCalendarId(editingEvent.calendarId || 'work');
      setRecurrence(editingEvent.recurrence || 'none');
      setReminderMinutes(editingEvent.reminderMinutes ?? 15);
      setSaveToGoogle(!!editingEvent.isGoogleCalendar);
      setAttendeesText(editingEvent.attendees ? editingEvent.attendees.join(', ') : '');
    } else if (eventModalInitialData) {
      setTitle(eventModalInitialData.title || '');
      setDescription(eventModalInitialData.description || '');
      setLocation(eventModalInitialData.location || '');
      setStartDate(eventModalInitialData.startDate || defaultDateStr);
      setStartTime(eventModalInitialData.startTime || '10:00');
      setEndDate(eventModalInitialData.endDate || eventModalInitialData.startDate || defaultDateStr);
      setEndTime(eventModalInitialData.endTime || '11:00');
      setIsAllDay(!!eventModalInitialData.isAllDay);
      setColor(eventModalInitialData.color || EVENT_COLORS[0].bgHex);
      setCalendarId(eventModalInitialData.calendarId || 'work');
      setRecurrence(eventModalInitialData.recurrence || 'none');
      setReminderMinutes(eventModalInitialData.reminderMinutes ?? 15);
      setSaveToGoogle(isGoogleConnected);
      setAttendeesText(
        eventModalInitialData.attendees ? eventModalInitialData.attendees.join(', ') : ''
      );
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setStartDate(defaultDateStr);
      setStartTime('10:00');
      setEndDate(defaultDateStr);
      setEndTime('11:00');
      setIsAllDay(false);
      setColor(EVENT_COLORS[0].bgHex);
      setCalendarId('work');
      setRecurrence('none');
      setReminderMinutes(15);
      setSaveToGoogle(isGoogleConnected);
      setAttendeesText('');
    }
  }, [editingEvent, eventModalInitialData, isEventModalOpen, defaultDateStr, isGoogleConnected]);

  // Live conflict detection
  useEffect(() => {
    if (isAllDay || !startDate || !startTime || !endTime) {
      setConflicts([]);
      return;
    }
    const target = {
      id: editingEvent?.id || 'temp',
      title,
      startDate,
      startTime,
      endDate,
      endTime,
      isAllDay,
      color,
      calendarId,
      recurrence,
      createdAt: '',
    };
    const found = events.filter(
      (ev) => ev.id !== editingEvent?.id && checkConflict(target, ev)
    );
    setConflicts(found);
  }, [startDate, startTime, endDate, endTime, isAllDay, events, editingEvent, title]);

  if (!isEventModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const attendeesList = attendeesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes('@'));

    if (editingEvent) {
      await updateEvent({
        ...editingEvent,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        startTime: isAllDay ? '09:00' : startTime,
        endDate: endDate || startDate,
        endTime: isAllDay ? '10:00' : endTime,
        isAllDay,
        color,
        calendarId,
        recurrence,
        reminderMinutes: Number(reminderMinutes),
        attendees: attendeesList,
      });
    } else {
      await addEvent(
        {
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          startDate,
          startTime: isAllDay ? '09:00' : startTime,
          endDate: endDate || startDate,
          endTime: isAllDay ? '10:00' : endTime,
          isAllDay,
          color,
          calendarId,
          recurrence,
          reminderMinutes: Number(reminderMinutes),
          attendees: attendeesList,
        },
        { saveToGoogle: isGoogleConnected && saveToGoogle }
      );
    }

    closeEventModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingEvent ? 'Edit Event' : 'Create Event'}
          </h2>
          <div className="flex items-center gap-1">
            {editingEvent && (
              <button
                type="button"
                onClick={() => {
                  deleteEvent(editingEvent.id);
                  closeEventModal();
                }}
                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeEventModal}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Conflict warning banner */}
          {conflicts.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Scheduling Conflict Detected:</span>
                <p className="mt-0.5">
                  Overlaps with {conflicts.map((c) => `"${c.title}" (${c.startTime}–${c.endTime})`).join(', ')}.
                </p>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <input
              type="text"
              required
              autoFocus
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-semibold px-3 py-2 border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-600 dark:focus:border-blue-500 bg-transparent text-gray-900 dark:text-white outline-none transition-colors placeholder:text-gray-400"
            />
          </div>

          {/* Toggles: All Day and Save to Google Calendar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 focus:ring-offset-0"
              />
              <span>All-day event</span>
            </label>

            {isGoogleConnected ? (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                <input
                  type="checkbox"
                  checked={saveToGoogle}
                  onChange={(e) => setSaveToGoogle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0"
                />
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Save to Google Calendar</span>
              </label>
            ) : null}
          </div>

          {/* Date & Time Grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {!isAllDay && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pl-6">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {!isAllDay && (
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recurrence & Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Repeat</label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Notification</label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>No reminder</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calendar Category & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Calendar</label>
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value as CalendarId)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Event Color</label>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.bgHex)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      color.toLowerCase() === c.bgHex.toLowerCase()
                        ? 'scale-125 ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.bgHex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 pt-1">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Add location or video call link"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Attendees */}
          <div className="flex items-center gap-2 pt-1">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Invite guests (comma-separated emails)"
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Description */}
          <div className="flex items-start gap-2 pt-1">
            <AlignLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
            <textarea
              rows={3}
              placeholder="Add description, agenda or meeting notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={closeEventModal}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
