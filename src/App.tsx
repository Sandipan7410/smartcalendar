import React from 'react';
import { CalendarProvider, useCalendar } from './context/CalendarContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MonthView } from './components/views/MonthView';
import { WeekView } from './components/views/WeekView';
import { DayView } from './components/views/DayView';
import { YearView } from './components/views/YearView';
import { AgendaView } from './components/views/AgendaView';
import { TasksView } from './components/tasks/TasksView';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { EventModal } from './components/events/EventModal';
import { TaskModal } from './components/tasks/TaskModal';
import { EventDetailPopover } from './components/events/EventDetailPopover';
import { SearchModal } from './components/common/SearchModal';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { Toasts } from './components/common/Toasts';
import { MobileNav } from './components/layout/MobileNav';
import { ConfirmDeleteGoogleModal } from './components/common/ConfirmDeleteGoogleModal';

const CalendarMainContent: React.FC = () => {
  const { currentView, activeMobileTab } = useCalendar();

  if (activeMobileTab === 'tasks') {
    return <TasksView />;
  }

  switch (currentView) {
    case 'week':
      return <WeekView />;
    case 'day':
      return <DayView />;
    case 'year':
      return <YearView />;
    case 'agenda':
      return <AgendaView />;
    case 'month':
    default:
      return <MonthView />;
  }
};

const CalendarApp: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 md:pb-0">
          <CalendarMainContent />
        </main>
        <AIAssistantDrawer />
      </div>

      {/* Global Modals and Popovers */}
      <EventModal />
      <TaskModal />
      <EventDetailPopover />
      <SearchModal />
      <ShortcutsModal />
      <ConfirmDeleteGoogleModal />
      <Toasts />
      <MobileNav />
    </div>
  );
};

export default function App() {
  return (
    <CalendarProvider>
      <CalendarApp />
    </CalendarProvider>
  );
}
