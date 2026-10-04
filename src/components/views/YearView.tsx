import React from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getMonthDays, formatDateToISO, isSameDay } from '../../utils/dateUtils';

export const YearView: React.FC = () => {
  const {
    currentDate,
    setCurrentDate,
    setSelectedDate,
    setCurrentView,
    visibleEvents,
  } = useCalendar();

  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const weekLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Map of date strings that have events
  const eventDateSet = new Set(visibleEvents.map((e) => e.startDate));

  const handleDateClick = (d: Date) => {
    setSelectedDate(d);
    setCurrentDate(d);
    setCurrentView('day');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 select-none overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {year} Calendar Overview
        </h2>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {months.map((monthIndex) => {
            const firstDateOfMonth = new Date(year, monthIndex, 1);
            const monthName = firstDateOfMonth.toLocaleDateString('en-US', { month: 'long' });
            const days = getMonthDays(year, monthIndex);

            return (
              <div
                key={monthIndex}
                className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-2xs"
              >
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-2">
                  {monthName}
                </h3>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center mb-1 text-[10px] font-semibold text-gray-400">
                  {weekLetters.map((l, idx) => (
                    <div key={idx}>{l}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {days.map((item, dIdx) => {
                    const hasEvent = eventDateSet.has(item.dateString);
                    const isSelected = isSameDay(item.date, currentDate);

                    return (
                      <button
                        key={dIdx}
                        onClick={() => handleDateClick(item.date)}
                        className={`w-6 h-6 mx-auto flex flex-col items-center justify-center rounded-full text-[11px] font-medium transition-all relative ${
                          item.isToday
                            ? 'bg-blue-600 text-white font-bold'
                            : isSelected
                            ? 'ring-1 ring-blue-500 font-bold'
                            : item.isCurrentMonth
                            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'text-gray-300 dark:text-gray-700'
                        }`}
                        title={
                          hasEvent
                            ? `${item.dateString} (Has scheduled events)`
                            : item.dateString
                        }
                      >
                        <span>{item.dayNumber}</span>
                        {hasEvent && !item.isToday && (
                          <span className="w-1 h-1 rounded-full bg-blue-500 -mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
