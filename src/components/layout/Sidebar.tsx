import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Calendar as CalendarIcon,
  CheckSquare,
  Download,
  Upload,
  ChevronDown,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { MiniCalendar } from '../common/MiniCalendar';

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    categories,
    toggleCategoryVisibility,
    openCreateEventModal,
    openCreateTaskModal,
    tasks,
    currentView,
    setCurrentView,
    exportICS,
    importICS,
    toggleAIAssistant,
    isGoogleConnected,
    googleUser,
    isSyncingGoogle,
    lastSyncedGoogleTime,
    syncGoogleCalendar,
    connectGoogleCalendar,
  } = useCalendar();

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) importICS(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const pendingTasksCount = tasks.filter((t) => !t.isCompleted).length;

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto select-none transition-all">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".ics,text/calendar"
        className="hidden"
      />

      {/* Google-style Create Button */}
      <div className="p-4 relative" ref={createMenuRef}>
        <button
          onClick={() => setCreateMenuOpen(!createMenuOpen)}
          className="group flex items-center gap-3 px-5 py-3 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95"
        >
          {/* Google Calendar 4-color plus icon */}
          <div className="w-6 h-6 flex items-center justify-center relative">
            <Plus className="w-6 h-6 text-blue-600 group-hover:rotate-90 transition-transform duration-200" />
          </div>
          <span className="font-medium text-sm text-gray-700 dark:text-gray-200">Create</span>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
        </button>

        {/* Dropdown menu */}
        {createMenuOpen && (
          <div className="absolute top-16 left-4 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-40 animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setCreateMenuOpen(false);
                openCreateEventModal();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
            >
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="font-medium">New Event</span>
            </button>
            <button
              onClick={() => {
                setCreateMenuOpen(false);
                openCreateTaskModal();
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-purple-600" />
              <span className="font-medium">New Task</span>
            </button>
          </div>
        )}
      </div>

      {/* Mini Calendar */}
      <MiniCalendar />

      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800/80">
        {/* Quick View Switches */}
        <div className="space-y-1 mb-4">
          <button
            onClick={() => setCurrentView('month')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              currentView !== 'agenda'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar Grid</span>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('agenda')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              currentView === 'agenda'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>Schedule / Agenda</span>
            </div>
          </button>
        </div>

        {/* My Calendars Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              My Calendars
            </span>
          </div>

          <div className="space-y-1.5">
            {/* Connected Google Calendar primary item */}
            {isGoogleConnected && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                  <span className="text-blue-900 dark:text-blue-200 text-xs font-semibold truncate">
                    Google Calendar
                  </span>
                </div>
                <button
                  onClick={() => syncGoogleCalendar()}
                  disabled={isSyncingGoogle}
                  className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 transition-colors"
                  title="Sync Google Calendar"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  checked={cat.visible}
                  onChange={() => toggleCategoryVisibility(cat.id)}
                  className="rounded text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                  style={{ accentColor: cat.color }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-gray-700 dark:text-gray-200 text-sm font-medium flex-1">
                  {cat.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tasks Quick Access */}
        <div className="mb-4 pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Tasks & To-Dos
            </span>
            {pendingTasksCount > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                {pendingTasksCount}
              </span>
            )}
          </div>
          <button
            onClick={() => openCreateTaskModal()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add a new task</span>
          </button>
        </div>

        {/* Calendar Import/Export */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
            Data & Sync
          </span>
          <div className="flex gap-2">
            <button
              onClick={exportICS}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Export all events to .ics file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Import .ics file from Google Calendar or Apple Calendar"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
