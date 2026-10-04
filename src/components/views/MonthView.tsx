import React, { useState } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getMonthDays, formatTime12h, formatDateToISO } from '../../utils/dateUtils';
import { CalendarEvent } from '../../types/calendar';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { MonthViewWeatherHeader } from '../weather/MonthViewWeatherHeader';
import { WeatherIcon } from '../weather/WeatherIcon';
import { DailyForecast } from '../../types/weather';

export const MonthView: React.FC = () => {
  const {
    currentDate,
    visibleEvents,
    setSelectedEventForPreview,
    openCreateEventModal,
    moveEventDate,
    setSelectedDate,
    setCurrentView,
  } = useCalendar();

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dayOverflowModalDate, setDayOverflowModalDate] = useState<string | null>(null);
  const [forecastDays, setForecastDays] = useState<DailyForecast[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthDays(year, month);

  const weekDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', eventId);
    setDraggedEventId(eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain') || draggedEventId;
    if (eventId) {
      moveEventDate(eventId, targetDateStr);
    }
    setDraggedEventId(null);
  };

  // Day Overflow Modal Events
  const overflowEvents = dayOverflowModalDate
    ? visibleEvents.filter((ev) => ev.startDate === dayOverflowModalDate)
    : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 select-none overflow-hidden">
      {/* 5-Day Weather Forecast Header */}
      <MonthViewWeatherHeader onForecastChange={setForecastDays} />

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70">
        {weekDayNames.map((name, i) => (
          <div
            key={i}
            className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 border-b border-gray-200 dark:border-gray-800 divide-x divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden">
        {days.map((item, index) => {
          const eventsOnDay = visibleEvents.filter((ev) => ev.startDate === item.dateString);
          const maxVisible = 3;
          const displayEvents = eventsOnDay.slice(0, maxVisible);
          const extraCount = eventsOnDay.length - maxVisible;
          const weatherOnDay = forecastDays.find((f) => f.date === item.dateString);

          return (
            <div
              key={index}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.dateString)}
              onClick={() => {
                setSelectedDate(item.date);
                openCreateEventModal({ startDate: item.dateString, endDate: item.dateString });
              }}
              className={`group relative p-1 sm:p-1.5 flex flex-col min-h-0 transition-colors cursor-pointer ${
                item.isCurrentMonth
                  ? 'bg-white dark:bg-gray-900 hover:bg-blue-50/20 dark:hover:bg-blue-950/10'
                  : 'bg-gray-50/50 dark:bg-gray-950/40 text-gray-400'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-all shrink-0 ${
                      item.isToday
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : item.isCurrentMonth
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  >
                    {item.dayNumber}
                  </span>

                  {/* Weather indicator on this calendar date */}
                  {weatherOnDay && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(item.date);
                        openCreateEventModal({
                          startDate: item.dateString,
                          endDate: item.dateString,
                          title: weatherOnDay.precipitationProb >= 40 ? 'Indoor Activity' : 'Outdoor Gathering',
                          description: `Planned for weather: ${weatherOnDay.condition}, High ${weatherOnDay.maxTempF}°F / Low ${weatherOnDay.minTempF}°F, Rain chance: ${weatherOnDay.precipitationProb}%.`,
                        });
                      }}
                      className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium bg-gray-100/90 dark:bg-gray-800/90 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-gray-700 dark:text-gray-300 transition-colors shadow-2xs truncate"
                      title={`${weatherOnDay.condition}: High ${weatherOnDay.maxTempF}°F / Low ${weatherOnDay.minTempF}°F. Rain: ${weatherOnDay.precipitationProb}%. Click to plan event.`}
                    >
                      <WeatherIcon type={weatherOnDay.iconType} className="w-3 h-3 shrink-0" />
                      <span className="text-[9px] font-semibold">{weatherOnDay.maxTempF}°</span>
                    </span>
                  )}
                </div>

                {/* Quick Add Plus on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(item.date);
                    openCreateEventModal({ startDate: item.dateString, endDate: item.dateString });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-opacity"
                  title="Add event on this date"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Event Chips */}
              <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                {displayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ev.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSelectedEventForPreview({ event: ev, rect });
                    }}
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium truncate flex items-center gap-1 shadow-2xs hover:brightness-95 active:opacity-70 transition-all cursor-pointer ${
                      ev.isCompleted ? 'opacity-50 line-through' : ''
                    }`}
                    style={{
                      backgroundColor: `${ev.color || '#1a73e8'}1e`,
                      color: ev.color || '#1a73e8',
                      borderLeft: `3px solid ${ev.color || '#1a73e8'}`,
                    }}
                    title={`${ev.title} (${ev.isAllDay ? 'All Day' : ev.startTime})`}
                  >
                    {!ev.isAllDay && (
                      <span className="font-normal text-[10px] opacity-80 flex-shrink-0">
                        {formatTime12h(ev.startTime).replace(' ', '')}
                      </span>
                    )}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}

                {extraCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDayOverflowModalDate(item.dateString);
                    }}
                    className="w-full text-left px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  >
                    +{extraCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Day Modal */}
      {dayOverflowModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                Events on{' '}
                {new Date(dayOverflowModalDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setDayOverflowModalDate(null)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {overflowEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setDayOverflowModalDate(null);
                    setSelectedEventForPreview({ event: ev });
                  }}
                  className="p-2 rounded-lg text-xs font-medium cursor-pointer hover:brightness-95 transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: `${ev.color || '#1a73e8'}15`,
                    color: ev.color || '#1a73e8',
                    borderLeft: `3px solid ${ev.color || '#1a73e8'}`,
                  }}
                >
                  <span className="truncate">{ev.title}</span>
                  <span className="text-[10px] opacity-75">
                    {ev.isAllDay ? 'All Day' : `${formatTime12h(ev.startTime)}`}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const date = dayOverflowModalDate;
                setDayOverflowModalDate(null);
                openCreateEventModal({ startDate: date, endDate: date });
              }}
              className="w-full py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium text-xs hover:bg-blue-100 transition-colors"
            >
              + Add Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
