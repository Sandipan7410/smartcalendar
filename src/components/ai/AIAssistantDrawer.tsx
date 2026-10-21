import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { AIMessage, CalendarEvent } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';
import { getWeatherContextSummary } from '../../services/weatherService';
import { runClientAssistantFallback } from '../../services/clientAssistant';
import { authedFetch } from '../../services/apiClient';

export const AIAssistantDrawer: React.FC = () => {
  const {
    isAIAssistantOpen,
    toggleAIAssistant,
    events,
    tasks,
    currentDate,
    addEvent,
    addTask,
    showToast,
    isGoogleConnected,
  } = useCalendar();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hi! I'm your **Smart Calendar AI** connected with Google Calendar.\n\nI can schedule meetings, check your Google Calendar for conflicts, suggest free slots, or summarize your day.\n\nTry asking:\n*\"Schedule SQL practice tomorrow from 8 PM to 9 PM\"*\nor click one of the quick prompts below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAIAssistantOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isAIAssistantOpen, messages]);

  const quickPrompts = [
    { label: '⚡ Summarize Today', prompt: "Summarize today's schedule and what I should focus on." },
    { label: '📅 Find Free Slot', prompt: 'Find free 1-hour slots today for deep work.' },
    { label: '🌤️ Weather Activity', prompt: 'Recommend the best day this week for an outdoor event based on the weather forecast.' },
    { label: '⚠️ Check Conflicts', prompt: 'Do I have any scheduling conflicts in my calendar?' },
    { label: '✨ Plan Tomorrow', prompt: 'Plan out a productive schedule for tomorrow.' },
    { label: '🎯 Prioritize Tasks', prompt: 'Analyze my tasks and tell me what is most urgent.' },
  ];

  // Execute confirmed proposed event
  const handleConfirmAddEvent = async (msgId: string, eventData: Partial<CalendarEvent>) => {
    try {
      const created = await addEvent(
        {
          title: eventData.title || 'Meeting',
          description: eventData.description || 'Scheduled via Smart Calendar AI',
          location: eventData.location || '',
          startDate: eventData.startDate || formatDateToISO(currentDate),
          startTime: eventData.startTime || '10:00',
          endDate: eventData.endDate || eventData.startDate || formatDateToISO(currentDate),
          endTime: eventData.endTime || '11:00',
          isAllDay: !!eventData.isAllDay,
          color: eventData.color || '#1a73e8',
          calendarId: eventData.calendarId || 'work',
          recurrence: 'none',
          reminderMinutes: 15,
        },
        { saveToGoogle: isGoogleConnected }
      );

      // Update message state
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, actionExecuted: true } : m))
      );

      showToast(
        'Added to Calendar',
        `"${created.title}" successfully scheduled ${isGoogleConnected ? 'in Google Calendar' : ''}.`,
        'success'
      );
    } catch (err: any) {
      showToast('Scheduling Error', err?.message || 'Failed to add event', 'warning');
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const lower = textToSend.toLowerCase();

    // Check if user is confirming a pending action from previous message
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === 'ai' && m.action);
    const isConfirmationReply =
      (lower === 'yes' ||
        lower === 'confirm' ||
        lower === 'add it' ||
        lower === 'sure' ||
        lower === 'please do' ||
        lower === 'ok' ||
        lower === 'okay') &&
      lastAiMsg &&
      lastAiMsg.action?.type === 'CREATE_EVENT' &&
      !lastAiMsg.actionExecuted &&
      lastAiMsg.action.event;

    if (isConfirmationReply && lastAiMsg && lastAiMsg.action?.event) {
      const userMsg: AIMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (!messageText) setInput('');

      await handleConfirmAddEvent(lastAiMsg.id, lastAiMsg.action.event);

      const confirmMsg: AIMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: `Confirmed! I've added **${lastAiMsg.action.event.title}** to your ${
          isGoogleConnected ? 'Google Calendar' : 'calendar'
        } for ${lastAiMsg.action.event.startDate} from ${lastAiMsg.action.event.startTime} to ${
          lastAiMsg.action.event.endTime
        }.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: true,
      };
      setMessages((prev) => [...prev, confirmMsg]);
      return;
    }

    const userMsg: AIMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      const now = new Date();
      const payload = {
        message: textToSend,
        currentDate: formatDateToISO(currentDate || now),
        currentTime: now.toTimeString().slice(0, 5),
        events,
        tasks,
        weather: getWeatherContextSummary(),
        history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
      };

      let data: any = null;

      try {
        // Gemini is only ever called from the server (/api), which holds the key.
        const res = await authedFetch('/api/gemini/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          data = await res.json();
        } else if (res.status === 401) {
          console.warn('Assistant requires sign-in; using the offline assistant instead.');
        }
      } catch (networkErr) {
        // Server not reachable (device offline, etc.)
      }

      // Final fallback: Intelligent local offline scheduler with cached weather
      if (!data) {
        data = runClientAssistantFallback(
          textToSend,
          formatDateToISO(currentDate || now),
          events,
          tasks,
          payload.weather
        );
        data.aiSource = 'offline';
      }

      // Be honest when Gemini didn't answer (busy, offline, or not signed in).
      if (data?.aiSource === 'offline' && typeof data.reply === 'string') {
        if (data.aiNote) console.warn('Gemini unavailable:', data.aiNote);
        data.reply += '\n\n_(Offline assistant: Gemini is unavailable right now, please try again shortly.)_';
      }

      let autoExecuted = false;

      // If action is CREATE_EVENT but requires confirmation, we do NOT auto-execute;
      // we let the user confirm via button or "yes"
      if (
        data.action &&
        data.action.type === 'CREATE_EVENT' &&
        !data.action.needsConfirmation &&
        data.action.event?.title
      ) {
        const ev = data.action.event;
        await addEvent(
          {
            title: ev.title,
            description: ev.description || 'Created by Smart Calendar AI',
            location: ev.location || '',
            startDate: ev.startDate || formatDateToISO(currentDate),
            startTime: ev.startTime || '10:00',
            endDate: ev.endDate || ev.startDate || formatDateToISO(currentDate),
            endTime: ev.endTime || '11:00',
            isAllDay: !!ev.isAllDay,
            color: ev.color || '#1a73e8',
            calendarId: ev.calendarId || 'work',
            recurrence: 'none',
            reminderMinutes: 15,
          },
          { saveToGoogle: isGoogleConnected }
        );
        autoExecuted = true;
      } else if (data.action && data.action.type === 'CREATE_TASK' && data.action.task?.title) {
        const t = data.action.task;
        addTask({
          title: t.title,
          notes: t.notes || 'Created by Smart Calendar AI',
          dueDate: t.dueDate || formatDateToISO(currentDate),
          dueTime: t.dueTime || '17:00',
          priority: t.priority || 'medium',
          calendarId: t.calendarId || 'work',
          isCompleted: false,
        });
        autoExecuted = true;
      }

      const aiMsg: AIMessage = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: data.reply || "I've processed your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: data.action,
        conflicts: data.conflicts,
        suggestedSlots: data.suggestedSlots,
        actionExecuted: autoExecuted,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: "I've reviewed your request. You can also view the 5-day weather forecast directly at the top of the Month View.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSuggestedSlot = async (slot: { date?: string; startTime: string; endTime: string }) => {
    const dateStr = slot.date || formatDateToISO(currentDate);
    await addEvent(
      {
        title: 'Focus / Reserved Slot',
        description: 'Scheduled via AI Assistant suggested slot',
        startDate: dateStr,
        startTime: slot.startTime,
        endDate: dateStr,
        endTime: slot.endTime,
        isAllDay: false,
        color: '#0b8043',
        calendarId: 'work',
        recurrence: 'none',
        reminderMinutes: 10,
      },
      { saveToGoogle: isGoogleConnected }
    );
  };

  if (!isAIAssistantOpen) return null;

  return (
    <aside className="w-full sm:w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-[calc(100vh-4rem)] z-30 shadow-xl sm:shadow-none transition-all select-none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/70 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              Smart Calendar AI
              {isGoogleConnected ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
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
                  Google Synced
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Gemini 3.8
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Personal Scheduling Agent</p>
          </div>
        </div>

        <button
          onClick={() => toggleAIAssistant(false)}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
          title="Close AI panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-xs mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className="max-w-[85%] space-y-2">
              <div
                className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Action Confirmation / Preview Card for Event Creation */}
              {msg.action && msg.action.type === 'CREATE_EVENT' && msg.action.event && (
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" /> Proposed Event
                    </span>
                    {msg.actionExecuted ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isGoogleConnected ? 'Added to Google Calendar' : 'Added to Calendar'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                        Pending Confirmation
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {msg.action.event.title}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {msg.action.event.startDate} • {msg.action.event.startTime} -{' '}
                        {msg.action.event.endTime}
                      </span>
                    </div>
                    {msg.action.event.location && (
                      <div className="text-gray-500 text-[11px] mt-0.5">
                        📍 {msg.action.event.location}
                      </div>
                    )}
                  </div>

                  {/* Confirmation Button if not yet added */}
                  {!msg.actionExecuted && (
                    <button
                      onClick={() => handleConfirmAddEvent(msg.id, msg.action!.event!)}
                      className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path
                          fill="#ffffff"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#ffffff"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#ffffff"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#ffffff"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>
                        {isGoogleConnected ? 'Confirm & Add to Google Calendar' : 'Confirm & Add Event'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Conflicts Warning */}
              {msg.conflicts && msg.conflicts.length > 0 && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Scheduling Conflict Detected:</span>
                  </div>
                  {msg.conflicts.map((c, idx) => (
                    <div key={idx} className="text-[11px] pl-2 border-l-2 border-amber-400">
                      • {c.eventTitle} ({c.overlapTime}): {c.warning}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Free Slots */}
              {msg.suggestedSlots && msg.suggestedSlots.length > 0 && (
                <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/30 text-xs space-y-2">
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    Available Free Slots:
                  </span>
                  <div className="space-y-1.5">
                    {msg.suggestedSlots.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {slot.startTime} – {slot.endTime} ({slot.duration})
                        </span>
                        <button
                          onClick={() => handleBookSuggestedSlot(slot)}
                          className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" /> Book Slot
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-xs mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 p-2">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center animate-spin">
              <RefreshCw className="w-3 h-3" />
            </div>
            <span>Checking calendar & conflicts...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar flex items-center gap-1.5 bg-gray-50/50 dark:bg-gray-900/50">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSend(qp.prompt)}
            className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors shadow-2xs whitespace-nowrap"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="E.g. Schedule SQL practice tomorrow from 8 PM to 9 PM..."
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-all shadow-md shadow-purple-500/20 active:scale-95"
            title="Send request"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
