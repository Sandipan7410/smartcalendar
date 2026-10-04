import React, { useRef, useEffect } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { formatTime12h, timeToMinutes, formatDateToISO } from '../../utils/dateUtils';
import { Clock, MapPin, CheckCircle2, Plus, Calendar as CalendarIcon } from 'lucide-react';

export const DayView: React.FC = () => {
  const {
    currentDate,
    visibleEvents,
    tasks,
    setSelectedEventForPreview,
    openCreateEventModal,
    openCreateTaskModal,
  } = useCalendar();

  const scrollRef = useRef<HTMLDivElement>(null);
  const hourHeight = 70; // 70px per hour
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * hourHeight;
    }
  }, []);

  const dateStr = formatDateToISO(currentDate);
  const now = new Date();
  const isToday = dateStr === formatDateToISO(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentLineTop = (currentMinutes / 60) * hourHeight;

  const dayEvents = visibleEvents.filter((ev) => ev.startDate === dateStr);
  const dayTasks = tasks.filter((t) => t.dueDate === dateStr);

  const allDayEvents = dayEvents.filter((ev) => ev.isAllDay);
  const timedEvents = dayEvents.filter((ev) => !ev.isAllDay);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 select-none overflow-hidden">
      {/* Day Header with Tasks summary */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-md ${
              isToday ? 'bg-blue-600' : 'bg-gray-700 dark:bg-gray-800'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider opacity-80">
              {currentDate.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="text-xl leading-none">{currentDate.getDate()}</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>{dayEvents.length} events scheduled</span>
              <span>•</span>
              <span>{dayTasks.filter((t) => !t.isCompleted).length} tasks due</span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              openCreateEventModal({
                startDate: dateStr,
                endDate: dateStr,
                startTime: '10:00',
                endTime: '11:00',
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
          <button
            onClick={() => openCreateTaskModal({ dueDate: dateStr })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* All-Day Events & Tasks bar */}
      {(allDayEvents.length > 0 || dayTasks.length > 0) && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/40 space-y-1.5">
          {allDayEvents.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-16">
                All-Day
              </span>
              {allDayEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEventForPreview({ event: ev })}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-white truncate shadow-2xs hover:brightness-110"
                  style={{ backgroundColor: ev.color || '#1a73e8' }}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          )}

          {dayTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider w-16">
                Tasks Due
              </span>
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${
                    t.isCompleted
                      ? 'border-gray-200 bg-gray-100 dark:bg-gray-800 text-gray-400 line-through'
                      : 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.title}</span>
                  {t.dueTime && <span className="opacity-75">({t.dueTime})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scrollable Day Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative flex">
        {/* Time labels */}
        <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: `${hourHeight}px` }}
              className="text-right pr-3 -mt-2.5 text-xs text-gray-400 font-mono"
            >
              {hour === 0 ? '' : formatTime12h(`${String(hour).padStart(2, '0')}:00`)}
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div
          style={{ height: `${24 * hourHeight}px` }}
          className="flex-1 relative cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clickedMinutes = Math.floor((clickY / hourHeight) * 60);
            const startH = Math.floor(clickedMinutes / 60);
            const startM = Math.floor((clickedMinutes % 60) / 15) * 15;
            const endH = startH + 1;

            const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
            const endStr = `${String(endH % 24).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

            openCreateEventModal({
              startDate: dateStr,
              endDate: dateStr,
              startTime: startStr,
              endTime: endStr,
              isAllDay: false,
            });
          }}
        >
          {/* Horizontal Hour Lines & 30-min half-hour lines */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div
                style={{ top: `${hour * hourHeight}px` }}
                className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/80 pointer-events-none"
              />
              <div
                style={{ top: `${hour * hourHeight + hourHeight / 2}px` }}
                className="absolute inset-x-0 border-t border-gray-50 dark:border-gray-900 pointer-events-none border-dashed"
              />
            </React.Fragment>
          ))}

          {/* Current Time Indicator Line */}
          {isToday && (
            <div
              style={{ top: `${currentLineTop}px` }}
              className="absolute inset-x-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 -ml-1.5 shadow-md ring-2 ring-white dark:ring-gray-900" />
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded ml-2">
                {formatTime12h(
                  `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                )}
              </span>
            </div>
          )}

          {/* Timed Events */}
          {timedEvents.map((ev) => {
            const startMin = timeToMinutes(ev.startTime);
            const endMin = timeToMinutes(ev.endTime);
            const durationMin = Math.max(endMin - startMin, 30);

            const top = (startMin / 60) * hourHeight;
            const height = Math.max((durationMin / 60) * hourHeight, 32);

            return (
              <div
                key={ev.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEventForPreview({ event: ev });
                }}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: `${ev.color || '#1a73e8'}1f`,
                  borderLeft: `5px solid ${ev.color || '#1a73e8'}`,
                  color: ev.color || '#1a73e8',
                }}
                className={`absolute inset-x-4 p-2.5 rounded-xl shadow-xs hover:shadow-lg hover:brightness-95 transition-all z-10 cursor-pointer overflow-hidden ${
                  ev.isCompleted ? 'opacity-60 line-through' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                      {ev.title}
                    </h4>
                    <p className="text-xs font-semibold opacity-90 mt-0.5">
                      {formatTime12h(ev.startTime)} – {formatTime12h(ev.endTime)}
                    </p>
                  </div>
                  {ev.isCompleted && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  )}
                </div>

                {ev.location && height > 55 && (
                  <div className="flex items-center gap-1.5 text-xs opacity-80 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}

                {ev.description && height > 75 && (
                  <p className="text-xs opacity-75 mt-1 line-clamp-2">{ev.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
