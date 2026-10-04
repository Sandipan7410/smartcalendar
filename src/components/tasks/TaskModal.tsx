import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Clock, Calendar as CalendarIcon, Flag, Tag, Trash2, AlignLeft } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { CalendarId, TaskPriority } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';

export const TaskModal: React.FC = () => {
  const {
    isTaskModalOpen,
    closeTaskModal,
    editingTask,
    addTask,
    updateTask,
    deleteTask,
    categories,
    selectedDate,
  } = useCalendar();

  const defaultDateStr = formatDateToISO(selectedDate || new Date());

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(defaultDateStr);
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [calendarId, setCalendarId] = useState<CalendarId>('work');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes || '');
      setDueDate(editingTask.dueDate || defaultDateStr);
      setDueTime(editingTask.dueTime || '17:00');
      setPriority(editingTask.priority || 'medium');
      setCalendarId(editingTask.calendarId || 'work');
    } else {
      setTitle('');
      setNotes('');
      setDueDate(defaultDateStr);
      setDueTime('17:00');
      setPriority('medium');
      setCalendarId('work');
    }
  }, [editingTask, isTaskModalOpen, defaultDateStr]);

  if (!isTaskModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask({
        ...editingTask,
        title: title.trim(),
        notes: notes.trim(),
        dueDate,
        dueTime,
        priority,
        calendarId,
      });
    } else {
      addTask({
        title: title.trim(),
        notes: notes.trim(),
        dueDate,
        dueTime,
        priority,
        calendarId,
        isCompleted: false,
      });
    }

    closeTaskModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {editingTask && (
              <button
                type="button"
                onClick={() => {
                  deleteTask(editingTask.id);
                  closeTaskModal();
                }}
                className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={closeTaskModal}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <input
              type="text"
              required
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-medium px-3 py-2 border-b-2 border-gray-200 dark:border-gray-700 focus:border-purple-600 dark:focus:border-purple-500 bg-transparent text-gray-900 dark:text-white outline-none transition-colors placeholder:text-gray-400"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Priority & Calendar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value as CalendarId)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Notes
            </label>
            <textarea
              rows={3}
              placeholder="Add details, links, or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow-md shadow-purple-500/20 transition-all active:scale-95"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
