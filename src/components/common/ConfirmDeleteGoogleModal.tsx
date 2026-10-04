import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

export const ConfirmDeleteGoogleModal: React.FC = () => {
  const { confirmDeleteModal, closeConfirmDeleteModal, confirmDeleteEvent, isSyncingGoogle } =
    useCalendar();

  if (!confirmDeleteModal.isOpen || !confirmDeleteModal.event) return null;

  const event = confirmDeleteModal.event;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Delete from Google Calendar?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This event is synced with your primary Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={closeConfirmDeleteModal}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">"{event.title}"</strong>?
          </p>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              📅 {event.startDate} {event.isAllDay ? '(All Day)' : `• ${event.startTime} - ${event.endTime}`}
            </div>
            {event.location && <div>📍 {event.location}</div>}
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ This will permanently remove the event from your Google Calendar and all synced devices.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeConfirmDeleteModal}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSyncingGoogle}
            onClick={confirmDeleteEvent}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSyncingGoogle ? 'Deleting...' : 'Delete Event'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
