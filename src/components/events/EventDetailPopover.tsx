import React, { useRef, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  Bell,
  RotateCcw,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { formatTime12h } from '../../utils/dateUtils';

export const EventDetailPopover: React.FC = () => {
  const {
    selectedEventForPreview,
    setSelectedEventForPreview,
    openEditEventModal,
    deleteEvent,
    toggleEventCompleted,
    categories,
  } = useCalendar();

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedEventForPreview(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSelectedEventForPreview]);

  if (!selectedEventForPreview) return null;

  const { event } = selectedEventForPreview;
  const category = categories.find((c) => c.id === event.calendarId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        ref={popoverRef}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all"
      >
        {/* Top colored header with action buttons */}
        <div
          className="h-16 px-4 flex items-center justify-between text-white relative transition-colors"
          style={{ backgroundColor: event.color || '#1a73e8' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/20 text-white backdrop-blur-xs flex items-center gap-1.5">
              {event.isGoogleCalendar && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#ffffff"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              {event.isGoogleCalendar ? 'Google Calendar' : category?.name || 'Calendar Event'}
            </span>
            {event.isCompleted && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/80 text-white flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Completed
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleEventCompleted(event.id)}
              className="p-1.5 rounded-full hover:bg-black/20 text-white transition-colors"
              title={event.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
            >
              <CheckCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedEventForPreview(null);
                openEditEventModal(event);
              }}
              className="p-1.5 rounded-full hover:bg-black/20 text-white transition-colors"
              title="Edit event"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                deleteEvent(event.id);
                setSelectedEventForPreview(null);
              }}
              className="p-1.5 rounded-full hover:bg-black/20 text-white transition-colors"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedEventForPreview(null)}
              className="p-1.5 rounded-full hover:bg-black/20 text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4">
          <div>
            <h3
              className={`text-xl font-bold text-gray-900 dark:text-white ${
                event.isCompleted ? 'line-through opacity-75' : ''
              }`}
            >
              {event.title}
            </h3>
          </div>

          <div className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(event.startDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {event.isAllDay
                    ? 'All day'
                    : `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`}
                  {event.recurrence && event.recurrence !== 'none' && (
                    <span className="ml-2 inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 capitalize">
                      <RotateCcw className="w-3 h-3" /> {event.recurrence}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-800 dark:text-gray-200">{event.location}</p>
                  {event.location.includes('http') || event.location.includes('meet.google.com') ? (
                    <a
                      href={
                        event.location.startsWith('http')
                          ? event.location
                          : `https://${event.location}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Join Meeting ↗
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Guests ({event.attendees.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.attendees.map((email, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Google Calendar Link */}
            {event.isGoogleCalendar && (
              <div className="flex items-center gap-3 pt-1">
                <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <a
                  href={event.htmlLink || 'https://calendar.google.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open in Google Calendar</span>
                  <span>↗</span>
                </a>
              </div>
            )}

            {/* Reminders */}
            {event.reminderMinutes && (
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Reminder {event.reminderMinutes} minutes before
                </span>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/80">
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
