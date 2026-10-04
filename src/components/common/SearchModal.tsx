import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar as CalendarIcon, CheckSquare, Clock, MapPin } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { formatTime12h, parseISODate } from '../../utils/dateUtils';
import { CalendarEvent, CalendarTask } from '../../types/calendar';

export const SearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    events,
    tasks,
    setSelectedEventForPreview,
    setCurrentDate,
    setCurrentView,
    openEditTaskModal,
  } = useCalendar();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingEvents: CalendarEvent[] = q
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      )
    : [];

  const matchingTasks: CalendarTask[] = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      )
    : [];

  const handleSelectEvent = (ev: CalendarEvent) => {
    setIsSearchOpen(false);
    setCurrentDate(parseISODate(ev.startDate));
    setSelectedEventForPreview({ event: ev });
  };

  const handleSelectTask = (task: CalendarTask) => {
    setIsSearchOpen(false);
    openEditTaskModal(task);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search events, meetings, tasks, locations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 outline-none text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {!q ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Type to search across all your calendars and tasks...
            </div>
          ) : matchingEvents.length === 0 && matchingTasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No results found for "{query}".
            </div>
          ) : (
            <>
              {matchingEvents.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" /> Events ({matchingEvents.length})
                  </h4>
                  <div className="space-y-1">
                    {matchingEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => handleSelectEvent(ev)}
                        className="p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: ev.color || '#1a73e8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{ev.startDate}</span>
                            <span>•</span>
                            <span>{ev.isAllDay ? 'All Day' : formatTime12h(ev.startTime)}</span>
                            {ev.location && (
                              <>
                                <span>•</span>
                                <span className="truncate">{ev.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchingTasks.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks ({matchingTasks.length})
                  </h4>
                  <div className="space-y-1">
                    {matchingTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className="p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors flex items-start gap-3"
                      >
                        <CheckSquare className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${
                              task.isCompleted ? 'line-through text-gray-400' : ''
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Due {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
