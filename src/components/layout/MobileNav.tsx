import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  Sparkles,
  Plus,
  Layers,
  Search,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export const MobileNav: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    activeMobileTab,
    setActiveMobileTab,
    toggleAIAssistant,
    isAIAssistantOpen,
    openCreateEventModal,
    openCreateTaskModal,
    setIsSearchOpen,
    tasks,
  } = useCalendar();

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const pendingTasksCount = tasks.filter((t) => !t.isCompleted).length;

  return (
    <>
      {/* Floating Action Button (FAB) on Mobile */}
      <div className="md:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2.5">
        {/* Floating AI Bubble if assistant drawer is closed */}
        {!isAIAssistantOpen && (
          <button
            onClick={() => toggleAIAssistant(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-all ring-2 ring-purple-300/40"
            title="AI Assistant"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </button>
        )}

        {/* Create button */}
        <div className="relative">
          {createMenuOpen && (
            <div className="absolute bottom-16 right-0 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 space-y-1 animate-in slide-in-from-bottom-3">
              <button
                onClick={() => {
                  setCreateMenuOpen(false);
                  openCreateEventModal();
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
              >
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span>New Event</span>
              </button>
              <button
                onClick={() => {
                  setCreateMenuOpen(false);
                  openCreateTaskModal();
                }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5"
              >
                <CheckSquare className="w-4 h-4 text-purple-600" />
                <span>New Task</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 active:scale-95 transition-all"
            title="Create Event or Task"
          >
            <Plus className={`w-7 h-7 transition-transform ${createMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-30 flex items-center justify-around px-2 select-none">
        {/* Calendar Grid Tab */}
        <button
          onClick={() => {
            setActiveMobileTab('calendar');
            if (currentView === 'agenda') setCurrentView('month');
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            activeMobileTab === 'calendar' && currentView !== 'agenda'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span>Calendar</span>
        </button>

        {/* Schedule / Agenda Tab */}
        <button
          onClick={() => {
            setActiveMobileTab('calendar');
            setCurrentView('agenda');
          }}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            currentView === 'agenda' && activeMobileTab === 'calendar'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Schedule</span>
        </button>

        {/* Tasks Tab */}
        <button
          onClick={() => setActiveMobileTab('tasks')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors relative ${
            activeMobileTab === 'tasks'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-white dark:ring-gray-900" />
            )}
          </div>
          <span>Tasks</span>
        </button>

        {/* AI Assistant Tab */}
        <button
          onClick={() => toggleAIAssistant(true)}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            isAIAssistantOpen
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Assistant</span>
        </button>

        {/* Search */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400"
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
      </nav>
    </>
  );
};
