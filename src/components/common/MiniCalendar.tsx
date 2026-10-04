import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthDays, formatDateToISO, isSameDay } from '../../utils/dateUtils';
import { useCalendar } from '../../context/CalendarContext';

export const MiniCalendar: React.FC = () => {
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate, setCurrentView } = useCalendar();
  const [navDate, setNavDate] = useState<Date>(new Date(currentDate));

  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const days = getMonthDays(year, month);

  const prevMonth = () => {
    setNavDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setNavDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (d: Date) => {
    setSelectedDate(d);
    setCurrentDate(d);
  };

  const monthName = navDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="p-3 select-none text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
          {monthName}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center mb-1 text-gray-400 font-medium text-[11px]">
        {weekLetters.map((letter, i) => (
          <div key={i} className="py-1">
            {letter}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((item, index) => {
          const isSelected = isSameDay(item.date, selectedDate);
          const isToday = item.isToday;

          return (
            <button
              key={index}
              onClick={() => handleSelectDay(item.date)}
              className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : isToday
                  ? 'border border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : item.isCurrentMonth
                  ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              {item.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
};
