import React, { useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { PageType } from './types';
import { Dashboard } from './views/Dashboard';
import { MatchHistory } from './views/MatchHistory';
import { AICoach } from './views/AICoach';
import { Settings } from './views/Settings';
import { DataProvider } from './context/DataContext';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  return (
    <DataProvider>
      <AppLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'match-history' && <MatchHistory />}
        {currentPage === 'ai-coach' && <AICoach />}
        {currentPage === 'settings' && <Settings />}
      </AppLayout>
    </DataProvider>
  );
}
