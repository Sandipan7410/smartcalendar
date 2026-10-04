import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  Sparkles,
  Sun,
  Moon,
  Bell,
  HelpCircle,
  Download,
  Upload,
  CheckCircle2,
  RefreshCw,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { CalendarViewType } from '../../types/calendar';

export const Header: React.FC = () => {
  const {
    currentDate,
    currentView,
    setCurrentView,
    navigateToday,
    navigatePrev,
    navigateNext,
    toggleSidebar,
    toggleAIAssistant,
    isAIAssistantOpen,
    isDarkMode,
    toggleDarkMode,
    setIsSearchOpen,
    setIsShortcutsOpen,
    browserNotificationsAllowed,
    requestNotificationPermission,
    exportICS,
    importICS,
    showToast,
    googleUser,
    isGoogleConnected,
    isSyncingGoogle,
    lastSyncedGoogleTime,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleCalendar,
  } = useCalendar();

  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [googleMenuOpen, setGoogleMenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const googleMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (googleMenuRef.current && !googleMenuRef.current.contains(e.target as Node)) {
        setGoogleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format header date label
  const getDateLabel = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleDateString('en-US', { month: 'long' });

    if (currentView === 'year') {
      return `${year}`;
    }
    if (currentView === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (currentView === 'week') {
      // Show week range
      const dayOfWeek = currentDate.getDay();
      const sun = new Date(currentDate);
      sun.setDate(currentDate.getDate() - dayOfWeek);
      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);

      const m1 = sun.toLocaleDateString('en-US', { month: 'short' });
      const m2 = sat.toLocaleDateString('en-US', { month: 'short' });
      if (m1 === m2) {
        return `${m1} ${sun.getDate()} – ${sat.getDate()}, ${year}`;
      }
      return `${m1} ${sun.getDate()} – ${m2} ${sat.getDate()}, ${year}`;
    }

    return `${month} ${year}`;
  };

  const views: { id: CalendarViewType; label: string; shortcut: string }[] = [
    { id: 'day', label: 'Day', shortcut: 'D' },
    { id: 'week', label: 'Week', shortcut: 'W' },
    { id: 'month', label: 'Month', shortcut: 'M' },
    { id: 'year', label: 'Year', shortcut: 'Y' },
    { id: 'agenda', label: 'Schedule', shortcut: 'A' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importICS(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-16 px-3 sm:px-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-30 select-none transition-colors">
      {/* Hidden file input for ICS import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".ics,text/calendar"
        className="hidden"
      />

      {/* Left section: Hamburger, Logo, Title */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold">
            <span className="text-base tracking-tighter">31</span>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-semibold text-gray-900 dark:text-white text-base leading-tight flex items-center gap-1.5">
              Smart Calendar
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-extrabold text-xs px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40">
                AI
              </span>
            </span>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-1 ml-1 sm:ml-4">
          <button
            onClick={navigateToday}
            className="px-3.5 py-1.5 text-sm font-medium rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
            title="Jump to today (Shortcut: T)"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={navigatePrev}
              aria-label="Previous"
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={navigateNext}
              aria-label="Next"
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-100 ml-1 sm:ml-2 whitespace-nowrap">
            {getDateLabel()}
          </h2>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Search button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-sm transition-all focus:outline-none"
          title="Search events and tasks (Ctrl+K or /)"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">Search</span>
          <kbd className="hidden lg:inline text-[10px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-500">
            /
          </kbd>
        </button>

        {/* Google Calendar Integration Controls */}
        {isGoogleConnected ? (
          <div className="flex items-center gap-1.5" ref={googleMenuRef}>
            {/* Sync Now button */}
            <button
              onClick={() => syncGoogleCalendar()}
              disabled={isSyncingGoogle}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors shadow-2xs"
              title={
                lastSyncedGoogleTime
                  ? `Last synced: ${lastSyncedGoogleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Sync with Google Calendar'
              }
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-600 ${isSyncingGoogle ? 'animate-spin' : ''}`}
              />
              <span className="hidden lg:inline">
                {isSyncingGoogle ? 'Syncing...' : 'Sync Now'}
              </span>
            </button>

            {/* Google Account Profile Button */}
            <div className="relative">
              <button
                onClick={() => setGoogleMenuOpen(!googleMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 text-xs transition-colors"
                title={`Connected as ${googleUser?.email || 'Google User'}`}
              >
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt="Google Account"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(googleUser?.displayName || googleUser?.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline font-medium text-blue-700 dark:text-blue-300 max-w-[100px] truncate">
                  {googleUser?.displayName || googleUser?.email}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              {/* Account Dropdown */}
              {googleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                    {googleUser?.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {(googleUser?.displayName || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {googleUser?.displayName || 'Google Calendar User'}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {googleUser?.email}
                      </p>
                    </div>
                  </div>

                  <div className="py-2 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    </div>
                    {lastSyncedGoogleTime && (
                      <div className="flex items-center justify-between">
                        <span>Last sync:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {lastSyncedGoogleTime.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                    <button
                      onClick={() => {
                        setGoogleMenuOpen(false);
                        syncGoogleCalendar();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sync Calendar Now</span>
                    </button>
                    <button
                      onClick={() => {
                        setGoogleMenuOpen(false);
                        disconnectGoogleCalendar();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect Google Calendar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => connectGoogleCalendar()}
            disabled={isSyncingGoogle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-xs hover:shadow transition-all active:scale-95"
            title="Connect Google Calendar to sync your primary events"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span className="hidden sm:inline">
              {isSyncingGoogle ? 'Connecting...' : 'Connect Google Calendar'}
            </span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}

        {/* View Switcher Dropdown */}
        <div className="relative" ref={viewDropdownRef}>
          <button
            onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span>{views.find((v) => v.id === currentView)?.label}</span>
            <span className="text-xs text-gray-400">▼</span>
          </button>

          {viewDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {views.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setCurrentView(v.id);
                    setViewDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    currentView === v.id
                      ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <span>{v.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{v.shortcut}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Assistant Button (highlighted) */}
        <button
          onClick={() => toggleAIAssistant()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm active:scale-95 ${
            isAIAssistantOpen
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-blue-500/25 ring-2 ring-purple-400/50'
              : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 border border-blue-200/80 dark:border-purple-800/40 text-blue-700 dark:text-purple-300 hover:shadow-md'
          }`}
          title="Open AI Scheduling Assistant"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Notifications */}
        <button
          onClick={async () => {
            if (!browserNotificationsAllowed) {
              await requestNotificationPermission();
            } else {
              showToast('Notifications Active', 'Browser notifications are already enabled.', 'info');
            }
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors relative"
          title={
            browserNotificationsAllowed
              ? 'Event notifications enabled'
              : 'Enable browser notifications for reminders'
          }
        >
          <Bell className="w-5 h-5" />
          {browserNotificationsAllowed && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
          )}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Shortcuts / Help */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
