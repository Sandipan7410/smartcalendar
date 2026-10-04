import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  CalendarPlus,
  Filter,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { CalendarTask, TaskPriority } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';

export const TasksView: React.FC = () => {
  const {
    tasks,
    toggleTaskCompleted,
    deleteTask,
    openEditTaskModal,
    openCreateTaskModal,
    convertTaskToEvent,
    categories,
  } = useCalendar();

  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const todayStr = formatDateToISO(new Date());

  const isOverdue = (task: CalendarTask) => {
    if (task.isCompleted || !task.dueDate) return false;
    return task.dueDate < todayStr;
  };

  const isDueToday = (task: CalendarTask) => {
    if (!task.dueDate) return false;
    return task.dueDate === todayStr;
  };

  const filteredTasks = tasks.filter((task) => {
    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    if (filter === 'completed') return task.isCompleted;
    if (filter === 'overdue') return isOverdue(task);
    if (filter === 'today') return isDueToday(task) && !task.isCompleted;
    if (filter === 'upcoming') return !task.isCompleted && task.dueDate && task.dueDate > todayStr;
    if (filter === 'all') return true;
    return true;
  });

  const overdueCount = tasks.filter(isOverdue).length;
  const todayCount = tasks.filter((t) => isDueToday(t) && !t.isCompleted).length;
  const completedCount = tasks.filter((t) => t.isCompleted).length;

  const getPriorityBadge = (p: TaskPriority) => {
    if (p === 'high') {
      return (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
          High
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
          Medium
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
        Low
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/50 overflow-y-auto p-4 sm:p-8 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-purple-600" />
              Task Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Organize your priorities, deadlines, and schedule them on your calendar.
            </p>
          </div>

          <button
            onClick={() => openCreateTaskModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm shadow-md shadow-purple-500/25 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'today'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Today
              {todayCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {todayCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filter === 'overdue'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Overdue
              {overdueCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Priority dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/60">
              <CheckCircle2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                No tasks found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filter === 'completed'
                  ? 'No completed tasks yet. Finish a task to celebrate!'
                  : 'You have caught up with all tasks in this view.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const overdue = isOverdue(task);
              const category = categories.find((c) => c.id === task.calendarId);

              return (
                <div
                  key={task.id}
                  className={`group p-4 rounded-xl border bg-white dark:bg-gray-800 transition-all shadow-xs hover:shadow-md flex items-start gap-3.5 ${
                    task.isCompleted
                      ? 'border-gray-200 dark:border-gray-800 opacity-60 bg-gray-50/50 dark:bg-gray-900/30'
                      : overdue
                      ? 'border-red-300 dark:border-red-900/70 bg-red-50/20 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-800'
                  }`}
                >
                  {/* Complete checkbox */}
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 transition-colors" />
                    )}
                  </button>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-base font-semibold text-gray-900 dark:text-white transition-all ${
                          task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''
                        }`}
                      >
                        {task.title}
                      </h4>
                      {getPriorityBadge(task.priority)}
                      {overdue && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                      {category && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor: `${category.color}15`,
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                        {task.notes}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {task.dueDate && (
                        <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {task.dueDate} {task.dueTime ? `at ${task.dueTime}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!task.isCompleted && (
                      <button
                        onClick={() => convertTaskToEvent(task)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 transition-colors"
                        title="Schedule on Calendar"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditTaskModal(task)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
