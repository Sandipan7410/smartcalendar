import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setIsShortcutsOpen } = useCalendar();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'T', description: 'Jump to Today' },
    { key: 'M', description: 'Switch to Month view' },
    { key: 'W', description: 'Switch to Week view' },
    { key: 'D', description: 'Switch to Day view' },
    { key: 'Y', description: 'Switch to Year view' },
    { key: 'A', description: 'Switch to Agenda / Schedule view' },
    { key: 'C', description: 'Create new Event' },
    { key: '/', description: 'Open Search bar' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close modals / popups' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-gray-100 dark:divide-gray-700/60 max-h-96 overflow-y-auto">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">{sc.description}</span>
              <kbd className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-mono text-xs font-bold text-gray-800 dark:text-gray-200 shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
