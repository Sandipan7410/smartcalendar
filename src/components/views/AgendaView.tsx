import React from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { formatTime12h, formatDateToISO } from '../../utils/dateUtils';
import { CalendarEvent } from '../../types/calendar';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';

export const AgendaView: React.FC = () => {
  const {
    visibleEvents,
    setSelectedEventForPreview,
    openCreateEventModal,
    openEditEventModal,
    deleteEvent,
    toggleEventCompleted,
    categories,
  } = useCalendar();

  // Sort events by date and time
  const sortedEvents = [...visibleEvents].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    return a.startTime.localeCompare(b.startTime);
  });

  // Group by date
  const groupedEvents: { [dateStr: string]: CalendarEvent[] } = {};
  for (const ev of sortedEvents) {
    if (!groupedEvents[ev.startDate]) {
      groupedEvents[ev.startDate] = [];
    }
    groupedEvents[ev.startDate].push(ev);
  }

  const dateKeys = Object.keys(groupedEvents).sort();
  const todayStr = formatDateToISO(new Date());

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/50 select-none overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule & Agenda</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Chronological agenda of your upcoming commitments and events.
            </p>
          </div>
          <button
            onClick={() => openCreateEventModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>

        {dateKeys.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">No events scheduled</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add your first event using the button above or ask the AI Assistant.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateKeys.map((dateStr) => {
              const isToday = dateStr === todayStr;
              const dateObj = new Date(dateStr + 'T00:00:00');
              const events = groupedEvents[dateStr];

              return (
                <div key={dateStr} className="space-y-2.5">
                  {/* Date section header */}
                  <div className="flex items-center gap-2 sticky top-0 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-xs py-1.5 z-10">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {dateObj.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {events.length} {events.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  {/* Events list for date */}
                  <div className="space-y-2">
                    {events.map((ev) => {
                      const category = categories.find((c) => c.id === ev.calendarId);

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEventForPreview({ event: ev })}
                          className={`group p-4 rounded-xl border bg-white dark:bg-gray-800 shadow-xs hover:shadow-md transition-all flex items-start gap-4 cursor-pointer ${
                            ev.isCompleted
                              ? 'border-gray-200 dark:border-gray-800 opacity-60'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          {/* Time badge */}
                          <div className="w-24 flex-shrink-0">
                            {ev.isAllDay ? (
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                All Day
                              </span>
                            ) : (
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <div>{formatTime12h(ev.startTime)}</div>
                                <div className="text-[11px] text-gray-400 font-normal">
                                  {formatTime12h(ev.endTime)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ev.color || '#1a73e8' }}
                              />
                              <h4
                                className={`text-sm sm:text-base font-bold text-gray-900 dark:text-white ${
                                  ev.isCompleted ? 'line-through text-gray-400' : ''
                                }`}
                              >
                                {ev.title}
                              </h4>
                              {category && (
                                <span
                                  className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: `${category.color}15`,
                                    color: category.color,
                                  }}
                                >
                                  {category.name}
                                </span>
                              )}
                            </div>

                            {ev.location && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{ev.location}</span>
                              </p>
                            )}

                            {ev.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                {ev.description}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => toggleEventCompleted(ev.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                              title={ev.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                            >
                              <CheckCircle
                                className={`w-4 h-4 ${ev.isCompleted ? 'text-emerald-500' : ''}`}
                              />
                            </button>
                            <button
                              onClick={() => openEditEventModal(ev)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                              title="Edit event"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteEvent(ev.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                              title="Delete event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
