import React, { useRef, useEffect } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getWeekDays, formatTime12h, timeToMinutes, formatDateToISO } from '../../utils/dateUtils';
import { CalendarEvent } from '../../types/calendar';

export const WeekView: React.FC = () => {
  const {
    currentDate,
    visibleEvents,
    setSelectedEventForPreview,
    openCreateEventModal,
    setSelectedDate,
  } = useCalendar();

  const scrollRef = useRef<HTMLDivElement>(null);
  const weekDays = getWeekDays(currentDate);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourHeight = 60; // 60px per hour

  // Scroll to 8 AM by default on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * hourHeight;
    }
  }, []);

  const now = new Date();
  const todayStr = formatDateToISO(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentLineTop = (currentMinutes / 60) * hourHeight;

  // Filter all-day events vs timed events
  const weekDateStrings = new Set(weekDays.map((d) => d.dateString));
  const weekEvents = visibleEvents.filter((ev) => weekDateStrings.has(ev.startDate));

  const allDayEvents = weekEvents.filter((ev) => ev.isAllDay);
  const timedEvents = weekEvents.filter((ev) => !ev.isAllDay);

  // Group timed events by day
  const getTimedEventsForDay = (dateStr: string) => {
    return timedEvents.filter((ev) => ev.startDate === dateStr);
  };

  const getAllDayEventsForDay = (dateStr: string) => {
    return allDayEvents.filter((ev) => ev.startDate === dateStr);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 select-none overflow-hidden">
      {/* Header with 7 Days */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 pr-4">
        {/* Time column header placeholder */}
        <div className="w-14 sm:w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 p-2 text-center text-[10px] text-gray-400 font-mono">
          GMT
        </div>

        {/* 7 Day Headers */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800">
          {weekDays.map((d, index) => (
            <div
              key={index}
              onClick={() => setSelectedDate(d.date)}
              className="py-2.5 px-1 text-center cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wider">
                {d.dayName.toUpperCase()}
              </div>
              <div
                className={`w-7 h-7 mx-auto mt-0.5 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  d.isToday
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {d.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All-Day Events Row (if any exist this week) */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/40 min-h-[36px]">
          <div className="w-14 sm:w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 p-1.5 text-[10px] text-gray-400 font-medium text-center">
            All-day
          </div>
          <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800 p-1 gap-1">
            {weekDays.map((d, index) => {
              const dayAllDay = getAllDayEventsForDay(d.dateString);
              return (
                <div key={index} className="space-y-1">
                  {dayAllDay.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventForPreview({ event: ev })}
                      className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate shadow-2xs hover:brightness-110 cursor-pointer"
                      style={{ backgroundColor: ev.color || '#1a73e8' }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative flex">
        {/* Time label column */}
        <div className="w-14 sm:w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 select-none bg-white dark:bg-gray-900 z-10">
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: `${hourHeight}px` }}
              className="text-right pr-2 -mt-2.5 text-[11px] text-gray-400 font-mono"
            >
              {hour === 0 ? '' : formatTime12h(`${String(hour).padStart(2, '0')}:00`)}
            </div>
          ))}
        </div>

        {/* 7-column time grid */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-800 relative">
          {/* Horizontal Hour Lines across all days */}
          <div className="absolute inset-0 pointer-events-none">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ top: `${hour * hourHeight}px`, height: `${hourHeight}px` }}
                className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/80"
              />
            ))}
          </div>

          {/* Current Time Indicator Line (if today is in current week) */}
          {weekDays.some((d) => d.dateString === todayStr) && (
            <div
              style={{ top: `${currentLineTop}px` }}
              className="absolute inset-x-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
            >
              <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-sm" />
            </div>
          )}

          {/* Day columns */}
          {weekDays.map((d, dayIndex) => {
            const dayEvents = getTimedEventsForDay(d.dateString);

            return (
              <div
                key={dayIndex}
                style={{ height: `${24 * hourHeight}px` }}
                className="relative hover:bg-blue-50/10 dark:hover:bg-blue-950/5 transition-colors cursor-pointer"
                onClick={(e) => {
                  // Calculate clicked hour
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickedMinutes = Math.floor((clickY / hourHeight) * 60);
                  const startH = Math.floor(clickedMinutes / 60);
                  const startM = Math.floor((clickedMinutes % 60) / 15) * 15;
                  const endH = startH + 1;

                  const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                  const endStr = `${String(endH % 24).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

                  openCreateEventModal({
                    startDate: d.dateString,
                    endDate: d.dateString,
                    startTime: startStr,
                    endTime: endStr,
                    isAllDay: false,
                  });
                }}
              >
                {/* Timed Event Blocks */}
                {dayEvents.map((ev) => {
                  const startMin = timeToMinutes(ev.startTime);
                  const endMin = timeToMinutes(ev.endTime);
                  const durationMin = Math.max(endMin - startMin, 25);

                  const top = (startMin / 60) * hourHeight;
                  const height = Math.max((durationMin / 60) * hourHeight, 22);

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
                        borderLeft: `4px solid ${ev.color || '#1a73e8'}`,
                        color: ev.color || '#1a73e8',
                      }}
                      className={`absolute inset-x-1 p-1 sm:p-1.5 rounded-md text-xs font-semibold overflow-hidden shadow-2xs hover:shadow-md hover:brightness-95 transition-all z-10 cursor-pointer ${
                        ev.isCompleted ? 'line-through opacity-60' : ''
                      }`}
                      title={`${ev.title} (${ev.startTime} - ${ev.endTime})`}
                    >
                      <div className="font-bold truncate text-[11px]">{ev.title}</div>
                      <div className="text-[10px] opacity-80 truncate">
                        {formatTime12h(ev.startTime)} – {formatTime12h(ev.endTime)}
                      </div>
                      {ev.location && height > 45 && (
                        <div className="text-[10px] opacity-75 truncate mt-0.5">
                          📍 {ev.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
